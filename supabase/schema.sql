-- =============================================
-- English Class Manager - Supabase Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  student_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  nickname TEXT,
  grade TEXT CHECK (grade IN ('ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3','ม.3/1','ม.3/2','ม.3/3')),
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin','student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MEDIA (Knowledge + Videos)
-- =============================================
CREATE TABLE media_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('knowledge','video')),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  tags TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ANNOUNCEMENTS
-- =============================================
CREATE TABLE announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('text','image','scores')),
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  is_important BOOLEAN DEFAULT FALSE,
  scores_data JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUIZZES
-- =============================================
CREATE TABLE quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  pass_score INT NOT NULL DEFAULT 60 CHECK (pass_score BETWEEN 0 AND 100),
  time_limit INT,  -- minutes, NULL = no limit
  is_open BOOLEAN DEFAULT FALSE,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  grade_filter TEXT[],  -- NULL = all grades
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUESTIONS
-- =============================================
CREATE TABLE questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq','essay','fill')),
  question_text TEXT NOT NULL,
  options JSONB,       -- [{label:"A", text:"..."}, ...] for MCQ
  correct_answer TEXT, -- index for MCQ, text for fill
  points INT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBMISSIONS
-- =============================================
CREATE TABLE submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',  -- {question_id: answer}
  score NUMERIC(5,2),
  is_passed BOOLEAN,
  time_taken INT,  -- seconds
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (quiz_id, student_id)
);

-- =============================================
-- STORAGE BUCKETS (run in Supabase dashboard)
-- =============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('announcements', 'announcements', true);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles viewable by authenticated" ON profiles
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admin can do anything on profiles" ON profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Media policies
CREATE POLICY "Media viewable by authenticated" ON media_items
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin can manage media" ON media_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Announcements policies
CREATE POLICY "Announcements viewable by authenticated" ON announcements
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin can manage announcements" ON announcements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Quizzes policies
CREATE POLICY "Open quizzes viewable by students" ON quizzes
  FOR SELECT TO authenticated
  USING (is_open = TRUE OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage quizzes" ON quizzes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Questions policies
CREATE POLICY "Questions viewable by authenticated" ON questions
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin can manage questions" ON questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Submissions policies
CREATE POLICY "Students can view own submissions" ON submissions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Students can insert own submissions" ON submissions
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- =============================================
-- FUNCTIONS
-- =============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER media_updated_at BEFORE UPDATE ON media_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- SEED DATA (optional demo data)
-- =============================================
-- Run after creating admin user via Supabase Auth dashboard
-- UPDATE profiles SET role = 'admin' WHERE id = '<your-admin-user-id>';
