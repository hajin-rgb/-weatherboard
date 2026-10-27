-- Supabase SQL Editor에서 실행 (교육용 가상 일정)
begin;
create table if not exists public.wx_tasks (
  id bigint generated always as identity primary key,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  region text not null check (region in ('세종', '대전', '태안', '보령')),
  kind text not null check (kind in ('야외', '고소', '실내')),
  owner text not null check (char_length(btrim(owner)) between 1 and 100),
  created_at timestamptz not null default now()
);
alter table public.wx_tasks enable row level security;
revoke all on public.wx_tasks from anon, authenticated;
grant usage on schema public to anon;
grant select on public.wx_tasks to anon;
grant insert (title, region, kind, owner) on public.wx_tasks to anon;
grant usage on sequence public.wx_tasks_id_seq to anon;
drop policy if exists wx_tasks_read on public.wx_tasks;
create policy wx_tasks_read on public.wx_tasks for select to anon using (true);
drop policy if exists wx_tasks_add on public.wx_tasks;
create policy wx_tasks_add on public.wx_tasks for insert to anon with check (true);
-- 빈 표에만 가상 일정 6건을 넣습니다. 재실행해도 중복 추가하지 않습니다.
insert into public.wx_tasks (title, region, kind, owner)
select seed.* from (values
  ('다중이용시설 안전점검', '세종', '야외', '김안전'),
  ('시민 안전체험 행사 운영', '보령', '야외', '이행사'),
  ('옥상 태양광 설비 점검', '태안', '고소', '박설비'),
  ('하천 수위계 확인', '대전', '야외', '최현장'),
  ('청사 외벽 간판 보수', '세종', '고소', '정시설'),
  ('비상연락 훈련', '대전', '실내', '한상황')
) as seed(title, region, kind, owner)
where not exists (select 1 from public.wx_tasks);
commit;
