-- ============================================================
-- EPN Database Schema - Initial Migration
-- Educational Productivity Network
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM Types ───────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin', 'parent');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE content_type AS ENUM ('worksheet', 'quiz', 'flashcard', 'explanation', 'revision_notes', 'study_plan');
CREATE TYPE plan_status AS ENUM ('active', 'completed', 'paused', 'pending_approval');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- ─── Users Table ──────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'student',
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ─── Students Table ───────────────────────────────────────────────────────────

CREATE TABLE students (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade            VARCHAR(20) NOT NULL,
  learning_profile JSONB DEFAULT '{}',  -- stores learning style, pace, preferences
  risk_score       DECIMAL(5,2) DEFAULT 0.0,  -- 0-100 risk of falling behind
  overall_mastery  DECIMAL(5,2) DEFAULT 0.0,  -- 0-100 overall mastery score
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_students_user_id ON students(user_id);

-- ─── Parent-Child Linking ─────────────────────────────────────────────────────

CREATE TABLE parent_student_links (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- ─── Assessments Table ────────────────────────────────────────────────────────

CREATE TABLE assessments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject      VARCHAR(100) NOT NULL,
  topic        VARCHAR(255),
  score        DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  max_score    DECIMAL(5,2) NOT NULL DEFAULT 100,
  time_spent   INTEGER,  -- seconds
  assessment_type VARCHAR(50) DEFAULT 'quiz',  -- quiz, test, assignment
  metadata     JSONB DEFAULT '{}',
  taken_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assessments_student_id ON assessments(student_id);
CREATE INDEX idx_assessments_subject ON assessments(subject);
CREATE INDEX idx_assessments_taken_at ON assessments(taken_at);

-- ─── Knowledge Graph Table ────────────────────────────────────────────────────

CREATE TABLE knowledge_graph (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject       VARCHAR(100) NOT NULL,
  concept       VARCHAR(255) NOT NULL,
  mastery_level DECIMAL(5,2) DEFAULT 0.0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  misconceptions JSONB DEFAULT '[]',  -- array of identified misconceptions
  root_causes   JSONB DEFAULT '[]',   -- knowledge_gap, reading_issue, disengagement
  last_assessed TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject, concept)
);

CREATE INDEX idx_knowledge_graph_student_id ON knowledge_graph(student_id);
CREATE INDEX idx_knowledge_graph_mastery ON knowledge_graph(mastery_level);

-- ─── Learning Plans Table ─────────────────────────────────────────────────────

CREATE TABLE learning_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id      UUID REFERENCES users(id),  -- assigned teacher
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  tasks           JSONB NOT NULL DEFAULT '[]',  -- array of learning tasks
  status          plan_status DEFAULT 'pending_approval',
  approval_status approval_status DEFAULT 'pending',
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  ai_generated    BOOLEAN DEFAULT TRUE,
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_plans_student_id ON learning_plans(student_id);
CREATE INDEX idx_learning_plans_status ON learning_plans(status);

-- ─── Generated Content Table ──────────────────────────────────────────────────

CREATE TABLE generated_content (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id      UUID REFERENCES users(id),
  content_type    content_type NOT NULL,
  subject         VARCHAR(100),
  topic           VARCHAR(255),
  title           VARCHAR(255),
  content         JSONB NOT NULL,  -- structured content (questions, answers, etc.)
  approval_status approval_status DEFAULT 'pending',
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  ai_model        VARCHAR(100) DEFAULT 'mock',
  prompt_tokens   INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_content_student_id ON generated_content(student_id);
CREATE INDEX idx_generated_content_type ON generated_content(content_type);
CREATE INDEX idx_generated_content_approval ON generated_content(approval_status);

-- ─── Audit Log Table ──────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent          VARCHAR(100) NOT NULL,  -- monitor, diagnostic, curriculum_planner, content_gen, orchestrator
  action         VARCHAR(255) NOT NULL,
  actor_id       UUID REFERENCES users(id),  -- human actor (if any)
  target_id      UUID,  -- target entity id
  target_type    VARCHAR(100),  -- student, content, plan, etc.
  details        JSONB DEFAULT '{}',
  policy_version VARCHAR(50) DEFAULT '1.0.0',
  ip_address     INET,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_agent ON audit_logs(agent);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);

-- ─── Ledger Records Table (Blockchain Simulation) ─────────────────────────────

CREATE TABLE ledger_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_index   BIGINT NOT NULL,
  record_type   VARCHAR(100) NOT NULL,  -- achievement, approval, assessment, content
  reference_id  UUID,  -- references the actual record
  data_hash     VARCHAR(64) NOT NULL,   -- SHA-256 hash of the record data
  previous_hash VARCHAR(64) NOT NULL,   -- hash of previous block
  block_hash    VARCHAR(64) NOT NULL,   -- hash of this block
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_block_index ON ledger_records(block_index);
CREATE INDEX idx_ledger_record_type ON ledger_records(record_type);

-- ─── Achievements Table ───────────────────────────────────────────────────────

CREATE TABLE achievements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_type  VARCHAR(100) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  ledger_id   UUID REFERENCES ledger_records(id)  -- blockchain verification
);

CREATE INDEX idx_achievements_student_id ON achievements(student_id);

-- ─── Notifications Table ──────────────────────────────────────────────────────

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  type       VARCHAR(50) DEFAULT 'info',  -- info, warning, alert, success
  is_read    BOOLEAN DEFAULT FALSE,
  link       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ─── System Config Table ──────────────────────────────────────────────────────

CREATE TABLE system_config (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key  VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Trigger: updated_at auto-update ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_graph_updated_at BEFORE UPDATE ON knowledge_graph
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_plans_updated_at BEFORE UPDATE ON learning_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_content_updated_at BEFORE UPDATE ON generated_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
