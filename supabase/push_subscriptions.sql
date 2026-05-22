-- =============================================
-- PUSH SUBSCRIPTIONS TABLE
-- =============================================
-- รันไฟล์นี้ใน Supabase SQL Editor
-- (ต้องรัน notifications.sql ก่อนแล้ว)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth_key    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_sub_user_idx ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ผู้ใช้จัดการ subscription ของตัวเองได้
CREATE POLICY "users_manage_own_push"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
