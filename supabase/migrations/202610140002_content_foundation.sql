begin;
-- All application writes run through authenticated server routes. Public clients
-- retain only published catalogue metadata, never answer keys or learner writes.
do $$ declare t text; begin
  foreach t in array array['users','modules','lessons','videos','course_pages','course_page_views','assessments','assessment_questions','assessment_attempts','assessment_completions','enrollments','lesson_completions','certificates','response_feedback','lesson_progress'] loop
    if to_regclass('public.'||t) is not null then
      execute format('revoke all on public.%I from anon, authenticated',t);
    end if;
  end loop;
end $$;

alter table public.courses add column archived_at timestamptz;
alter table public.courses add column language_code text not null default 'en';
alter table public.courses add column difficulty text not null default 'introductory' check (difficulty in ('introductory','intermediate','advanced'));
alter table public.courses add column learning_objectives text[] not null default '{}';
alter table public.courses add constraint courses_price_valid check (price_cents >= 0 and (not is_public or price_cents=0));
alter table public.courses add constraint courses_currency_valid check (currency ~ '^[a-z]{3}$');
alter table public.courses add constraint courses_archive_valid check (archived_at is null or not is_published);
alter table public.courses add constraint courses_title_valid check (length(btrim(title))>0);
alter table public.modules add constraint modules_id_course_unique unique(id,course_id);
alter table public.modules add constraint modules_position_valid check(position>=0);
alter table public.lessons add constraint lessons_id_course_unique unique(id,course_id);
alter table public.assessments add constraint assessments_id_course_unique unique(id,course_id);
alter table public.lesson_completions add constraint completion_lesson_course_fk foreign key(lesson_id,course_id) references public.lessons(id,course_id) on delete cascade;
alter table public.assessment_completions add constraint completion_assessment_course_fk foreign key(assessment_id,course_id) references public.assessments(id,course_id) on delete cascade;
alter table public.assessment_completions add constraint completion_score_valid check(score between 0 and 100);
alter table public.assessment_attempts alter column score drop not null;
alter table public.assessment_attempts add column question_snapshot jsonb not null default '[]';
alter table public.assessment_attempts add column grading_snapshot jsonb not null default '{}';
alter table public.assessment_questions add column updated_at timestamptz not null default now();
create trigger set_updated_at before update on public.assessment_questions for each row execute function public.set_updated_at();
alter table public.assessments add constraint practice_not_graded check(assessment_type <> 'practice' or not is_graded);
alter table public.certificates add column completion_snapshot jsonb not null default '{}';
alter table public.certificates add column revoked_at timestamptz;

-- A registry unifies navigation, metadata, revisions and assets while preserving
-- the existing lesson/page/assessment APIs. Subtype triggers maintain its mirrors.
create table public.course_items (
  id uuid primary key,
  course_id uuid not null references public.courses on delete cascade,
  module_id uuid,
  kind text not null check(kind in ('lesson','page','assessment')),
  lesson_id uuid unique references public.lessons on delete cascade,
  page_id uuid unique references public.course_pages on delete cascade,
  assessment_id uuid unique references public.assessments on delete cascade,
  title text not null check(length(btrim(title))>0),
  slug text,
  position integer not null check(position>=0),
  placement text not null check(placement in ('introduction','body','conclusion')),
  is_required boolean not null,
  estimated_minutes integer check(estimated_minutes>0),
  activity_type text not null check(activity_type in ('explanation','tutorial','lab','reference','reflection','assessment')),
  status text not null check(status in ('draft','published','archived')),
  version integer not null default 1,
  published_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(module_id,course_id) references public.modules(id,course_id),
  unique(course_id,kind,slug),
  constraint item_source_valid check (
    (kind='lesson' and lesson_id=id and page_id is null and assessment_id is null) or
    (kind='page' and page_id=id and lesson_id is null and assessment_id is null) or
    (kind='assessment' and assessment_id=id and page_id is null and lesson_id is null)
  )
);
create index course_items_sequence on public.course_items(course_id,module_id,placement,position,id);

do $$ declare t text; begin
  foreach t in array array['lessons','course_pages','assessments'] loop
    execute format('alter table public.%I add column is_required boolean not null default %s',t,case when t='course_pages' then 'false' else 'true' end);
    execute format('alter table public.%I add column estimated_minutes integer check(estimated_minutes>0)',t);
    execute format('alter table public.%I add column activity_type text not null default %L check(activity_type in (''explanation'',''tutorial'',''lab'',''reference'',''reflection'',''assessment''))',t,case when t='assessments' then 'assessment' when t='course_pages' then 'reference' else 'explanation' end);
    execute format('alter table public.%I add column placement text check(placement in (''introduction'',''body'',''conclusion''))',t);
    execute format('alter table public.%I add column archived_at timestamptz',t);
    execute format('alter table public.%I add constraint %I check(archived_at is null or not is_published)',t,t||'_archive_valid');
    execute format('alter table public.%I add constraint %I foreign key(module_id,course_id) references public.modules(id,course_id)',t,t||'_module_course_fk');
    execute format('alter table public.%I add constraint %I check(position>=0 and length(btrim(title))>0)',t,t||'_values_valid');
    execute format('create unique index %I on public.%I(course_id,slug) where slug is not null',t||'_slug_unique',t);
  end loop;
end $$;

create function public.prepare_course_item() returns trigger language plpgsql set search_path=public as $$
begin
  if new.placement is null then
    new.placement := case when tg_table_name='course_pages' and new.module_id is null then
      case when to_jsonb(new)->>'page_type' in ('overview','introduction','syllabus','requirements') then 'introduction' else 'conclusion' end
      else 'body' end;
  end if;
  if new.module_id is not null then new.placement := 'body'; end if;
  if tg_op='INSERT' then
    -- Serialize appends to prevent overlapping positions across content kinds.
    perform pg_advisory_xact_lock(hashtextextended(new.course_id::text,0));
    select coalesce(max(position),-1)+1 into new.position from public.course_items
      where course_id=new.course_id and module_id is not distinct from new.module_id and placement=new.placement;
  end if;
  return new;
end $$;
create function public.sync_course_item() returns trigger language plpgsql set search_path=public as $$
declare k text := case tg_table_name when 'lessons' then 'lesson' when 'course_pages' then 'page' else 'assessment' end;
begin
  insert into public.course_items(id,course_id,module_id,kind,lesson_id,page_id,assessment_id,title,slug,position,placement,is_required,estimated_minutes,activity_type,status)
  values(new.id,new.course_id,new.module_id,k,case when k='lesson' then new.id end,case when k='page' then new.id end,case when k='assessment' then new.id end,new.title,new.slug,new.position,new.placement,new.is_required,new.estimated_minutes,new.activity_type,case when new.archived_at is not null then 'archived' when new.is_published then 'published' else 'draft' end)
  on conflict(id) do update set module_id=excluded.module_id,title=excluded.title,slug=excluded.slug,position=excluded.position,placement=excluded.placement,is_required=excluded.is_required,estimated_minutes=excluded.estimated_minutes,activity_type=excluded.activity_type,status=excluded.status,updated_at=now();
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['lessons','course_pages','assessments'] loop
    execute format('create trigger prepare_item before insert or update on public.%I for each row execute function public.prepare_course_item()',t);
    execute format('create trigger sync_item after insert or update on public.%I for each row execute function public.sync_course_item()',t);
    execute format('update public.%I set placement=null',t);
  end loop;
end $$;

create table public.taxonomy_terms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('category','topic','tool')),
  name text not null check(length(btrim(name))>0),
  slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  unique(kind,slug)
);
create table public.course_terms (
  course_id uuid not null references public.courses on delete cascade,
  term_id uuid not null references public.taxonomy_terms on delete cascade,
  primary key(course_id,term_id)
);
create table public.item_terms (
  item_id uuid not null references public.course_items on delete cascade,
  term_id uuid not null references public.taxonomy_terms on delete cascade,
  primary key(item_id,term_id)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users on delete restrict,
  title text not null,
  original_filename text,
  mime_type text,
  byte_size bigint check(byte_size>=0),
  bucket text,
  object_path text,
  external_url text,
  alt_text text,
  attribution jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bucket,object_path),
  check((bucket is not null and object_path is not null and external_url is null) or (bucket is null and object_path is null and external_url ~ '^https://'))
);
create table public.item_assets (
  item_id uuid not null references public.course_items on delete cascade,
  asset_id uuid not null references public.assets on delete restrict,
  purpose text not null default 'download' check(purpose in ('image','slides','download','starter','example','transcript','video')),
  primary key(item_id,asset_id,purpose)
);
create table public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.course_items on delete cascade,
  version integer not null,
  author_id uuid references public.users on delete set null,
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  created_at timestamptz not null default now(),
  unique(item_id,version)
);
create table public.content_drafts (
  item_id uuid primary key references public.course_items on delete cascade,
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  updated_by uuid references public.users on delete set null,
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.assets for each row execute function public.set_updated_at();

-- Trusted-server RPC: locks a single item and rejects stale editor tabs. Drafts
-- do not alter the legacy published record consumed by learner pages.
create function public.save_content(p_item uuid,p_author uuid,p_expected_version integer,p_patch jsonb,p_action text default 'draft') returns jsonb
language plpgsql security invoker set search_path=public as $$
declare i public.course_items; target_table text; old_data jsonb; next_data jsonb; cols text; projection text; next_version integer;
begin
  select * into strict i from public.course_items where id=p_item for update;
  if not exists(select 1 from public.courses c join public.users u on u.id=p_author where c.id=i.course_id and (u.role='admin' or (u.role='instructor' and c.instructor_id=u.id))) then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_expected_version is distinct from i.version then raise exception 'This item changed in another tab. Reload before saving.' using errcode='40001'; end if;
  if p_action not in ('draft','publish','unpublish','restore') then raise exception 'Invalid action'; end if;
  if p_patch ?| array['id','course_id','created_at','updated_at','archived_at','is_published','position'] then raise exception 'Protected fields cannot be edited here'; end if;
  target_table := case i.kind when 'lesson' then 'lessons' when 'page' then 'course_pages' else 'assessments' end;
  execute format('select to_jsonb(t) from public.%I t where id=$1',target_table) into old_data using p_item;
  select coalesce(snapshot,old_data) into next_data from public.content_drafts where item_id=p_item;
  next_data := coalesce(next_data,old_data)||p_patch;
  insert into public.content_revisions(item_id,version,author_id,snapshot) values(p_item,i.version,p_author,old_data) on conflict(item_id,version) do nothing;
  next_version := i.version+1;
  insert into public.content_revisions(item_id,version,author_id,snapshot) values(p_item,next_version,p_author,next_data);
  if p_action in ('publish','unpublish') then
    next_data := next_data || jsonb_build_object('is_published',p_action='publish');
    select string_agg(quote_ident(column_name),','),string_agg('r.'||quote_ident(column_name),',') into cols,projection
      from information_schema.columns where table_schema='public' and information_schema.columns.table_name=target_table
      and column_name not in ('id','course_id','created_at','updated_at','position','archived_at');
    execute format('update public.%I set (%s)=(select %s from jsonb_populate_record(null::public.%I,$1) r) where id=$2',target_table,cols,projection,target_table) using next_data,p_item;
    delete from public.content_drafts where item_id=p_item;
  else
    insert into public.content_drafts(item_id,snapshot,updated_by) values(p_item,next_data,p_author)
      on conflict(item_id) do update set snapshot=excluded.snapshot,updated_by=p_author,updated_at=now();
    -- New unpublished items remain visible and editable in the existing editor.
  end if;
  update public.course_items set version=next_version,published_version=case when p_action='publish' then next_version else published_version end,updated_at=now() where id=p_item;
  insert into public.item_assets(item_id,asset_id,purpose)
    select p_item,a.id,case when a.mime_type like 'image/%' then 'image' else 'slides' end from public.assets a
    where a.object_path is not null and position(a.object_path in next_data::text)>0
    on conflict do nothing;
  return jsonb_build_object('ok',true,'version',next_version);
end $$;

-- Strict server-only access for new tables and RPCs. Account records/roles unchanged.
do $$ declare t text; begin
  foreach t in array array['course_items','taxonomy_terms','course_terms','item_terms','assets','item_assets','content_revisions','content_drafts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;
revoke all on function public.save_content(uuid,uuid,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_content(uuid,uuid,integer,jsonb,text) to service_role;
commit;

