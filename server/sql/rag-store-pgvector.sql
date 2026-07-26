-- BIAU Port public assistant RAG store schema template.
-- Intended for Supabase Postgres or Render Postgres with pgvector enabled.
-- This file is public-safe: no connection strings, hosts, keys, roles, or secrets.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists rag_documents (
  id text primary key,
  source_type text not null check (source_type in ('site', 'project', 'blog', 'status')),
  project_id text,
  title text not null,
  summary text not null,
  href text not null,
  tags text[] not null default '{}',
  visibility text not null default 'public' check (visibility = 'public'),
  metadata jsonb not null default '{}'::jsonb,
  content_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists rag_chunks (
  id text primary key,
  document_id text not null references rag_documents(id) on delete cascade,
  section text not null,
  text text not null,
  metadata jsonb not null default '{}'::jsonb,
  token_count integer,
  content_hash text not null,
  embedding vector,
  embedding_model text,
  embedding_dimension integer,
  embedded_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists rag_entities (
  id text primary key,
  name text not null,
  aliases text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists rag_relations (
  id bigserial primary key,
  from_entity_id text not null references rag_entities(id) on delete cascade,
  to_entity_id text not null references rag_entities(id) on delete cascade,
  relation_type text not null default 'related',
  evidence_document_ids text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (from_entity_id, to_entity_id, relation_type)
);

create table if not exists rag_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('planned', 'running', 'completed', 'failed')),
  source_name text not null,
  source_checksum text not null,
  document_count integer not null default 0,
  chunk_count integer not null default 0,
  entity_count integer not null default 0,
  relation_count integer not null default 0,
  issue_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  diagnostics jsonb not null default '{}'::jsonb
);

create table if not exists rag_eval_runs (
  id uuid primary key default gen_random_uuid(),
  eval_name text not null,
  source_checksum text not null,
  model_calls integer not null default 0,
  total_cases integer not null,
  passed_cases integer not null,
  failed_cases integer not null,
  diagnostics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rag_documents_source_type_idx on rag_documents (source_type);
create index if not exists rag_documents_project_id_idx on rag_documents (project_id) where project_id is not null;
create index if not exists rag_documents_tags_idx on rag_documents using gin (tags);
create index if not exists rag_documents_metadata_idx on rag_documents using gin (metadata);

create index if not exists rag_chunks_document_id_idx on rag_chunks (document_id);
create index if not exists rag_chunks_metadata_idx on rag_chunks using gin (metadata);
create index if not exists rag_chunks_text_search_idx on rag_chunks using gin (to_tsvector('simple', text));
create index if not exists rag_chunks_embedding_hnsw_idx on rag_chunks using hnsw (embedding vector_cosine_ops) where embedding is not null;

create index if not exists rag_entities_aliases_idx on rag_entities using gin (aliases);
create index if not exists rag_relations_from_idx on rag_relations (from_entity_id);
create index if not exists rag_relations_to_idx on rag_relations (to_entity_id);
create index if not exists rag_sync_runs_source_checksum_idx on rag_sync_runs (source_checksum);
create index if not exists rag_eval_runs_source_checksum_idx on rag_eval_runs (source_checksum);
