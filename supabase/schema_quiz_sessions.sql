-- =============================================
-- QUIZ SESSIONS - track leave violations
-- =============================================
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id       UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','submitted','left','blocked')),
  leave_count   INT NOT NULL DEFAULT 0,
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  reset_by      UUID REFERENCES profiles(id),  -- admin who reset
  reset_at      TIMESTAMPTZ,
  UNIQUE (student_id, quiz_id)
);

ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own sessions" ON quiz_sessions
  FOR ALL TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add retry_allowed column to submissions (admin can reset)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS retry_allowed BOOLEAN DEFAULT FALSE;

-- Add reset columns if table already exists
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS reset_by UUID REFERENCES profiles(id);
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ;
