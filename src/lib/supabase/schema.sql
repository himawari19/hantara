-- ============================================
-- Hantara Database Schema for Supabase
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (auto-created on auth signup)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- WORKSPACES
-- ============================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WORKSPACE MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ============================================
-- COLLECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FOLDERS (nested via parent_folder_id)
-- ============================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'New Request',
  method TEXT NOT NULL DEFAULT 'GET',
  url TEXT NOT NULL DEFAULT '',
  headers JSONB DEFAULT '[]'::jsonb,
  body TEXT DEFAULT '',
  body_type TEXT DEFAULT 'none',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENVIRONMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REQUEST HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS request_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  status INTEGER NOT NULL,
  response_time INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast history queries
CREATE INDEX IF NOT EXISTS idx_request_history_user ON request_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_history_workspace ON request_history(workspace_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_history ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Workspaces: members can access
CREATE POLICY "Workspace members can view" ON workspaces FOR SELECT
  USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Owner can update workspace" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "Authenticated users can create workspaces" ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete workspace" ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Workspace Members
CREATE POLICY "Members can view members" ON workspace_members FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Owner can manage members" ON workspace_members FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Collections: workspace members can access
CREATE POLICY "Workspace members can view collections" ON collections FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Editors can manage collections" ON collections FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Folders: via collection access
CREATE POLICY "Members can view folders" ON folders FOR SELECT
  USING (collection_id IN (
    SELECT id FROM collections WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Editors can manage folders" ON folders FOR ALL
  USING (collection_id IN (
    SELECT id FROM collections WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  ));

-- Requests: via collection access
CREATE POLICY "Members can view requests" ON requests FOR SELECT
  USING (collection_id IN (
    SELECT id FROM collections WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Editors can manage requests" ON requests FOR ALL
  USING (collection_id IN (
    SELECT id FROM collections WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  ));

-- Environments: workspace members
CREATE POLICY "Members can view environments" ON environments FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Editors can manage environments" ON environments FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Request History: own history
CREATE POLICY "Users can view own history" ON request_history FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own history" ON request_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- REALTIME (enable for collaborative editing)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE collections;
ALTER PUBLICATION supabase_realtime ADD TABLE folders;
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
ALTER PUBLICATION supabase_realtime ADD TABLE environments;

-- ============================================
-- AUTO-CREATE DEFAULT WORKSPACE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default workspace
  INSERT INTO workspaces (name, owner_id)
  VALUES ('My Workspace', NEW.id);

  -- Add owner as member
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    (SELECT id FROM workspaces WHERE owner_id = NEW.id LIMIT 1),
    NEW.id,
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_workspace();
