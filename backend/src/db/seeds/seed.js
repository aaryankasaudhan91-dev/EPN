/**
 * Database Seed Script
 * Creates sample users, students, assessments, knowledge graph entries,
 * learning plans, generated content, and ledger records for all four roles.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool, query } = require('../pool');
const { createLedgerEntry } = require('../../services/ledger');
const { writeAuditLog } = require('../../middleware/auditLogger');

const DEFAULT_PASSWORD = 'Password123!';

async function seed() {
  console.log('🌱 Starting database seed...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    // ─── Create Users ──────────────────────────────────────────────────────────

    console.log('Creating users...');

    // Admin
    const adminId = uuidv4();
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [adminId, 'Dr. Sarah Mitchell', 'admin@epn.edu', passwordHash, 'admin']
    );

    // Teachers
    const teacher1Id = uuidv4();
    const teacher2Id = uuidv4();
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [teacher1Id, 'Mr. James Carter', 'teacher@epn.edu', passwordHash, 'teacher']
    );
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [teacher2Id, 'Ms. Emily Rodriguez', 'teacher2@epn.edu', passwordHash, 'teacher']
    );

    // Parents
    const parent1Id = uuidv4();
    const parent2Id = uuidv4();
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [parent1Id, 'Robert Johnson', 'parent@epn.edu', passwordHash, 'parent']
    );
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [parent2Id, 'Maria Garcia', 'parent2@epn.edu', passwordHash, 'parent']
    );

    // Students
    const studentUsers = [
      { id: uuidv4(), name: 'Alex Johnson', email: 'student@epn.edu', grade: '9', parentId: parent1Id },
      { id: uuidv4(), name: 'Sofia Garcia', email: 'student2@epn.edu', grade: '10', parentId: parent2Id },
      { id: uuidv4(), name: 'Marcus Williams', email: 'student3@epn.edu', grade: '9', parentId: null },
      { id: uuidv4(), name: 'Priya Patel', email: 'student4@epn.edu', grade: '11', parentId: null },
      { id: uuidv4(), name: 'Ethan Brown', email: 'student5@epn.edu', grade: '10', parentId: null },
    ];

    const studentIds = [];
    for (const su of studentUsers) {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        [su.id, su.name, passwordHash, passwordHash, 'student']
      );

      // Fix: use correct email
      await client.query(
        `UPDATE users SET email = $1 WHERE id = $2`,
        [su.email, su.id]
      );

      const learningProfiles = [
        { learningStyle: 'visual', pace: 'medium', strengths: ['Mathematics', 'Science'], challenges: ['English'] },
        { learningStyle: 'auditory', pace: 'fast', strengths: ['English', 'History'], challenges: ['Mathematics'] },
        { learningStyle: 'kinesthetic', pace: 'slow', strengths: ['Science'], challenges: ['Mathematics', 'English'] },
        { learningStyle: 'visual', pace: 'fast', strengths: ['Mathematics', 'Science', 'English'], challenges: [] },
        { learningStyle: 'reading', pace: 'medium', strengths: ['History', 'English'], challenges: ['Science'] },
      ];

      const profileIndex = studentUsers.indexOf(su);
      const riskScores = [45, 20, 75, 10, 60];
      const masteryScores = [68, 82, 42, 91, 55];

      const { rows: studentRows } = await client.query(
        `INSERT INTO students (user_id, grade, learning_profile, risk_score, overall_mastery)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET grade = $2
         RETURNING id`,
        [su.id, su.grade, JSON.stringify(learningProfiles[profileIndex]), riskScores[profileIndex], masteryScores[profileIndex]]
      );

      const studentId = studentRows[0].id;
      studentIds.push({ id: studentId, userId: su.id, name: su.name, parentId: su.parentId });

      // Link parent
      if (su.parentId) {
        await client.query(
          `INSERT INTO parent_student_links (parent_id, student_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [su.parentId, studentId]
        );
      }
    }

    // ─── Create Assessments ────────────────────────────────────────────────────

    console.log('Creating assessments...');

    const subjects = ['Mathematics', 'Science', 'English', 'History', 'Computer Science'];
    const topics = {
      Mathematics: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'],
      Science: ['Biology', 'Chemistry', 'Physics', 'Earth Science', 'Ecology'],
      English: ['Grammar', 'Literature', 'Writing', 'Reading Comprehension', 'Vocabulary'],
      History: ['Ancient History', 'World War II', 'American Revolution', 'Cold War', 'Renaissance'],
      'Computer Science': ['Algorithms', 'Data Structures', 'Programming', 'Databases', 'Networks'],
    };

    const baseScores = [65, 85, 40, 95, 58]; // per student

    for (let si = 0; si < studentIds.length; si++) {
      const student = studentIds[si];
      const baseScore = baseScores[si];

      for (const subject of subjects) {
        for (let i = 0; i < 5; i++) {
          const topic = topics[subject][i];
          const variance = (Math.random() - 0.5) * 30;
          const score = Math.max(10, Math.min(100, baseScore + variance));
          const daysAgo = (5 - i) * 6; // spread over 30 days

          await client.query(
            `INSERT INTO assessments (student_id, subject, topic, score, max_score, time_spent, assessment_type, taken_at)
             VALUES ($1, $2, $3, $4, 100, $5, $6, NOW() - INTERVAL '${daysAgo} days')`,
            [student.id, subject, topic, Math.round(score * 10) / 10, Math.floor(Math.random() * 1800) + 600, i % 2 === 0 ? 'quiz' : 'test']
          );
        }
      }
    }

    // ─── Create Knowledge Graph ────────────────────────────────────────────────

    console.log('Creating knowledge graph entries...');

    for (let si = 0; si < studentIds.length; si++) {
      const student = studentIds[si];
      const baseScore = baseScores[si];

      for (const subject of subjects) {
        for (const topic of topics[subject]) {
          const variance = (Math.random() - 0.5) * 40;
          const mastery = Math.max(5, Math.min(100, baseScore + variance));
          const rootCauses = mastery < 40 ? ['knowledge_gap'] : mastery < 60 ? ['needs_practice'] : [];
          const misconceptions = mastery < 40 ? [`Common misconception about ${topic}`] : [];

          await client.query(
            `INSERT INTO knowledge_graph (student_id, subject, concept, mastery_level, misconceptions, root_causes, last_assessed)
             VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${Math.floor(Math.random() * 14)} days')
             ON CONFLICT (student_id, subject, concept) DO UPDATE SET mastery_level = $4`,
            [student.id, subject, topic, Math.round(mastery * 10) / 10, JSON.stringify(misconceptions), JSON.stringify(rootCauses)]
          );
        }
      }
    }

    // ─── Create Learning Plans ─────────────────────────────────────────────────

    console.log('Creating learning plans...');

    const sampleTasks = [
      {
        id: 'task_1', type: 'remedial', subject: 'Mathematics', concept: 'Algebra',
        title: 'Remedial: Algebra Fundamentals', priority: 'high',
        estimatedDuration: 45, status: 'completed',
        resources: [{ type: 'explanation', title: 'Algebra Explained' }, { type: 'quiz', title: 'Algebra Quiz' }],
      },
      {
        id: 'task_2', type: 'remedial', subject: 'Science', concept: 'Chemistry',
        title: 'Remedial: Chemistry Basics', priority: 'medium',
        estimatedDuration: 30, status: 'in_progress',
        resources: [{ type: 'worksheet', title: 'Chemistry Worksheet' }],
      },
      {
        id: 'task_3', type: 'enrichment', subject: 'Computer Science', concept: 'Algorithms',
        title: 'Enrichment: Advanced Algorithms', priority: 'low',
        estimatedDuration: 60, status: 'pending',
        resources: [{ type: 'quiz', title: 'Algorithm Challenge' }],
      },
    ];

    for (let si = 0; si < studentIds.length; si++) {
      const student = studentIds[si];
      const statuses = ['active', 'pending_approval', 'completed', 'active', 'pending_approval'];
      const approvalStatuses = ['approved', 'pending', 'approved', 'approved', 'pending'];

      await client.query(
        `INSERT INTO learning_plans 
          (student_id, teacher_id, title, description, tasks, status, approval_status, ai_generated, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, CURRENT_DATE - 7, CURRENT_DATE + 7)`,
        [
          student.id,
          teacher1Id,
          `Adaptive Learning Plan - ${student.name}`,
          `AI-generated personalized learning plan based on performance analysis.`,
          JSON.stringify(sampleTasks),
          statuses[si],
          approvalStatuses[si],
        ]
      );
    }

    // ─── Create Generated Content ──────────────────────────────────────────────

    console.log('Creating generated content...');

    const contentTypes = ['quiz', 'worksheet', 'flashcard', 'explanation', 'revision_notes'];
    const contentApprovalStatuses = ['approved', 'pending', 'approved', 'rejected', 'approved'];

    for (let si = 0; si < Math.min(3, studentIds.length); si++) {
      const student = studentIds[si];

      for (let ci = 0; ci < contentTypes.length; ci++) {
        const contentType = contentTypes[ci];
        const subject = subjects[ci % subjects.length];
        const topic = topics[subject][0];

        const sampleContent = {
          title: `${topic} ${contentType}`,
          subject,
          topic,
          questions: contentType === 'quiz' ? [
            { id: 1, question: `What is ${topic}?`, options: ['A', 'B', 'C', 'D'], correct: 0, explanation: 'Explanation here' },
          ] : undefined,
          cards: contentType === 'flashcard' ? [
            { id: 1, front: `Define ${topic}`, back: `${topic} is a fundamental concept in ${subject}` },
          ] : undefined,
        };

        await client.query(
          `INSERT INTO generated_content 
            (student_id, teacher_id, content_type, subject, topic, title, content, approval_status, ai_model)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            student.id,
            teacher1Id,
            contentType,
            subject,
            topic,
            `${topic} - ${contentType}`,
            JSON.stringify(sampleContent),
            contentApprovalStatuses[ci],
            'mock-v1',
          ]
        );
      }
    }

    // ─── Create Achievements ───────────────────────────────────────────────────

    console.log('Creating achievements...');

    const badges = [
      { type: 'first_quiz', title: '🎯 First Quiz', description: 'Completed your first quiz' },
      { type: 'perfect_score', title: '⭐ Perfect Score', description: 'Scored 100% on an assessment' },
      { type: 'streak_7', title: '🔥 7-Day Streak', description: 'Studied for 7 consecutive days' },
      { type: 'mastery_math', title: '📐 Math Master', description: 'Achieved 80%+ mastery in Mathematics' },
    ];

    for (const student of studentIds.slice(0, 3)) {
      for (const badge of badges.slice(0, 2)) {
        await client.query(
          `INSERT INTO achievements (student_id, badge_type, title, description)
           VALUES ($1, $2, $3, $4)`,
          [student.id, badge.type, badge.title, badge.description]
        );
      }
    }

    // ─── Create Notifications ──────────────────────────────────────────────────

    console.log('Creating notifications...');

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [teacher1Id, '⚠️ High Risk Alert', 'Marcus Williams has a risk score of 75. Immediate attention recommended.', 'warning', '/teacher/students']
    );
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [teacher1Id, '📋 Pending Approvals', 'You have 2 learning plans awaiting your approval.', 'info', '/teacher/approvals']
    );

    // ─── Create System Config ──────────────────────────────────────────────────

    console.log('Creating system config...');

    const configs = [
      { key: 'ai_autonomy_level', value: { level: 'medium', description: 'AI can generate content but requires approval' }, desc: 'AI autonomy level' },
      { key: 'daily_content_limit', value: { limit: 10, per: 'student' }, desc: 'Max AI content generations per student per day' },
      { key: 'risk_alert_threshold', value: { high: 70, medium: 40 }, desc: 'Risk score thresholds for alerts' },
      { key: 'openai_budget', value: { monthly_limit_usd: 100, current_usage: 0 }, desc: 'OpenAI API budget limits' },
    ];

    for (const config of configs) {
      await client.query(
        `INSERT INTO system_config (config_key, config_value, description, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (config_key) DO UPDATE SET config_value = $2`,
        [config.key, JSON.stringify(config.value), config.desc, adminId]
      );
    }

    // ─── Create Ledger Entries ─────────────────────────────────────────────────

    console.log('Creating ledger entries...');

    // Genesis block
    await client.query(
      `INSERT INTO ledger_records (block_index, record_type, data_hash, previous_hash, block_hash, metadata)
       VALUES (0, 'genesis', $1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [
        'a'.repeat(64),
        '0'.repeat(64),
        'b'.repeat(64),
        JSON.stringify({ message: 'EPN Ledger Genesis Block', created: new Date().toISOString() }),
      ]
    );

    // ─── Create Audit Logs ─────────────────────────────────────────────────────

    console.log('Creating audit logs...');

    const auditEntries = [
      { agent: 'monitor_agent', action: 'performance_analyzed', targetType: 'student' },
      { agent: 'diagnostic_agent', action: 'knowledge_graph_updated', targetType: 'student' },
      { agent: 'curriculum_planner_agent', action: 'plan_created', targetType: 'learning_plan' },
      { agent: 'content_generation_agent', action: 'content_generated', targetType: 'generated_content' },
      { agent: 'orchestrator_agent', action: 'pipeline_completed', targetType: 'student' },
      { agent: 'auth', action: 'user_logged_in', targetType: 'user' },
    ];

    for (const entry of auditEntries) {
      await client.query(
        `INSERT INTO audit_logs (agent, action, actor_id, target_type, details, policy_version)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [entry.agent, entry.action, adminId, entry.targetType, JSON.stringify({ seeded: true }), '1.0.0']
      );
    }

    await client.query('COMMIT');
    console.log('✅ Seed completed successfully!');
    console.log('\n📋 Demo Credentials (password: Password123!):');
    console.log('   Admin:    admin@epn.edu');
    console.log('   Teacher:  teacher@epn.edu');
    console.log('   Student:  student@epn.edu');
    console.log('   Parent:   parent@epn.edu');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
