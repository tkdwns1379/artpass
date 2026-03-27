-- =============================================
-- 아트패스 Supabase 스키마
-- =============================================

-- profiles 테이블 (auth.users 확장)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text default 'user',
  is_premium boolean default false,
  created_at timestamptz default now()
);

-- RLS 설정
alter table profiles enable row level security;

create policy "본인 프로필 조회" on profiles for select using (auth.uid() = id);
create policy "관리자 전체 조회" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "본인 프로필 수정" on profiles for update using (auth.uid() = id);
create policy "관리자 수정" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- universities 테이블
-- =============================================
create table universities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  department text not null,
  region text,
  admission_types text[],
  application_period text,
  has_practice boolean default true,
  practice_subjects text[],
  recruit_count text,
  suneung_ratio text,
  practice_ratio text,
  competition_rate text,
  note text,
  tips jsonb,
  practice_guide jsonb,
  preparation_guide jsonb,
  application_tips jsonb,
  created_at timestamptz default now()
);

-- RLS 설정 (universities는 모두 읽기 가능, 쓰기는 관리자만)
alter table universities enable row level security;

create policy "전체 조회 가능" on universities for select using (true);
create policy "관리자만 추가" on universities for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "관리자만 수정" on universities for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "관리자만 삭제" on universities for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- messages 테이블
-- =============================================
create table messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  sender_role text not null, -- 'user' | 'admin'
  content text not null,
  read_by_admin boolean default false,
  read_by_user boolean default false,
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "본인 메시지 조회" on messages for select using (auth.uid() = user_id);
create policy "관리자 전체 메시지 조회" on messages for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "본인 메시지 전송" on messages for insert with check (
  auth.uid() = user_id or
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "읽음 처리" on messages for update using (
  auth.uid() = user_id or
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- auth trigger: 회원가입 시 profiles 자동 생성
-- =============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
