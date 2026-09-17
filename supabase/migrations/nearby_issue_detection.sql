-- Apply this migration after the base SatQuery schema.
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

create index if not exists idx_nearby_issue_analyses_user_id on public.nearby_issue_analyses(user_id);
create index if not exists idx_detected_issues_analysis_id on public.detected_issues(analysis_id);
create index if not exists idx_location_permissions_user_id on public.location_permissions(user_id);

alter table public.nearby_issue_analyses enable row level security;
alter table public.detected_issues enable row level security;
alter table public.location_permissions enable row level security;

drop policy if exists "Nearby analyses are viewable by owner" on public.nearby_issue_analyses;
drop policy if exists "Nearby analyses are insertable by owner" on public.nearby_issue_analyses;
drop policy if exists "Nearby analyses are updatable by owner" on public.nearby_issue_analyses;
drop policy if exists "Nearby analyses are deletable by owner" on public.nearby_issue_analyses;
create policy "Nearby analyses are viewable by owner" on public.nearby_issue_analyses for select using (auth.uid() = user_id);
create policy "Nearby analyses are insertable by owner" on public.nearby_issue_analyses for insert with check (auth.uid() = user_id);
create policy "Nearby analyses are updatable by owner" on public.nearby_issue_analyses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Nearby analyses are deletable by owner" on public.nearby_issue_analyses for delete using (auth.uid() = user_id);

drop policy if exists "Detected issues are viewable by owner" on public.detected_issues;
drop policy if exists "Detected issues are insertable by owner" on public.detected_issues;
drop policy if exists "Detected issues are deletable by owner" on public.detected_issues;
create policy "Detected issues are viewable by owner" on public.detected_issues for select using (exists (select 1 from public.nearby_issue_analyses a where a.id = detected_issues.analysis_id and a.user_id = auth.uid()));
create policy "Detected issues are insertable by owner" on public.detected_issues for insert with check (exists (select 1 from public.nearby_issue_analyses a where a.id = detected_issues.analysis_id and a.user_id = auth.uid()));
create policy "Detected issues are deletable by owner" on public.detected_issues for delete using (exists (select 1 from public.nearby_issue_analyses a where a.id = detected_issues.analysis_id and a.user_id = auth.uid()));

drop policy if exists "Location permissions are viewable by owner" on public.location_permissions;
drop policy if exists "Location permissions are insertable by owner" on public.location_permissions;
drop policy if exists "Location permissions are updatable by owner" on public.location_permissions;
drop policy if exists "Location permissions are deletable by owner" on public.location_permissions;
create policy "Location permissions are viewable by owner" on public.location_permissions for select using (auth.uid() = user_id);
create policy "Location permissions are insertable by owner" on public.location_permissions for insert with check (auth.uid() = user_id);
create policy "Location permissions are updatable by owner" on public.location_permissions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Location permissions are deletable by owner" on public.location_permissions for delete using (auth.uid() = user_id);
