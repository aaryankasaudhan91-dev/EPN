/**
 * Curriculum Planner Agent
 * Creates adaptive learning paths, recommends remedial/enrichment content,
 * and requires teacher approval for major curriculum changes.
 */

const { query } = require('../db/pool');
const { writeAuditLog } = require('../middleware/auditLogger');
const { identifyWeakAreas } = require('./diagnosticAgent');
const { createLedgerEntry } = require('../services/ledger');

const AGENT_NAME = 'curriculum_planner_agent';

// Threshold for requiring teacher approval (major change)
const MAJOR_CHANGE_THRESHOLD = 3; // more than 3 new topics = major change

/**
 * Generate an adaptive learning plan for a student
 * @param {string} studentId
 * @param {Object} options - { teacherId, forceApproval }
 * @returns {Object} Created learning plan
 */
const generateLearningPlan = async (studentId, options = {}) => {
  const { teacherId = null, forceApproval = false } = options;

  // Get student info
  const { rows: studentRows } = await query(
    `SELECT s.*, u.name, u.email FROM students s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = $1`,
    [studentId]
  );

  if (!studentRows.length) throw new Error('Student not found');
  const student = studentRows[0];

  // Identify weak areas
  const weakAreas = await identifyWeakAreas(studentId);

  // Get recent assessments for context
  const { rows: recentAssessments } = await query(
    `SELECT subject, AVG(score) as avg_score
     FROM assessments WHERE student_id = $1
     AND taken_at > NOW() - INTERVAL '30 days'
     GROUP BY subject`,
    [studentId]
  );

  // Build adaptive tasks
  const tasks = buildAdaptiveTasks(weakAreas, recentAssessments, student);

  // Determine if teacher approval is required
  const requiresApproval = forceApproval || tasks.length > MAJOR_CHANGE_THRESHOLD;
  const approvalStatus = requiresApproval ? 'pending' : 'approved';
  const planStatus = requiresApproval ? 'pending_approval' : 'active';

  // Create the learning plan
  const { rows: planRows } = await query(
    `INSERT INTO learning_plans 
      (student_id, teacher_id, title, description, tasks, status, approval_status, ai_generated, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days')
     RETURNING *`,
    [
      studentId,
      teacherId,
      `Adaptive Learning Plan - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      `AI-generated personalized learning plan based on performance analysis. ${weakAreas.length} weak areas identified.`,
      JSON.stringify(tasks),
      planStatus,
      approvalStatus,
    ]
  );

  const plan = planRows[0];

  // Notify teacher if approval required
  if (requiresApproval && teacherId) {
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        teacherId,
        '📋 New Learning Plan Awaiting Approval',
        `A new adaptive learning plan for ${student.name} requires your review.`,
        'info',
        `/teacher/approvals/${plan.id}`,
      ]
    );
  }

  // Create ledger entry for the plan
  await createLedgerEntry({
    recordType: 'learning_plan_created',
    referenceId: plan.id,
    metadata: { studentId, taskCount: tasks.length, requiresApproval },
  });

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'plan_created',
    targetId: plan.id,
    targetType: 'learning_plan',
    details: {
      studentId,
      taskCount: tasks.length,
      requiresApproval,
      weakAreaCount: weakAreas.length,
    },
  });

  return { plan, tasks, requiresApproval, weakAreas };
};

/**
 * Build adaptive learning tasks based on weak areas and performance
 */
const buildAdaptiveTasks = (weakAreas, recentAssessments, student) => {
  const tasks = [];
  const grade = student.grade;

  // Remedial tasks for weak areas (highest priority)
  for (const area of weakAreas.slice(0, 5)) {
    tasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'remedial',
      subject: area.subject,
      concept: area.concept,
      title: `Remedial: ${area.concept}`,
      description: `Strengthen understanding of ${area.concept} in ${area.subject}`,
      priority: area.priority,
      estimatedDuration: 45, // minutes
      resources: [
        { type: 'explanation', title: `${area.concept} Explained` },
        { type: 'worksheet', title: `${area.concept} Practice` },
        { type: 'quiz', title: `${area.concept} Assessment` },
      ],
      masteryTarget: 70,
      currentMastery: area.masteryLevel,
      status: 'pending',
    });
  }

  // Enrichment tasks for strong subjects
  const strongSubjects = recentAssessments
    .filter(a => parseFloat(a.avg_score) >= 80)
    .slice(0, 2);

  for (const subject of strongSubjects) {
    tasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'enrichment',
      subject: subject.subject,
      concept: 'Advanced Topics',
      title: `Enrichment: Advanced ${subject.subject}`,
      description: `Challenge yourself with advanced ${subject.subject} concepts`,
      priority: 'low',
      estimatedDuration: 30,
      resources: [
        { type: 'quiz', title: `Advanced ${subject.subject} Challenge` },
      ],
      masteryTarget: 90,
      currentMastery: parseFloat(subject.avg_score),
      status: 'pending',
    });
  }

  // Add a general review task
  tasks.push({
    id: `task_${Date.now()}_review`,
    type: 'review',
    subject: 'General',
    concept: 'Weekly Review',
    title: 'Weekly Progress Review',
    description: 'Review all topics covered this week and identify areas for improvement',
    priority: 'medium',
    estimatedDuration: 20,
    resources: [{ type: 'revision_notes', title: 'Weekly Summary' }],
    status: 'pending',
  });

  return tasks;
};

/**
 * Approve a learning plan (teacher action)
 * @param {string} planId
 * @param {string} teacherId
 * @param {string} [notes]
 */
const approveLearningPlan = async (planId, teacherId, notes = '') => {
  const { rows } = await query(
    `UPDATE learning_plans 
     SET approval_status = 'approved', status = 'active',
         approved_by = $2, approved_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [planId, teacherId]
  );

  if (!rows.length) throw new Error('Learning plan not found');

  // Create ledger entry for approval
  await createLedgerEntry({
    recordType: 'plan_approved',
    referenceId: planId,
    metadata: { teacherId, notes },
  });

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'plan_approved',
    actorId: teacherId,
    targetId: planId,
    targetType: 'learning_plan',
    details: { notes },
  });

  return rows[0];
};

/**
 * Reject a learning plan (teacher action)
 * @param {string} planId
 * @param {string} teacherId
 * @param {string} reason
 */
const rejectLearningPlan = async (planId, teacherId, reason) => {
  const { rows } = await query(
    `UPDATE learning_plans 
     SET approval_status = 'rejected', status = 'paused',
         approved_by = $2, approved_at = NOW(),
         rejection_reason = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [planId, teacherId, reason]
  );

  if (!rows.length) throw new Error('Learning plan not found');

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'plan_rejected',
    actorId: teacherId,
    targetId: planId,
    targetType: 'learning_plan',
    details: { reason },
  });

  return rows[0];
};

module.exports = {
  generateLearningPlan,
  approveLearningPlan,
  rejectLearningPlan,
};
