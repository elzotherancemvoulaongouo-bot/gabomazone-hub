ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS friend_list_visibility text NOT NULL DEFAULT 'friends',
  ADD COLUMN IF NOT EXISTS who_can_comment text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS notif_push boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_mentions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_groups boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS muted_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS feed_algorithm text NOT NULL DEFAULT 'chronological';