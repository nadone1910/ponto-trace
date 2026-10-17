import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { q } from './db';
const key = () => new TextEncoder().encode(process.env.JWT_SECRET);
export const sign = u => new SignJWT({ role: u.role, name: u.full_name }).setProtectedHeader({ alg: 'HS256' }).setSubject(u.id).setExpirationTime('12h').sign(key());
export const bad = (m, s = 400) => NextResponse.json({ error: m }, { status: s });
// Valida o token E confirma no banco que o usuário continua ativo e com o perfil atual.
export async function guard(roles) {
  const t = cookies().get('pt')?.value;
  if (!t) return [null, bad('Não autenticado', 401)];
  let id; try { id = (await jwtVerify(t, key())).payload.sub; } catch { return [null, bad('Sessão expirada', 401)]; }
  const [u] = await q('select id, role, full_name from users where id=$1 and active', [id]);
  if (!u) return [null, bad('Usuário inativo', 401)];
  if (!roles.includes(u.role)) return [null, bad('Sem permissão para esta ação', 403)];
  return [u, null];
}
