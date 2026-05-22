-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
-- รันไฟล์นี้ใน Supabase SQL Editor หลังจาก schema.sql แล้ว

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('quiz_submission', 'new_quiz', 'new_announcement')),
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index สำหรับดึงแจ้งเตือนของ user เร็วขึ้น
CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications(user_id, is_read, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- นักเรียน/ครูเห็นเฉพาะ notification ของตัวเอง
CREATE POLICY "users_see_own_notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- service role เท่านั้นที่ insert ได้ (ผ่าน API route)
CREATE POLICY "service_role_insert"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- อัปเดต (mark as read) ได้เฉพาะเจ้าของ
CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ลบได้เฉพาะเจ้าของ
CREATE POLICY "users_delete_own_notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());