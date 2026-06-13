/**
 * Diagnostic Agent
 * Maintains student knowledge graphs, detects misconceptions,
 * and identifies root causes of learning difficulties.
 */

const { query } = require('../db/pool');
const { writeAuditLog } = require('../middleware/auditLogger');

const AGENT_NAME = 'diagnostic_agent';

// Mastery level thresholds
const MASTERY_LEVELS = {
  NOVICE: 0,
  DEVELOPING: 25,
  APPROACHING: 50,
  PROFICIENT: 75,
  MASTERED: 90,
};

/**
 * Update the knowledge graph for a student based on assessment results
 * @param {string} studentId
 * @param {Object} assessment - { subject, topic, score, metadata }
 */
const updateKnowledgeGraph = async (studentId, assessment) => {
  const { subject, topic, score, metadata = {} } = assessment;

  // Check if concept exists in knowledge graph
  const { rows: existing } = await query(
    'SELECT * FROM knowledge_graph WHERE student_id = $1 AND subject = $2 AND concept = $3',
    [studentId, subject, topic]
  );

  let masteryLevel;
  let misconceptions = [];
  let rootCauses = [];

  if (existing.length > 0) {
    const current = existing[0];
    // Weighted average: 70% existing, 30% new score
    masteryLevel = current.mastery_level * 0.7 + score * 0.3;
    misconceptions = current.misconceptions || [];
    rootCauses = current.root_causes || [];
  } else {
    masteryLevel = score;
  }

  // Detect misconceptions from metadata
  if (metadata.wrongAnswers) {
    const newMisconceptions = detectMisconceptions(metadata.wrongAnswers, subject, topic);
    misconceptions = [...new Set([...misconceptions, ...newMisconceptions])];
  }

  // Identify root causes
  rootCauses = identifyRootCauses(masteryLevel, metadata);

  // Upsert knowledge graph entry
  await query(
    `INSERT INTO knowledge_graph 
      (student_id, subject, concept, mastery_level, misconceptions, root_causes, last_assessed)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (student_id, subject, concept)
     DO UPDATE SET 
       mastery_level = $4,
       misconceptions = $5,
       root_causes = $6,
       last_assessed = NOW(),
       updated_at = NOW()`,
    [studentId, subject, topic, masteryLevel, JSON.stringify(misconceptions), JSON.stringify(rootCauses)]
  );

  // Update overall mastery score on student record
  await updateOverallMastery(studentId);

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'knowledge_graph_updated',
    targetId: studentId,
    targetType: 'student',
    details: { subject, topic, masteryLevel: Math.round(masteryLevel), rootCauses },
  });

  return {
    subject,
    concept: topic,
    masteryLevel: Math.round(masteryLevel * 10) / 10,
    masteryLabel: getMasteryLabel(masteryLevel),
    misconceptions,
    rootCauses,
  };
};

/**
 * Detect misconceptions from wrong answer patterns
 */
const detectMisconceptions = (wrongAnswers, subject, topic) => {
  const misconceptions = [];

  // Pattern-based misconception detection
  if (wrongAnswers.includes('sign_error')) {
    misconceptions.push('Negative number sign errors');
  }
  if (wrongAnswers.includes('order_of_operations')) {
    misconceptions.push('Incorrect order of operations (PEMDAS)');
  }
  if (wrongAnswers.includes('fraction_addition')) {
    misconceptions.push('Adding fractions without common denominator');
  }
  if (wrongAnswers.includes('decimal_placement')) {
    misconceptions.push('Decimal point placement errors');
  }

  // Generic misconception if score is very low
  if (wrongAnswers.length > 3) {
    misconceptions.push(`Fundamental misunderstanding of ${topic} concepts`);
  }

  return misconceptions;
};

/**
 * Identify root causes of learning difficulties
 */
const identifyRootCauses = (masteryLevel, metadata = {}) => {
  const causes = [];

  if (masteryLevel < MASTERY_LEVELS.DEVELOPING) {
    causes.push('knowledge_gap');
  }

  if (metadata.timeSpent && metadata.timeSpent < 60) {
    causes.push('disengagement'); // Very short time suggests disengagement
  }

  if (metadata.readingScore && metadata.readingScore < 50) {
    causes.push('reading_difficulty');
  }

  if (metadata.attemptCount && metadata.attemptCount > 3 && masteryLevel < 50) {
    causes.push('concept_confusion');
  }

  if (causes.length === 0 && masteryLevel < MASTERY_LEVELS.APPROACHING) {
    causes.push('needs_practice');
  }

  return causes;
};

/**
 * Get human-readable mastery label
 */
const getMasteryLabel = (level) => {
  if (level >= MASTERY_LEVELS.MASTERED) return 'Mastered';
  if (level >= MASTERY_LEVELS.PROFICIENT) return 'Proficient';
  if (level >= MASTERY_LEVELS.APPROACHING) return 'Approaching';
  if (level >= MASTERY_LEVELS.DEVELOPING) return 'Developing';
  return 'Novice';
};

/**
 * Update the student's overall mastery score
 */
const updateOverallMastery = async (studentId) => {
  const { rows } = await query(
    'SELECT AVG(mastery_level) as avg_mastery FROM knowledge_graph WHERE student_id = $1',
    [studentId]
  );

  const avgMastery = rows[0]?.avg_mastery || 0;
  await query(
    'UPDATE students SET overall_mastery = $1, updated_at = NOW() WHERE id = $2',
    [Math.round(avgMastery * 10) / 10, studentId]
  );
};

/**
 * Get full knowledge graph for a student
 * @param {string} studentId
 * @returns {Object} Knowledge graph organized by subject
 */
const getStudentKnowledgeGraph = async (studentId) => {
  const { rows } = await query(
    `SELECT * FROM knowledge_graph WHERE student_id = $1 ORDER BY subject, concept`,
    [studentId]
  );

  // Organize by subject
  const graph = {};
  for (const row of rows) {
    if (!graph[row.subject]) {
      graph[row.subject] = { concepts: [], avgMastery: 0 };
    }
    graph[row.subject].concepts.push({
      concept: row.concept,
      masteryLevel: parseFloat(row.mastery_level),
      masteryLabel: getMasteryLabel(parseFloat(row.mastery_level)),
      misconceptions: row.misconceptions,
      rootCauses: row.root_causes,
      lastAssessed: row.last_assessed,
    });
  }

  // Calculate average mastery per subject
  for (const subject of Object.keys(graph)) {
    const concepts = graph[subject].concepts;
    graph[subject].avgMastery = Math.round(
      concepts.reduce((s, c) => s + c.masteryLevel, 0) / concepts.length
    );
    graph[subject].weakConcepts = concepts.filter(c => c.masteryLevel < 50);
    graph[subject].strongConcepts = concepts.filter(c => c.masteryLevel >= 75);
  }

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'knowledge_graph_retrieved',
    targetId: studentId,
    targetType: 'student',
    details: { subjectCount: Object.keys(graph).length },
  });

  return graph;
};

/**
 * Identify weak areas for a student across all subjects
 * @param {string} studentId
 * @returns {Array} Weak concepts sorted by priority
 */
const identifyWeakAreas = async (studentId) => {
  const { rows } = await query(
    `SELECT subject, concept, mastery_level, root_causes, misconceptions
     FROM knowledge_graph
     WHERE student_id = $1 AND mastery_level < 60
     ORDER BY mastery_level ASC
     LIMIT 10`,
    [studentId]
  );

  return rows.map(row => ({
    subject: row.subject,
    concept: row.concept,
    masteryLevel: parseFloat(row.mastery_level),
    masteryLabel: getMasteryLabel(parseFloat(row.mastery_level)),
    rootCauses: row.root_causes,
    misconceptions: row.misconceptions,
    priority: row.mastery_level < 30 ? 'high' : row.mastery_level < 50 ? 'medium' : 'low',
  }));
};

module.exports = {
  updateKnowledgeGraph,
  getStudentKnowledgeGraph,
  identifyWeakAreas,
  getMasteryLabel,
  MASTERY_LEVELS,
};
