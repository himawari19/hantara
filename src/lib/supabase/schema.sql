-- ============================================
-- Hantara Database Schema for Supabase
-- Safe to re-run (uses IF NOT EXISTS + DROP policies)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
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
  variables JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FOLDERS
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
  params JSONB DEFAULT '[]'::jsonb,
  body TEXT DEFAULT '',
  body_type TEXT DEFAULT 'none',
  request_type TEXT NOT NULL DEFAULT 'http' CHECK (request_type IN ('http', 'websocket', 'graphql')),
  pre_script TEXT DEFAULT '',
  test_script TEXT DEFAULT '',
  auth_type TEXT DEFAULT 'none',
  auth_config JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REQUEST EXAMPLES (Saved Responses)
-- ============================================
CREATE TABLE IF NOT EXISTS request_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Example',
  status INTEGER,
  response_headers JSONB DEFAULT '{}'::jsonb,
  response_body TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENVIRONMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  is_global BOOLEAN DEFAULT FALSE,
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
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  request_headers JSONB DEFAULT '{}'::jsonb,
  request_body TEXT DEFAULT '',
  status INTEGER NOT NULL,
  response_headers JSONB DEFAULT '{}'::jsonb,
  response_body TEXT DEFAULT '',
  response_time INTEGER NOT NULL,
  response_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_history_user ON request_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_history_workspace ON request_history(workspace_id, created_at DESC);

-- ============================================
-- FLOWS / COLLECTION RUNNER
-- ============================================
CREATE TABLE IF NOT EXISTS flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  steps JSONB DEFAULT '[]'::jsonb,
  delay_between_requests INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FLOW RUNS (execution history)
-- ============================================
CREATE TABLE IF NOT EXISTS flow_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  results JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- MOCK SERVERS
-- ============================================
CREATE TABLE IF NOT EXISTS mock_servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  base_path TEXT NOT NULL DEFAULT '/mock',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MOCK ROUTES
-- ============================================
CREATE TABLE IF NOT EXISTS mock_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_server_id UUID NOT NULL REFERENCES mock_servers(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'GET',
  path TEXT NOT NULL DEFAULT '/',
  response_status INTEGER DEFAULT 200,
  response_headers JSONB DEFAULT '{}'::jsonb,
  response_body TEXT DEFAULT '',
  delay_ms INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON activity_log(workspace_id, created_at DESC);

-- ============================================
-- REQUEST COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS request_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUTH CONFIGS (reusable auth presets)
-- ============================================
CREATE TABLE IF NOT EXISTS auth_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('bearer', 'basic', 'oauth2', 'apikey', 'aws', 'digest')),
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COOKIE STORE
-- ============================================
CREATE TABLE IF NOT EXISTS cookies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  path TEXT DEFAULT '/',
  secure BOOLEAN DEFAULT FALSE,
  http_only BOOLEAN DEFAULT FALSE,
  same_site TEXT DEFAULT 'lax',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, domain, name, path)
);

-- ============================================
-- COLLECTION FORKS
-- ============================================
CREATE TABLE IF NOT EXISTS collection_forks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  forked_collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  forked_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WEBSOCKET CONNECTIONS (for WS support)
-- ============================================
CREATE TABLE IF NOT EXISTS websocket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'binary', 'ping', 'pong')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookies ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_forks ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP ALL EXISTING POLICIES (safe re-run)
-- ============================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Workspace members can view" ON workspaces;
DROP POLICY IF EXISTS "Owner can update workspace" ON workspaces;
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owner can delete workspace" ON workspaces;
DROP POLICY IF EXISTS "Members can view members" ON workspace_members;
DROP POLICY IF EXISTS "Owner can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members can view collections" ON collections;
DROP POLICY IF EXISTS "Editors can manage collections" ON collections;
DROP POLICY IF EXISTS "Members can view folders" ON folders;
DROP POLICY IF EXISTS "Editors can manage folders" ON folders;
DROP POLICY IF EXISTS "Members can view requests" ON requests;
DROP POLICY IF EXISTS "Editors can manage requests" ON requests;
DROP POLICY IF EXISTS "Members can view request examples" ON request_examples;
DROP POLICY IF EXISTS "Editors can manage request examples" ON request_examples;
DROP POLICY IF EXISTS "Members can view environments" ON environments;
DROP POLICY IF EXISTS "Editors can manage environments" ON environments;
DROP POLICY IF EXISTS "Users can view own history" ON request_history;
DROP POLICY IF EXISTS "Users can insert own history" ON request_history;
DROP POLICY IF EXISTS "Members can view flows" ON flows;
DROP POLICY IF EXISTS "Editors can manage flows" ON flows;
DROP POLICY IF EXISTS "Members can view flow runs" ON flow_runs;
DROP POLICY IF EXISTS "Users can manage own flow runs" ON flow_runs;
DROP POLICY IF EXISTS "Members can view mock servers" ON mock_servers;
DROP POLICY IF EXISTS "Editors can manage mock servers" ON mock_servers;
DROP POLICY IF EXISTS "Members can view mock routes" ON mock_routes;
DROP POLICY IF EXISTS "Editors can manage mock routes" ON mock_routes;
DROP POLICY IF EXISTS "Members can view activity" ON activity_log;
DROP POLICY IF EXISTS "Members can insert activity" ON activity_log;
DROP POLICY IF EXISTS "Members can view comments" ON request_comments;
DROP POLICY IF EXISTS "Members can manage own comments" ON request_comments;
DROP POLICY IF EXISTS "Members can view auth configs" ON auth_configs;
DROP POLICY IF EXISTS "Editors can manage auth configs" ON auth_configs;
DROP POLICY IF EXISTS "Members can view cookies" ON cookies;
DROP POLICY IF EXISTS "Editors can manage cookies" ON cookies;
DROP POLICY IF EXISTS "Members can view forks" ON collection_forks;
DROP POLICY IF EXISTS "Users can create forks" ON collection_forks;
DROP POLICY IF EXISTS "Members can view ws messages" ON websocket_messages;
DROP POLICY IF EXISTS "Users can manage own ws messages" ON websocket_messages;

-- ============================================
-- CREATE POLICIES
-- ============================================

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Workspaces
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

-- Collections
CREATE POLICY "Workspace members can view collections" ON collections FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Editors can manage collections" ON collections FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Folders
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

-- Requests
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

-- Request Examples
CREATE POLICY "Members can view request examples" ON request_examples FOR SELECT
  USING (request_id IN (
    SELECT id FROM requests WHERE collection_id IN (
      SELECT id FROM collections WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  ));
CREATE POLICY "Editors can manage request examples" ON request_examples FOR ALL
  USING (request_id IN (
    SELECT id FROM requests WHERE collection_id IN (
      SELECT id FROM collections WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  ));

-- Environments
CREATE POLICY "Members can view environments" ON environments FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Editors can manage environments" ON environments FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Request History
CREATE POLICY "Users can view own history" ON request_history FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own history" ON request_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Flows
CREATE POLICY "Members can view flows" ON flows FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Editors can manage flows" ON flows FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Flow Runs
CREATE POLICY "Members can view flow runs" ON flow_runs FOR SELECT
  USING (flow_id IN (
    SELECT id FROM flows WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Users can manage own flow runs" ON flow_runs FOR ALL
  USING (user_id = auth.uid());

-- Mock Servers
CREATE POLICY "Members can view mock servers" ON mock_servers FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Editors can manage mock servers" ON mock_servers FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Mock Routes
CREATE POLICY "Members can view mock routes" ON mock_routes FOR SELECT
  USING (mock_server_id IN (
    SELECT id FROM mock_servers WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Editors can manage mock routes" ON mock_routes FOR ALL
  USING (mock_server_id IN (
    SELECT id FROM mock_servers WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  ));

-- Activity Log
CREATE POLICY "Members can view activity" ON activity_log FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert activity" ON activity_log FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Request Comments
CREATE POLICY "Members can view comments" ON request_comments FOR SELECT
  USING (request_id IN (
    SELECT id FROM requests WHERE collection_id IN (
      SELECT id FROM collections WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  ));
CREATE POLICY "Members can manage own comments" ON request_comments FOR ALL
  USING (user_id = auth.uid());

-- Auth Configs
CREATE POLICY "Members can view auth configs" ON auth_configs FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Editors can manage auth configs" ON auth_configs FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Cookies
CREATE POLICY "Members can view cookies" ON cookies FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Editors can manage cookies" ON cookies FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Collection Forks
CREATE POLICY "Members can view forks" ON collection_forks FOR SELECT
  USING (forked_by = auth.uid() OR original_collection_id IN (
    SELECT id FROM collections WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Users can create forks" ON collection_forks FOR INSERT
  WITH CHECK (forked_by = auth.uid());

-- WebSocket Messages
CREATE POLICY "Members can view ws messages" ON websocket_messages FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can manage own ws messages" ON websocket_messages FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- REALTIME
-- ============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE collections;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE folders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE environments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE request_comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- AUTO-CREATE DEFAULT WORKSPACE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspaces (name, owner_id)
  VALUES ('My Workspace', NEW.id);

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    (SELECT id FROM workspaces WHERE owner_id = NEW.id ORDER BY created_at DESC LIMIT 1),
    NEW.id,
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_workspace();

-- ============================================
-- HELPER FUNCTION: Log activity
-- ============================================
CREATE OR REPLACE FUNCTION log_activity(
  p_workspace_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO activity_log (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
  VALUES (p_workspace_id, p_user_id, p_action, p_entity_type, p_entity_id, p_entity_name, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
