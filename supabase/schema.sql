-- Table for user profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Table for notes
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  images_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for note versions (History/Undo)
CREATE TABLE IF NOT EXISTS note_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes ON DELETE CASCADE NOT NULL,
  content TEXT DEFAULT '',
  images_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- Optional metadata columns for Keep-like editor features
ALTER TABLE notes ADD COLUMN IF NOT EXISTS note_color TEXT DEFAULT '#FFFFFF';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS order_index BIGINT DEFAULT 0;

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Notes policies
CREATE POLICY "Users can view their own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON notes FOR DELETE USING (auth.uid() = user_id);

-- Note versions policies
CREATE POLICY "Users can view versions of their own notes" ON note_versions FOR SELECT
USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_versions.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "Users can create versions of their own notes" ON note_versions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_versions.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can delete versions of their own notes" ON note_versions FOR DELETE
USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_versions.note_id AND notes.user_id = auth.uid()));

-- Trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notes updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE PROCEDURE handle_updated_at();
