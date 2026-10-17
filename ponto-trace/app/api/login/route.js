import { verify } from '@node-rs/argon2';
import { NextResponse } from 'next/server';
import { q } from '../../../lib/db';
import { sign, bad } from '../../../lib/auth';
export async function POST(req) {
  const { username, password } = await req.json().catch(() => ({}));
  const [u] = await q('select * from users where username=$1 and active', [String(username || '')]);
  if (!u || !(await verify(u.password_hash, String(password || '')))) return bad('Usuário ou senha incorretos', 401);
  await q("insert into audit_logs(user_id,action,target_entity) values($1,'LOGIN',$2)", [u.id, u.username]);
  const r = NextResponse.json({ id: u.id, name: u.full_name, role: u.role });
  r.cookies.set('pt', await sign(u), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 43200 });
  return r;
}
