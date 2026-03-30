-- =============================================
-- 커뮤니티 기능 마이그레이션
-- =============================================

-- 게시판
create table boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamptz default now()
);

-- 기본 게시판 삽입
insert into boards (name, description, display_order) values
  ('자유게시판', '자유롭게 이야기해요', 0),
  ('입시정보', '입시 관련 정보를 공유해요', 1);

-- 게시글
create table posts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  view_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 댓글
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- 좋아요
create table post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (post_id, user_id)
);

-- 신고
create table post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  comment_id uuid references comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table boards enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table post_likes enable row level security;
alter table post_reports enable row level security;

-- boards RLS
create policy "boards_read" on boards for select using (true);
create policy "boards_admin" on boards for all using (is_admin());

-- posts RLS
create policy "posts_read" on posts for select using (true);
create policy "posts_insert" on posts for insert with check (auth.uid() = user_id);
create policy "posts_update" on posts for update using (auth.uid() = user_id or is_admin());
create policy "posts_delete" on posts for delete using (auth.uid() = user_id or is_admin());

-- comments RLS
create policy "comments_read" on comments for select using (true);
create policy "comments_insert" on comments for insert with check (auth.uid() = user_id);
create policy "comments_delete" on comments for delete using (auth.uid() = user_id or is_admin());

-- post_likes RLS
create policy "likes_read" on post_likes for select using (true);
create policy "likes_insert" on post_likes for insert with check (auth.uid() = user_id);
create policy "likes_delete" on post_likes for delete using (auth.uid() = user_id);

-- post_reports RLS
create policy "reports_insert" on post_reports for insert with check (auth.uid() = reporter_id);
create policy "reports_read" on post_reports for select using (is_admin());

-- view_count increment 함수
create or replace function increment_view_count(post_id uuid)
returns void language plpgsql security definer as $$
begin
  update posts set view_count = view_count + 1 where id = post_id;
end;
$$;
