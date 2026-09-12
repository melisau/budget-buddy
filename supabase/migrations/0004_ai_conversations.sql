alter table public.ai_sessions add column if not exists conversation_id text;
update public.ai_sessions set conversation_id = id::text where conversation_id is null;
alter table public.ai_sessions alter column conversation_id set not null;
create index if not exists ai_sessions_user_conversation_idx on public.ai_sessions(user_id, conversation_id, created_at desc);
