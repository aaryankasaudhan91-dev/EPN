-- ============================================================
-- EPN Database Schema - Cognitive Profiling & Adaptive Architecture
-- ============================================================

-- ─── Mood Check-Ins (Feature 2) ────────────────────────────────────────────────
CREATE TABLE student_mood_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mood        VARCHAR(50) NOT NULL, -- e.g., 'energized', 'tired', 'stressed', 'focused'
  energy_level INTEGER NOT NULL CHECK (energy_level >= 1 AND energy_level <= 10),
  logged_at   TIMESTAMPTZ DEFAULT NOW(),
  notes       TEXT
);
CREATE INDEX idx_student_mood_logs_student ON student_mood_logs(student_id);

-- ─── Spaced Repetition Items (Feature 3) ───────────────────────────────────────
CREATE TABLE spaced_repetition_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  concept         VARCHAR(255) NOT NULL,
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  easiness_factor DECIMAL(5,2) DEFAULT 2.5,
  interval_days   INTEGER DEFAULT 1,
  repetitions     INTEGER DEFAULT 0,
  next_review_at  TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_spaced_repetition_review ON spaced_repetition_items(student_id, next_review_at);

-- ─── Micro-Tasks (Feature 4 & 18) ──────────────────────────────────────────────
CREATE TABLE micro_tasks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  learning_plan_id UUID REFERENCES learning_plans(id) ON DELETE SET NULL,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  estimated_time   INTEGER DEFAULT 5, -- minutes
  is_completed     BOOLEAN DEFAULT FALSE,
  is_low_friction  BOOLEAN DEFAULT FALSE, -- Feature 18: Low-Motivation Adaptive Workloads
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_micro_tasks_student ON micro_tasks(student_id);

-- ─── Peer-Led Growth Circles (Feature 14) ──────────────────────────────────────
CREATE TABLE growth_circles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE growth_circle_members (
  circle_id   UUID NOT NULL REFERENCES growth_circles(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (circle_id, student_id)
);

-- ─── Social Contract Commitment Pledges (Feature 9) ────────────────────────────
CREATE TABLE social_contracts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  partner_id      UUID REFERENCES users(id), -- Buddy or Mentor
  pledge_text     TEXT NOT NULL,
  deadline        TIMESTAMPTZ NOT NULL,
  is_fulfilled    BOOLEAN DEFAULT FALSE,
  fulfilled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Metacognitive Reflections (Feature 11) ────────────────────────────────────
CREATE TABLE metacognitive_reflections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id      UUID, -- Could link to a study session table
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  reflection_date TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Focus & Behavioral Heatmaps (Feature 7 & 10) ──────────────────────────────
CREATE TABLE study_sessions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id         UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  start_time         TIMESTAMPTZ DEFAULT NOW(),
  end_time           TIMESTAMPTZ,
  duration_minutes   INTEGER,
  focus_score        DECIMAL(5,2), -- 0-100 based on heatmap
  optimal_time_flag  BOOLEAN DEFAULT FALSE -- Was it during their golden hours? (Feature 10)
);

CREATE TABLE behavioral_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  event_type      VARCHAR(50) NOT NULL, -- e.g., 'distraction_intercepted', 'scroll_burst', 'idle'
  metadata        JSONB DEFAULT '{}',
  timestamp       TIMESTAMPTZ DEFAULT NOW()
);
