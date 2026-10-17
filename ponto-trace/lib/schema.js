export const SCHEMA = `
create table if not exists users(id uuid primary key default gen_random_uuid(), username text unique not null, password_hash text not null,
 role text not null check(role in('admin','operator','viewer')), full_name text not null, active boolean not null default true);
create table if not exists boxes(id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, description text, location text, active boolean not null default true);
create table if not exists employees(id uuid primary key default gen_random_uuid(), registration_code text unique not null, full_name text not null, department text, role text, active boolean not null default true);
create sequence if not exists tool_seq;
create table if not exists tools(id uuid primary key default gen_random_uuid(),
 unique_id text unique not null default ('FER-'||lpad(nextval('tool_seq')::text,4,'0')),
 name text not null, category text not null, brand text, model text,
 condition text not null default 'good' check(condition in('good','maintenance','damaged')),
 status text not null default 'available' check(status in('available','loaned','maintenance')),
 holder_id uuid references employees(id), box_id uuid references boxes(id), active boolean not null default true);
create table if not exists movements(id uuid primary key default gen_random_uuid(), tool_id uuid not null references tools(id),
 employee_id uuid references employees(id), user_id uuid not null references users(id),
 type text not null check(type in('withdraw','return','transfer')), condition_return text, timestamp timestamptz not null default now(), notes text);
create table if not exists audit_logs(id bigserial primary key, user_id uuid references users(id), action text not null, target_entity text, details text, timestamp timestamptz not null default now());
create or replace function forbid_change() returns trigger as $$ begin raise exception 'Registro imutável'; end $$ language plpgsql;
drop trigger if exists ro_audit on audit_logs; create trigger ro_audit before update or delete on audit_logs for each row execute function forbid_change();
drop trigger if exists ro_mov on movements; create trigger ro_mov before update or delete on movements for each row execute function forbid_change();
`;
