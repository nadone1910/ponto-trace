import { hash } from '@node-rs/argon2';
import { NextResponse } from 'next/server';
import { tx } from '../../../lib/db';
import { guard, bad } from '../../../lib/auth';
// Criar, editar, redefinir senha e inativar usuários (somente admin). Nada é excluído.
const ROLES = ['admin', 'operator', 'viewer'];
export async function POST(req) {
  const [u, e] = await guard(['admin']); if (e) return e;
  const d = await req.json().catch(() => ({}));
  try {
    const r = await tx(async c => {
      const log = (a, t) => c.query('insert into audit_logs(user_id,action,target_entity) values($1,$2,$3)', [u.id, a, t]);
      if (d.id) {
        const { rows: [o] } = await c.query('select * from users where id=$1 for update', [d.id]);
        if (!o) throw new Error('Usuário não encontrado');
        if (d.toggle) {
          if (o.id === u.id) throw new Error('Você não pode inativar o seu próprio usuário');
          await c.query('update users set active=not active where id=$1', [o.id]);
          await log(o.active ? 'INATIVAR USUÁRIO' : 'REATIVAR USUÁRIO', o.username); return { ok: 1 };
        }
        if (!ROLES.includes(d.role)) throw new Error('Perfil inválido');
        if (o.id === u.id && d.role !== 'admin') throw new Error('Você não pode tirar o seu próprio acesso de administrador');
        const name = String(d.full_name || '').trim(); if (!name) throw new Error('Informe o nome completo');
        await c.query('update users set full_name=$2, role=$3 where id=$1', [o.id, name, d.role]);
        if (d.password) {
          if (String(d.password).length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres');
          await c.query('update users set password_hash=$2 where id=$1', [o.id, await hash(String(d.password))]);
          await log('REDEFINIR SENHA', o.username);
        }
        await log('EDITAR USUÁRIO', o.username); return { ok: 1 };
      }
      const un = String(d.username || '').trim().toLowerCase(), name = String(d.full_name || '').trim();
      if (!/^[a-z0-9._-]{3,30}$/.test(un)) throw new Error('Usuário: de 3 a 30 caracteres, só letras minúsculas, números, ponto, hífen ou sublinhado');
      if (!name) throw new Error('Informe o nome completo');
      if (!ROLES.includes(d.role)) throw new Error('Perfil inválido');
      if (String(d.password || '').length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres');
      await c.query('insert into users(username,password_hash,role,full_name) values($1,$2,$3,$4)', [un, await hash(String(d.password)), d.role, name]);
      await log('CRIAR USUÁRIO', un); return { ok: 1 };
    });
    return NextResponse.json(r);
  } catch (x) { return bad(x.code === '23505' ? 'Já existe um usuário com esse nome' : x.message, 409); }
}
