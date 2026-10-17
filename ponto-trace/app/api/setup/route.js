import { hash } from '@node-rs/argon2';
import { NextResponse } from 'next/server';
import { q, pool } from '../../../lib/db';
import { SCHEMA } from '../../../lib/schema';
// Roda UMA vez: cria as tabelas e o usuário admin. Depois apague a variável SETUP_KEY na Vercel.
export async function GET(req) {
  const k = process.env.SETUP_KEY;
  if (!k || new URL(req.url).searchParams.get('key') !== k) return new NextResponse('Não encontrado', { status: 404 });
  await pool.query(SCHEMA);
  const p = process.env.ADMIN_PASSWORD;
  if (!(await q('select 1 from users limit 1')).length) {
    if (!p || p.length < 10) return NextResponse.json({ error: 'Defina ADMIN_PASSWORD com 10+ caracteres' }, { status: 400 });
    await q("insert into users(username,password_hash,role,full_name) values('admin',$1,'admin','Administrador')", [await hash(p)]);
  }
  return NextResponse.json({ ok: 'Banco pronto. Usuário: admin. Agora apague SETUP_KEY na Vercel.' });
}
