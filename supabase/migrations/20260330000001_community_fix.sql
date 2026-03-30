-- comment_count 자동 업데이트 트리거
create or replace function update_comment_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set comment_count = greatest(comment_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create trigger comment_count_trigger
after insert or delete on comments
for each row execute function update_comment_count();

-- like_count 자동 업데이트 트리거
create or replace function update_like_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update posts set like_count = like_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set like_count = greatest(like_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create trigger like_count_trigger
after insert or delete on post_likes
for each row execute function update_like_count();

-- 공지사항 컬럼 추가
alter table posts add column is_notice boolean not null default false;

-- 공지사항은 관리자만 설정 가능 (update policy는 이미 is_admin() 포함)
