/**
 * Orchestrator Agent
 * Manages workflow between all agents, enforces generation limits,
 * routes approval requests, and triggers alerts.
 * Acts as the central coordinator for the EPN AI system.
 */

const { query } = require('../db/pool');
const { writeAuditLog } = require('../middleware/auditLogger');
const { analyzeStudentPerformance } = require('./monitorAgent');
const { updateKnowledgeGraph, identifyWeakAreas } = require('./diagnosticAgent');
const { generateLearningPlan } = require('./curriculumPlannerAgent');
const { generateStudentContent } = require('./contentGenerationAgent');

const AGENT_NAME = 'orchestrator_agent';

// Circuit breaker state (in-memory for MVP; use Redis in production)
const circuitBreaker = {
  failures: {},
  threshold: 5,
  resetTimeout: 60000, // 1 minute
};

/**
 * Check circuit breaker for an agent
 */
const checkCircuitBreaker = (agentName) => {
  const failures = circuitBreaker.failures[agentName] || { count: 0, lastFailure: null };
  if (failures.count >= circuitBreaker.threshold) {
    const timeSinceLastFailure = Date.now() - failures.lastFailure;
    if (timeSinceLastFailure < circuitBreaker.resetTimeout) {
      return false; // Circuit open - block execution
    }
    // Reset after timeout
    circuitBreaker.failures[agentName] = { count: 0, lastFailure: null };
  }
  return true; // Circuit closed - allow execution
};

/**
 * Record a failure for circuit breaker
 */
const recordFailure = (agentName) => {
  if (!circuitBreaker.failures[agentName]) {
    circuitBreaker.failures[agentName] = { count: 0, lastFailure: null };
  }
  circuitBreaker.failures[agentName].count++;
  circuitBreaker.failures[agentName].lastFailure = Date.now();
};

/**
 * Full pipeline: Process a new assessment submission
 * Triggers: Monitor → Diagnostic → (optionally) Curriculum Planner
 * @param {Object} params
 * @param {string} params.studentId
 * @param {Object} params.assessment - { subject, topic, score, metadata }
 * @param {string} [params.teacherId]
 */
const processAssessmentSubmission = async ({ studentId, assessment, teacherId = null }) => {
  const results = { steps: [], errors: [] };

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'pipeline_started',
    targetId: studentId,
    targetType: 'student',
    details: { trigger: 'assessment_submission', assessment },
  });

  // Step 1: Monitor Agent - Analyze performance
  if (checkCircuitBreaker('monitor_agent')) {
    try {
      const monitorResult = await analyzeStudentPerformance(studentId);
      results.steps.push({ agent: 'monitor', success: true, data: monitorResult });

      // Step 2: Diagnostic Agent - Update knowledge graph
      if (checkCircuitBreaker('diagnostic_agent')) {
        try {
          const diagnosticResult = await updateKnowledgeGraph(studentId, assessment);
          results.steps.push({ agent: 'diagnostic', success: true, data: diagnosticResult });

          // Step 3: Curriculum Planner - Generate plan if risk is high
          if (monitorResult.riskScore >= 60 && checkCircuitBreaker('curriculum_planner_agent')) {
            try {
              const planResult = await generateLearningPlan(studentId, { teacherId });
              results.steps.push({ agent: 'curriculum_planner', success: true, data: planResult });

              // Step 4: Content Generation - Generate remedial content for weak areas
              const weakAreas = await identifyWeakAreas(studentId);
              if (weakAreas.length > 0 && checkCircuitBreaker('content_generation_agent')) {
                const topWeakArea = weakAreas[0];
                try {
                  const contentResult = await generateStudentContent({
                    studentId,
                    contentType: 'explanation',
                    subject: topWeakArea.subject,
                    topic: topWeakArea.concept,
                    teacherId,
                  });
                  results.steps.push({ agent: 'content_generation', success: true, data: { id: contentResult.id } });
                } catch (err) {
                  recordFailure('content_generation_agent');
                  results.errors.push({ agent: 'content_generation', error: err.message });
                }
              }
            } catch (err) {
              recordFailure('curriculum_planner_agent');
              results.errors.push({ agent: 'curriculum_planner', error: err.message });
            }
          }
        } catch (err) {
          recordFailure('diagnostic_agent');
          results.errors.push({ agent: 'diagnostic', error: err.message });
        }
      }
    } catch (err) {
      recordFailure('monitor_agent');
      results.errors.push({ agent: 'monitor', error: err.message });
    }
  } else {
    results.errors.push({ agent: 'monitor', error: 'Circuit breaker open - too many failures' });
  }

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'pipeline_completed',
    targetId: studentId,
    targetType: 'student',
    details: {
      stepsCompleted: results.steps.length,
      errors: results.errors.length,
    },
  });

  return results;
};

/**
 * Get pending approvals for a teacher
 * @param {string} teacherId
 */
const getPendingApprovals = async (teacherId) => {
  const [plansResult, contentResult] = await Promise.all([
    query(
      `SELECT lp.*, u.name as student_name, s.grade
       FROM learning_plans lp
       JOIN students s ON lp.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE lp.approval_status = 'pending'
       AND s.learning_profile->>'assignedTeacherId' = $1
       ORDER BY lp.created_at DESC`,
      [teacherId]
    ),
    query(
      `SELECT gc.*, u.name as student_name, s.grade
       FROM generated_content gc
       JOIN students s ON gc.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE gc.approval_status = 'pending'
       AND s.learning_profile->>'assignedTeacherId' = $1
       ORDER BY gc.created_at DESC`,
      [teacherId]
    ),
  ]);

  return {
    learningPlans: plansResult.rows,
    generatedContent: contentResult.rows,
    totalPending: plansResult.rows.length + contentResult.rows.length,
  };
};

/**
 * Get system health status
 */
const getSystemHealth = () => {
  const agents = ['monitor_agent', 'diagnostic_agent', 'curriculum_planner_agent', 'content_generation_agent'];
  const health = {};

  for (const agent of agents) {
    const failures = circuitBreaker.failures[agent] || { count: 0 };
    health[agent] = {
      status: failures.count >= circuitBreaker.threshold ? 'circuit_open' : 'healthy',
      failureCount: failures.count,
    };
  }

  return { agents: health, timestamp: new Date().toISOString() };
};

module.exports = {
  processAssessmentSubmission,
  getPendingApprovals,
  getSystemHealth,
};
