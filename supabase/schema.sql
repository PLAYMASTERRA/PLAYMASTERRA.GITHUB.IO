-- ============================================================================
-- PLAYMASTER RA — COMPLETE SUPABASE DATABASE SCHEMA, RLS & STORAGE POLICIES
-- File: supabase/schema.sql
-- Run this entire script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- Enable UUID generation extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. AUTOMATIC updated_at TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. AUTHORIZED ADMIN ACCOUNTS TABLE & HELPER FUNCTION (Section 10)
-- Only users listed in public.admin_users with is_active = true can manage content.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trg_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper function used by Row Level Security policies across all tables and storage
CREATE OR REPLACE FUNCTION public.is_authorized_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;

-- ============================================================================
-- 3. GAMING CATEGORIES TABLE (Section 8)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL DEFAULT '01',
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  full_name TEXT,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT 'assets/cat-bussid.svg',
  image_alt TEXT NOT NULL DEFAULT '',
  playlist_title TEXT NOT NULL DEFAULT '',
  playlist_url TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 1,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_visible_order
  ON public.categories (is_visible, display_order ASC);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. VIDEOS TABLE (Section 5)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.videos (
  id TEXT PRIMARY KEY,
  youtube_url TEXT NOT NULL CHECK (youtube_url ~* '^https?://(www\.|m\.)?(youtube\.com|youtu\.be)/'),
  youtube_id TEXT NOT NULL CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url TEXT NOT NULL,
  thumbnail_source TEXT NOT NULL DEFAULT 'youtube' CHECK (thumbnail_source IN ('youtube', 'custom', 'library')),
  thumbnail_alt TEXT NOT NULL DEFAULT '',
  object_fit TEXT NOT NULL DEFAULT 'cover' CHECK (object_fit IN ('cover', 'contain', 'fill')),
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  display_order INTEGER NOT NULL DEFAULT 1,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  featured_order INTEGER NOT NULL DEFAULT 1,
  is_new BOOLEAN NOT NULL DEFAULT false,
  published_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_status_order
  ON public.videos (status, display_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_videos_featured
  ON public.videos (status, is_featured, featured_order ASC);

CREATE INDEX IF NOT EXISTS idx_videos_category
  ON public.videos (category_id, status);

DROP TRIGGER IF EXISTS trg_videos_updated_at ON public.videos;
CREATE TRIGGER trg_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. THUMBNAILS STUDIO LIBRARY TABLE (Section 6)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.thumbnails (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  url TEXT NOT NULL CHECK (char_length(trim(url)) > 0),
  alt_text TEXT NOT NULL DEFAULT '',
  object_fit TEXT NOT NULL DEFAULT 'cover' CHECK (object_fit IN ('cover', 'contain', 'fill')),
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_thumbnails_updated_at ON public.thumbnails;
CREATE TRIGGER trg_thumbnails_updated_at
BEFORE UPDATE ON public.thumbnails
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. HOMEPAGE SETTINGS TABLE (Section 7)
-- Singleton row (id = 1). Stores published_data for public site & draft_data for admin.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.homepage_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  published_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_homepage_settings_updated_at ON public.homepage_settings;
CREATE TRIGGER trg_homepage_settings_updated_at
BEFORE UPDATE ON public.homepage_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 7. ANNOUNCEMENTS & CREATOR UPDATES TABLE (Section 9)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  tag TEXT NOT NULL DEFAULT 'UPDATE',
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
  image_url TEXT NOT NULL DEFAULT '',
  image_alt TEXT NOT NULL DEFAULT '',
  display_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_status_date
  ON public.announcements (status, display_date DESC, created_at DESC);

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 8. SOCIAL LINKS & CONTACT DIRECTORY TABLE (Section 3I)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_links (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (char_length(trim(platform)) > 0),
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_links_enabled_order
  ON public.social_links (is_enabled, display_order ASC);

DROP TRIGGER IF EXISTS trg_social_links_updated_at ON public.social_links;
CREATE TRIGGER trg_social_links_updated_at
BEFORE UPDATE ON public.social_links
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES (Section 10 & 11)
-- Public visitors can ONLY read published/visible records.
-- Unpublished drafts are NEVER exposed to public visitors.
-- Only explicitly authorized admins can INSERT, UPDATE, DELETE, or read drafts.
-- ============================================================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thumbnails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

-- 9.1 admin_users policies
DROP POLICY IF EXISTS "Admins can view own admin record" ON public.admin_users;
CREATE POLICY "Admins can view own admin record"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND is_active = true);

-- 9.2 categories policies
DROP POLICY IF EXISTS "Public can read visible categories only" ON public.categories;
CREATE POLICY "Public can read visible categories only"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (is_visible = true OR public.is_authorized_admin());

DROP POLICY IF EXISTS "Authorized admins can insert categories" ON public.categories;
CREATE POLICY "Authorized admins can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_admin());

DROP POLICY IF EXISTS "Authorized admins can update categories" ON public.categories;
CREATE POLICY "Authorized admins can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.is_authorized_admin())
  WITH CHECK (public.is_authorized_admin());

DROP POLICY IF EXISTS "Authorized admins can delete categories" ON public.categories;
CREATE POLICY "Authorized admins can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.is_authorized_admin());

-- 9.3 videos policies (Drafts are strictly hidden from public queries!)
DROP POLICY IF EXISTS "Public can read published videos only" ON public.videos;
CREATE POLICY "Public can read published videos only"
  ON public.videos FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR public.is_authorized_admin());

DROP POLICY IF EXISTS "Authorized admins can insert videos" ON public.videos;
CREATE POLICY "Authorized admins can insert videos"
  ON public.videos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_admin());

DROP POLICY IF EXISTS "Authorized admins can update videos" ON public.videos;
CREATE POLICY "Authorized admins can update videos"
  ON public.videos FOR UPDATE
  TO authenticated
  USING (public.is_authorized_admin())
  WITH CHECK (public.is_authorized_admin());

DROP POLICY IF EXISTS "Authorized admins can delete videos" ON public.videos;
CREATE POLICY "Authorized admins can delete videos"
  ON public.videos FOR DELETE
  TO authenticated
  USING (public.is_authorized_admin());

-- 9.4 thumbnails policies (Admin Studio library)
DROP POLICY IF EXISTS "Authorized admins manage thumbnail studio" ON public.thumbnails;
CREATE POLICY "Authorized admins manage thumbnail studio"
  ON public.thumbnails FOR ALL
  TO authenticated
  USING (public.is_authorized_admin())
  WITH CHECK (public.is_authorized_admin());

-- 9.5 homepage_settings policies
DROP POLICY IF EXISTS "Public can read homepage settings" ON public.homepage_settings;
CREATE POLICY "Public can read homepage settings"
  ON public.homepage_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authorized admins can update homepage settings" ON public.homepage_settings;
CREATE POLICY "Authorized admins can update homepage settings"
  ON public.homepage_settings FOR ALL
  TO authenticated
  USING (public.is_authorized_admin())
  WITH CHECK (public.is_authorized_admin());

-- 9.6 announcements policies (Draft announcements hidden from public!)
DROP POLICY IF EXISTS "Public can read published announcements only" ON public.announcements;
CREATE POLICY "Public can read published announcements only"
  ON public.announcements FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR public.is_authorized_admin());

DROP POLICY IF EXISTS "Authorized admins manage announcements" ON public.announcements;
CREATE POLICY "Authorized admins manage announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.is_authorized_admin())
  WITH CHECK (public.is_authorized_admin());

-- 9.7 social_links policies (Disabled or empty links hidden from public!)
DROP POLICY IF EXISTS "Public can read enabled social links only" ON public.social_links;
CREATE POLICY "Public can read enabled social links only"
  ON public.social_links FOR SELECT
  TO anon, authenticated
  USING ((is_enabled = true AND char_length(trim(url)) > 0) OR public.is_authorized_admin());

DROP POLICY IF EXISTS "Authorized admins manage social links" ON public.social_links;
CREATE POLICY "Authorized admins manage social links"
  ON public.social_links FOR ALL
  TO authenticated
  USING (public.is_authorized_admin())
  WITH CHECK (public.is_authorized_admin());

-- ============================================================================
-- 10. SUPABASE STORAGE BUCKET & ACCESS POLICIES (Section 6 & 11)
-- Bucket: website-media (Max 5 MB, images only, public read, admin-only write)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-media',
  'website-media',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

DROP POLICY IF EXISTS "Public can view website media images" ON storage.objects;
CREATE POLICY "Public can view website media images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'website-media');

DROP POLICY IF EXISTS "Authorized admins can upload website media" ON storage.objects;
CREATE POLICY "Authorized admins can upload website media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'website-media' AND public.is_authorized_admin());

DROP POLICY IF EXISTS "Authorized admins can update website media" ON storage.objects;
CREATE POLICY "Authorized admins can update website media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'website-media' AND public.is_authorized_admin())
  WITH CHECK (bucket_id = 'website-media' AND public.is_authorized_admin());

DROP POLICY IF EXISTS "Authorized admins can delete website media" ON storage.objects;
CREATE POLICY "Authorized admins can delete website media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'website-media' AND public.is_authorized_admin());

-- ============================================================================
-- 11. INITIAL SEED DATA (Categories, Homepage Settings, Official YouTube Link)
-- ============================================================================
INSERT INTO public.categories (id, slug, code, title, full_name, description, image_url, image_alt, playlist_title, playlist_url, display_order, is_visible)
VALUES
  ('cat-bussid', 'bussid', '01', 'BUSSID', 'Bus Simulator Indonesia', 'Bus journeys, passenger stories, travel adventures and challenges.', 'assets/cat-bussid.svg', 'BUSSID Highway Expedition Illustration', 'BUSSID Expeditions & Stories', '', 1, true),
  ('cat-cpm', 'car-parking-multiplayer', '02', 'Car Parking Multiplayer', 'CPM Builds & Driving', 'Car builds, driving challenges, progression and cinematic gameplay.', 'assets/cat-cpm.svg', 'Car Parking Multiplayer Custom Coupe Illustration', 'CPM Builds & Progression', '', 2, true),
  ('cat-challenges', 'gaming-challenges', '03', 'Gaming Challenges', 'Missions & Experiments', 'Difficult missions, experiments and unique goals.', 'assets/cat-challenges.svg', 'Gaming Challenges Precision Timer Illustration', 'High-Stakes Gaming Challenges', '', 3, true),
  ('cat-stories', 'gaming-stories', '04', 'Gaming Stories', 'Cinematic Vlogs & Lore', 'Vlog-style storytelling and immersive gaming adventures.', 'assets/cat-stories.svg', 'Gaming Stories Three-Act Storyboard Illustration', 'Virtual Vlogs & Narrative Series', '', 4, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.social_links (id, platform, label, url, is_enabled, display_order)
VALUES
  ('soc-youtube', 'YouTube', 'YouTube Channel (@playmasterra)', 'https://youtube.com/@playmasterra', true, 1),
  ('soc-instagram', 'Instagram', 'Instagram', '', false, 2),
  ('soc-x', 'X (Twitter)', 'X / Twitter', '', false, 3),
  ('soc-discord', 'Discord', 'Discord Community', '', false, 4),
  ('soc-email', 'Email', 'Business / Creator Contact Email', '', false, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.announcements (id, tag, title, description, display_date, status)
VALUES
  ('ann-welcome', 'WEBSITE LAUNCH', 'Official PLAYMASTER RA Creator Website & Video Archive Is Live', 'Welcome to the new editorial home of PLAYMASTER RA. Explore curated categories for BUSSID, Car Parking Multiplayer, Gaming Challenges, and Gaming Stories.', CURRENT_DATE, 'published')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. HOW TO AUTHORIZE YOUR FIRST ADMIN ACCOUNT (Run after creating user in Auth)
-- ============================================================================
-- Replace 'your-admin-email@example.com' with the email you created in Supabase Auth -> Users:
--
-- INSERT INTO public.admin_users (user_id, email, role, is_active)
-- SELECT id, email, 'owner', true
-- FROM auth.users
-- WHERE email = 'your-admin-email@example.com'
-- ON CONFLICT (user_id) DO UPDATE SET is_active = true;
