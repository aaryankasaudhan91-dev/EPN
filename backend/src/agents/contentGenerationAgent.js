/**
 * Content Generation Agent
 * Generates worksheets, MCQ quizzes, flashcards, concept explanations,
 * and revision notes via OpenAI API (with mock fallback).
 * All generated content requires teacher approval before delivery.
 */

const { query } = require('../db/pool');
const { writeAuditLog } = require('../middleware/auditLogger');
const { generateContent } = require('../services/openai');
const { createLedgerEntry } = require('../services/ledger');

const AGENT_NAME = 'content_generation_agent';

// Circuit breaker: max content generations per student per day
const DAILY_GENERATION_LIMIT = parseInt(process.env.DAILY_CONTENT_LIMIT || '10');

/**
 * Check if generation limit has been reached for a student
 */
const checkGenerationLimit = async (studentId) => {
  const { rows } = await query(
    `SELECT COUNT(*) as count FROM generated_content
     WHERE student_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [studentId]
  );
  return parseInt(rows[0].count) >= DAILY_GENERATION_LIMIT;
};

/**
 * Generate educational content for a student
 * @param {Object} params
 * @param {string} params.studentId
 * @param {string} params.contentType - worksheet, quiz, flashcard, explanation, revision_notes, study_plan
 * @param {string} params.subject
 * @param {string} params.topic
 * @param {string} [params.teacherId] - Teacher who requested generation
 * @param {Object} [params.context] - Additional context (grade, difficulty, etc.)
 * @returns {Object} Generated content record
 */
const generateStudentContent = async ({
  studentId,
  contentType,
  subject,
  topic,
  teacherId = null,
  context = {},
  deadline = null,
}) => {
  // Circuit breaker check
  const limitReached = await checkGenerationLimit(studentId);
  if (limitReached) {
    await writeAuditLog({
      agent: AGENT_NAME,
      action: 'generation_limit_reached',
      targetId: studentId,
      targetType: 'student',
      details: { contentType, subject, topic },
    });
    throw new Error(`Daily content generation limit (${DAILY_GENERATION_LIMIT}) reached for this student`);
  }

  // Get student context for personalization
  const { rows: studentRows } = await query(
    `SELECT s.grade, s.learning_profile, u.name
     FROM students s JOIN users u ON s.user_id = u.id
     WHERE s.id = $1`,
    [studentId]
  );

  const student = studentRows[0] || { grade: 'unknown', learning_profile: {}, name: 'Student' };

  // Build the generation prompt
  const prompt = buildPrompt({ contentType, subject, topic, student, context });

  // Generate content via OpenAI or mock
  const result = await generateContent(prompt, {
    contentType,
    subject,
    topic,
    maxTokens: 2000,
  });

  // Determine approval requirement (all AI content requires approval by default)
  const approvalStatus = context.autoApprove ? 'approved' : 'pending';

  // Save to database
  const { rows: contentRows } = await query(
    `INSERT INTO generated_content
      (student_id, teacher_id, content_type, subject, topic, title, content,
       approval_status, ai_model, prompt_tokens, completion_tokens, deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      studentId,
      teacherId,
      contentType,
      subject,
      topic,
      result.content.title || `${topic} - ${contentType}`,
      JSON.stringify(result.content),
      approvalStatus,
      result.model,
      result.promptTokens,
      result.completionTokens,
      deadline ? new Date(deadline).toISOString() : null,
    ]
  );

  const contentRecord = contentRows[0];

  // Notify teacher for approval
  if (approvalStatus === 'pending' && teacherId) {
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        teacherId,
        '📝 Content Awaiting Approval',
        `New ${contentType} on "${topic}" (${subject}) generated for ${student.name} needs your review.`,
        'info',
        `/teacher/approvals/content/${contentRecord.id}`,
      ]
    );
  }

  // Create ledger entry
  await createLedgerEntry({
    recordType: 'content_generated',
    referenceId: contentRecord.id,
    metadata: { contentType, subject, topic, isMock: result.isMock },
  });

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'content_generated',
    actorId: teacherId,
    targetId: contentRecord.id,
    targetType: 'generated_content',
    details: {
      studentId,
      contentType,
      subject,
      topic,
      model: result.model,
      isMock: result.isMock,
      approvalStatus,
    },
  });

  return contentRecord;
};

/**
 * Build a structured prompt for content generation
 */
const buildPrompt = ({ contentType, subject, topic, student, context }) => {
  const grade = student.grade || 'middle school';
  const difficulty = context.difficulty || 'medium';

  const prompts = {
    quiz: `Generate a multiple-choice quiz for a ${grade} student on the topic "${topic}" in ${subject}.
      Difficulty: ${difficulty}. Create exactly 5 questions with 4 options each.
      Return JSON with: { title, subject, topic, questions: [{ id, question, options: [], correct (0-indexed), explanation, difficulty }], estimatedTime, totalPoints }`,

    worksheet: `Create a practice worksheet for a ${grade} student on "${topic}" in ${subject}.
      Difficulty: ${difficulty}. Include 3 sections: conceptual understanding, problem solving, and critical thinking.
      Return JSON with: { title, subject, topic, instructions, sections: [{ title, exercises: [{ id, type, question, answer, points }] }], totalPoints, estimatedTime }`,

    flashcard: `Generate 6 flashcards for a ${grade} student studying "${topic}" in ${subject}.
      Cover key definitions, formulas, examples, and common mistakes.
      Return JSON with: { title, subject, topic, cards: [{ id, front, back }] }`,

    explanation: `Write a clear, engaging explanation of "${topic}" in ${subject} for a ${grade} student.
      Use simple language, real-world examples, and step-by-step breakdowns.
      Return JSON with: { title, subject, topic, sections: [{ heading, content }] }`,

    revision_notes: `Create concise revision notes for "${topic}" in ${subject} for a ${grade} student.
      Include key points, formulas, mnemonics, and exam tips.
      Return JSON with: { title, subject, topic, summary, keyPoints: [], formulas: [{ name, formula, usage }], mnemonics: [], examTips: [] }`,

    study_plan: `Create a 2-week personalized study plan for a ${grade} student to master "${topic}" in ${subject}.
      Include daily tasks, resources, and success metrics.
      Return JSON with: { title, subject, topic, duration, weeklyGoals: [{ week, focus, tasks: [{ day, activity, duration, resources }] }], successMetrics: [] }`,
  };

  return prompts[contentType] || prompts.quiz;
};

/**
 * Approve generated content (teacher action)
 */
const approveContent = async (contentId, teacherId, notes = '') => {
  const { rows } = await query(
    `UPDATE generated_content
     SET approval_status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [contentId, teacherId]
  );

  if (!rows.length) throw new Error('Content not found');

  await createLedgerEntry({
    recordType: 'content_approved',
    referenceId: contentId,
    metadata: { teacherId, notes },
  });

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'content_approved',
    actorId: teacherId,
    targetId: contentId,
    targetType: 'generated_content',
    details: { notes },
  });

  return rows[0];
};

/**
 * Reject generated content (teacher action)
 */
const rejectContent = async (contentId, teacherId, reason) => {
  const { rows } = await query(
    `UPDATE generated_content
     SET approval_status = 'rejected', approved_by = $2, approved_at = NOW(),
         rejection_reason = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [contentId, teacherId, reason]
  );

  if (!rows.length) throw new Error('Content not found');

  await writeAuditLog({
    agent: AGENT_NAME,
    action: 'content_rejected',
    actorId: teacherId,
    targetId: contentId,
    targetType: 'generated_content',
    details: { reason },
  });

  return rows[0];
};

module.exports = {
  generateStudentContent,
  approveContent,
  rejectContent,
};
