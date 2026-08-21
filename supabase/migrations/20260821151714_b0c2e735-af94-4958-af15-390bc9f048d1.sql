ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS as_community boolean NOT NULL DEFAULT false;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS category text;
UPDATE public.posts SET as_community = true WHERE page_id IS NOT NULL AND as_community = false;