/**
 * Monitor Agent
 * Collects quiz scores, tracks learning activity, monitors time spent,
 * and detects abnormal performance drops. Triggers alerts when needed.
 */

const { query } = require('../db/pool');
const { writeAuditLog } = require('../middleware/auditLogger');
const { createLedgerEntry } = require('../services/ledger');

const AGENT_NAME = 'monitor_agent';
const PERFORMANCE_DROP_THRESHOLD = 15; // percentage points drop triggers alert
const LOW_SCORE_THRESHOLD = 50;        // scores below this are flagged
const RISK_HIGH_THRESHOLD = 70;        // risk score above this = high risk

/**
 * Analyze a student's recent performance and detect anomalies
 * @param {string} studentId
 * @returns {Object} Analysis result with alerts
 */
const analyzeStudentPerformance = async (studentId) => {
  // Get recent assessments (last 30 days)
  const { rows: recentAssessments } = await query(
    `SELECT * FROM assessments 
     WHERE student_id = $1 AND taken_at > NOW() - INTERVAL '30 days'
     ORDER BY taken_at DESC`,
    [studentId]
  );

  // Get all assessments for trend analysis
  const { rows: allAssessments } = await query(
    `SELECT subject, AVG(score) as avg_score, COUNT(*) as count,
            MIN(taken_at) as first_taken, MAX(taken_at) as last_taken
     FROM assessments WHERE student_id = $1
     GROUP BY subject`,
    [studentId]
  );

  const alerts = [];
  const subjectAnalysis = {};

  // Analyze per-subject trends
  for (const subjectData of allAssessments) {
    const { rows: subjectAssessments } = await query(
      `SELECT score, taken_at FROM assessments 
       WHERE student_id = $1 AND subject = $2
       ORDER BY taken_at ASC`,
      [studentId, subjectData.subject]
    );

    if (subjectAssessments.length >= 2) {
      const recent = subjectAssessments.slice(-3);
      const older = subjectAssessments.slice(0, -3);

      const recentAvg = recent.reduce((s, a) => s + parseFloat(a.score), 0) / recent.length;
      const olderAvg = older.length > 0
        ? older.reduce((s, a) => s + parseFloat(a.score), 0) / older.length
        : recentAvg;

      const drop = olderAvg - recentAvg;

      subjectAnalysis[subjectData.subject] = {
        recentAvg: Math.round(recentAvg * 10) / 10,
        olderAvg: Math.round(olderAvg * 10) / 10,
        trend: drop > 5 ? 'declining' : drop < -5 ? 'improving' : 'stable',
        assessmentCount: subjectAssessments.length,
      };

      // Detect performance drop
      if (drop >= PERFORMANCE_DROP_THRESHOLD) {
        alerts.push({
          type: 'performance_drop',
          severity: drop >= 25 ? 'critical' : drop >= 20 ? 'high' : 'medium',
          subject: subjectData.subject,
          message: `Performance dropped by ${Math.round(drop)}% in ${subjectData.subject}`,
          data: { drop, recentAvg, olderAvg },
        });
      }

      // Detect consistently low scores
      if (recentAvg < LOW_SCORE_THRESHOLD) {
        alerts.push({
          type: 'low_performance',
          severity: recentAvg < 30 ? 'critical' : recentAvg < 40 ? 'high' : 'medium',
          subject: subjectData.subject,
          message: `Consistently low scores in ${subjectData.subject} (avg: ${Math.round(recentAvg)}%)`,
          data: { recentAvg },
        });
      }
    }
  }

  // Calculate overall risk score
  const riskScore = calculateRiskScore(recentAssessments, alerts);

  // Update student risk score
  await query(
    'UPDATE students SET risk_score = $1, updated_at = NOW() WHERE id = $2',
    [riskScore, studentId]
  );

  // Log monitoring action
  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'performance_analyzed',
    targetId: studentId,
    targetType: 'student',
    details: { alertCount: alerts.length, riskScore, subjectCount: allAssessments.length },
  });

  // Create notifications for high-severity alerts
  if (alerts.some(a => a.severity === 'critical' || a.severity === 'high')) {
    await createAlertNotifications(studentId, alerts);
  }

  return {
    studentId,
    riskScore,
    alerts,
    subjectAnalysis,
    recentAssessmentCount: recentAssessments.length,
    analyzedAt: new Date().toISOString(),
  };
};

/**
 * Calculate a risk score (0-100) based on performance data
 */
const calculateRiskScore = (recentAssessments, alerts) => {
  if (recentAssessments.length === 0) return 0;

  let score = 0;

  // Base score from recent average
  const avgScore = recentAssessments.reduce((s, a) => s + parseFloat(a.score), 0) / recentAssessments.length;
  if (avgScore < 40) score += 40;
  else if (avgScore < 60) score += 25;
  else if (avgScore < 75) score += 10;

  // Add points for alerts
  for (const alert of alerts) {
    if (alert.severity === 'critical') score += 20;
    else if (alert.severity === 'high') score += 15;
    else if (alert.severity === 'medium') score += 8;
    else score += 3;
  }

  return Math.min(100, Math.round(score));
};

/**
 * Create notifications for teachers when alerts are triggered
 */
const createAlertNotifications = async (studentId, alerts) => {
  try {
    // Get student info
    const { rows: studentRows } = await query(
      `SELECT s.id, u.name as student_name, lp.teacher_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN learning_plans lp ON lp.student_id = s.id AND lp.status = 'active'
       WHERE s.id = $1
       LIMIT 1`,
      [studentId]
    );

    if (!studentRows.length) return;

    const student = studentRows[0];
    const highAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');

    // Notify assigned teacher
    if (student.teacher_id) {
      for (const alert of highAlerts) {
        await query(
          `INSERT INTO notifications (user_id, title, message, type, link)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            student.teacher_id,
            `⚠️ Alert: ${student.student_name}`,
            alert.message,
            'warning',
            `/teacher/students/${studentId}`,
          ]
        );
      }
    }

    // Log alert creation
    await writeAuditLog({
      agent: AGENT_NAME,
      action: 'alert_triggered',
      targetId: studentId,
      targetType: 'student',
      details: { alertCount: highAlerts.length, alerts: highAlerts },
    });
  } catch (err) {
    console.error('[MonitorAgent] Failed to create notifications:', err.message);
  }
};

/**
 * Track a learning activity event
 * @param {string} studentId
 * @param {Object} activity - { type, subject, duration, metadata }
 */
const trackActivity = async (studentId, activity) => {
  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'activity_tracked',
    targetId: studentId,
    targetType: 'student',
    details: activity,
  });
  return { tracked: true, timestamp: new Date().toISOString() };
};

/**
 * Run monitoring for all active students (batch job)
 */
const runBatchMonitoring = async () => {
  const { rows: students } = await query(
    `SELECT s.id FROM students s
     JOIN users u ON s.user_id = u.id
     WHERE u.is_active = TRUE`
  );

  console.log(`[MonitorAgent] Running batch monitoring for ${students.length} students`);
  const results = [];

  for (const student of students) {
    try {
      const result = await analyzeStudentPerformance(student.id);
      results.push({ studentId: student.id, success: true, riskScore: result.riskScore });
    } catch (err) {
      results.push({ studentId: student.id, success: false, error: err.message });
    }
  }

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'batch_monitoring_completed',
    details: { studentCount: students.length, results },
  });

  return results;
};

module.exports = { analyzeStudentPerformance, trackActivity, runBatchMonitoring };
