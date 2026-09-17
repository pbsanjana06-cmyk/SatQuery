-- SatQuery AI database schema for Supabase PostgreSQL
-- This migration creates the required tables, indexes, RLS, and starter policies.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  avatar_url text,
  organization text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  image_type text not null check (image_type in ('optical','sar','before','after','multispectral')),
  file_size bigint not null default 0,
  mime_type text,
  width integer,
  height integer,
  latitude double precision,
  longitude double precision,
  acquisition_date timestamptz,
  sensor text,
  created_at timestamptz not null default now()
);

create table if not exists public.location_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters double precision,
  captured_at timestamptz not null default now()
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_name text not null,
  analysis_type text not null check (analysis_type in ('single_image','change_detection','optical_sar','object_detection','land_cover','disaster','agriculture','urban_growth')),
  query text not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  confidence_score double precision not null default 0,
  reliability_score double precision not null default 0,
  summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.analysis_images (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  image_id uuid not null references public.images(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_questions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text,
  confidence_score double precision not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_results (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  summary text,
  detailed_explanation text,
  confidence_score double precision not null default 0,
  reliability_score double precision not null default 0,
  detected_objects jsonb,
  detected_changes jsonb,
  land_cover_result jsonb,
  area_measurements jsonb,
  recommendations jsonb,
  evidence_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.detected_objects (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  object_type text not null,
  label text not null,
  confidence double precision not null default 0,
  x double precision,
  y double precision,
  width double precision,
  height double precision,
  area double precision,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  step_name text not null,
  step_order integer not null,
  status text not null default 'pending' check (status in ('pending','active','done','failed')),
  description text,
  duration_ms integer default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.nearby_issue_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius integer not null check (radius in (500, 1000, 2000, 5000, 10000)),
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.detected_issues (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.nearby_issue_analyses(id) on delete cascade,
  issue_type text not null,
  category text not null,
  severity text not null check (severity in ('LOW','MEDIUM','HIGH')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  distance_meters double precision not null,
  area double precision,
  description text not null,
  confidence double precision,
  reliability text not null,
  evidence_id text,
  detected_at timestamptz not null default now(),
  reference_date timestamptz
);

create table if not exists public.location_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_status text not null check (permission_status in ('granted','denied','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_images_user_id on public.images(user_id);
create index if not exists idx_images_image_type on public.images(image_type);
create index if not exists idx_location_events_user_captured_at on public.location_events(user_id, captured_at desc);
create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analysis_images_analysis_id on public.analysis_images(analysis_id);
create index if not exists idx_agent_steps_analysis_id on public.agent_steps(analysis_id);
create index if not exists idx_reports_user_id on public.reports(user_id);
create index if not exists idx_nearby_issue_analyses_user_id on public.nearby_issue_analyses(user_id);
create index if not exists idx_detected_issues_analysis_id on public.detected_issues(analysis_id);
create index if not exists idx_location_permissions_user_id on public.location_permissions(user_id);

alter table public.profiles enable row level security;
alter table public.images enable row level security;
alter table public.location_events enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_images enable row level security;
alter table public.analysis_questions enable row level security;
alter table public.ai_results enable row level security;
alter table public.detected_objects enable row level security;
alter table public.agent_steps enable row level security;
alter table public.reports enable row level security;
alter table public.nearby_issue_analyses enable row level security;
alter table public.detected_issues enable row level security;
alter table public.location_permissions enable row level security;

create policy "Profiles are viewable by owner"
on public.profiles for select using (auth.uid() = user_id);
create policy "Profiles are insertable by owner"
on public.profiles for insert with check (auth.uid() = user_id);
create policy "Profiles are updatable by owner"
on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Profiles are deletable by owner"
on public.profiles for delete using (auth.uid() = user_id);

create policy "Images are viewable by owner"
on public.images for select using (auth.uid() = user_id);
create policy "Images are insertable by owner"
on public.images for insert with check (auth.uid() = user_id);
create policy "Images are updatable by owner"
on public.images for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Images are deletable by owner"
on public.images for delete using (auth.uid() = user_id);

create policy "Location events are viewable by owner"
on public.location_events for select using (auth.uid() = user_id);
create policy "Location events are insertable by owner"
on public.location_events for insert with check (auth.uid() = user_id);
create policy "Location events are deletable by owner"
on public.location_events for delete using (auth.uid() = user_id);

create policy "Analyses are viewable by owner"
on public.analyses for select using (auth.uid() = user_id);
create policy "Analyses are insertable by owner"
on public.analyses for insert with check (auth.uid() = user_id);
create policy "Analyses are updatable by owner"
on public.analyses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Analyses are deletable by owner"
on public.analyses for delete using (auth.uid() = user_id);

create policy "Analysis images are viewable by owner"
on public.analysis_images for select using (
  exists (
    select 1 from public.analyses a where a.id = analysis_images.analysis_id and a.user_id = auth.uid()
  )
);
create policy "Analysis images are insertable by owner"
on public.analysis_images for insert with check (
  exists (
    select 1 from public.analyses a where a.id = analysis_images.analysis_id and a.user_id = auth.uid()
  )
);
create policy "Analysis images are updatable by owner"
on public.analysis_images for update using (
  exists (
    select 1 from public.analyses a where a.id = analysis_images.analysis_id and a.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.analyses a where a.id = analysis_images.analysis_id and a.user_id = auth.uid()
  )
);

create policy "Analysis questions are viewable by owner"
on public.analysis_questions for select using (auth.uid() = user_id);
create policy "Analysis questions are insertable by owner"
on public.analysis_questions for insert with check (auth.uid() = user_id);
create policy "Analysis questions are updatable by owner"
on public.analysis_questions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "AI results are viewable by owner"
on public.ai_results for select using (
  exists (
    select 1 from public.analyses a where a.id = ai_results.analysis_id and a.user_id = auth.uid()
  )
);
create policy "AI results are insertable by owner"
on public.ai_results for insert with check (
  exists (
    select 1 from public.analyses a where a.id = ai_results.analysis_id and a.user_id = auth.uid()
  )
);

create policy "Detected objects are viewable by owner"
on public.detected_objects for select using (
  exists (
    select 1 from public.analyses a where a.id = detected_objects.analysis_id and a.user_id = auth.uid()
  )
);
create policy "Detected objects are insertable by owner"
on public.detected_objects for insert with check (
  exists (
    select 1 from public.analyses a where a.id = detected_objects.analysis_id and a.user_id = auth.uid()
  )
);

create policy "Agent steps are viewable by owner"
on public.agent_steps for select using (
  exists (
    select 1 from public.analyses a where a.id = agent_steps.analysis_id and a.user_id = auth.uid()
  )
);
create policy "Agent steps are insertable by owner"
on public.agent_steps for insert with check (
  exists (
    select 1 from public.analyses a where a.id = agent_steps.analysis_id and a.user_id = auth.uid()
  )
);

create policy "Reports are viewable by owner"
on public.reports for select using (auth.uid() = user_id);
create policy "Reports are insertable by owner"
on public.reports for insert with check (auth.uid() = user_id);
create policy "Reports are updatable by owner"
on public.reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Reports are deletable by owner"
on public.reports for delete using (auth.uid() = user_id);

create policy "Nearby analyses are viewable by owner"
on public.nearby_issue_analyses for select using (auth.uid() = user_id);
create policy "Nearby analyses are insertable by owner"
on public.nearby_issue_analyses for insert with check (auth.uid() = user_id);
create policy "Nearby analyses are updatable by owner"
on public.nearby_issue_analyses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Nearby analyses are deletable by owner"
on public.nearby_issue_analyses for delete using (auth.uid() = user_id);

create policy "Detected issues are viewable by owner"
on public.detected_issues for select using (
  exists (select 1 from public.nearby_issue_analyses a where a.id = detected_issues.analysis_id and a.user_id = auth.uid())
);
create policy "Detected issues are insertable by owner"
on public.detected_issues for insert with check (
  exists (select 1 from public.nearby_issue_analyses a where a.id = detected_issues.analysis_id and a.user_id = auth.uid())
);
create policy "Detected issues are deletable by owner"
on public.detected_issues for delete using (
  exists (select 1 from public.nearby_issue_analyses a where a.id = detected_issues.analysis_id and a.user_id = auth.uid())
);

create policy "Location permissions are viewable by owner"
on public.location_permissions for select using (auth.uid() = user_id);
create policy "Location permissions are insertable by owner"
on public.location_permissions for insert with check (auth.uid() = user_id);
create policy "Location permissions are updatable by owner"
on public.location_permissions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Location permissions are deletable by owner"
on public.location_permissions for delete using (auth.uid() = user_id);
