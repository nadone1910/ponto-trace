import { NextResponse } from 'next/server';
import { tx } from '../../../lib/db';
import { guard, bad } from '../../../lib/auth';
// Criar, editar e inativar ferramentas, caixas e funcionários (somente admin). Nada é excluído.
const T = {
  tool: { table: 'tools', f: ['name', 'category', 'brand', 'model', 'condition', 'box_id'], req: ['name', 'category', 'condition', 'box_id'], key: 'unique_id', lbl: 'FERRAMENTA' },
  box: { table: 'boxes', f: ['code', 'name', 'description', 'location'], req: ['code', 'name'], key: 'code', lbl: 'CAIXA' },
  employee: { table: 'employees', f: ['registration_code', 'full_name', 'department', 'role'], req: ['registration_code', 'full_name'], key: 'registration_code', lbl: 'FUNCIONÁRIO' },
};
export async function POST(req) {
  const [u, e] = await guard(['admin']); if (e) return e;
  const d = await req.json().catch(() => ({})); const k = T[d.kind]; if (!k) return bad('Tipo inválido');
  try {
    const r = await tx(async c => {
      const log = (a, t) => c.query('insert into audit_logs(user_id,action,target_entity) values($1,$2,$3)', [u.id, a, t]);
      const get = async () => { const { rows: [o] } = await c.query(`select * from ${k.table} where id=$1 for update`, [d.id]); if (!o) throw new Error('Registro não encontrado'); return o; };
      if (d.id && d.toggle) {
        const o = await get();
        if (d.kind === 'tool' && o.status === 'loaned') throw new Error('Devolva a ferramenta antes de inativar');
        await c.query(`update ${k.table} set active=not active where id=$1`, [d.id]);
        await log(o.active ? 'INATIVAR' : 'REATIVAR', o[k.key]); return { ok: 1 };
      }
      for (const f of k.req) if (!String(d[f] || '').trim()) throw new Error('Preencha todos os campos obrigatórios');
      const v = k.f.map(f => d[f] == null ? null : String(d[f]).trim());
      if (d.kind === 'box') v[0] = v[0].toUpperCase();
      if (d.id) {
        const o = await get();
        await c.query(`update ${k.table} set ${k.f.map((f, i) => `${f}=$${i + 2}`).join(',')} where id=$1`, [d.id, ...v]);
        if (d.kind === 'tool') {
          if (o.status !== 'loaned') await c.query("update tools set status=case when condition='good' then 'available' else 'maintenance' end where id=$1", [d.id]);
          if (o.box_id !== d.box_id) await c.query("insert into movements(tool_id,user_id,type,notes) values($1,$2,'transfer','Caixa alterada')", [d.id, u.id]);
        }
        await log('EDITAR ' + k.lbl, o[k.key]); return { ok: 1 };
      }
      const { rows: [n] } = await c.query(`insert into ${k.table}(${k.f.join(',')}) values(${k.f.map((_, i) => '$' + (i + 1)).join(',')}) returning *`, v);
      await log('CRIAR ' + k.lbl, n[k.key]); return { ok: 1 };
    });
    return NextResponse.json(r);
  } catch (x) { return bad(x.code === '23505' ? 'Já existe um registro com esse código' : x.message, 409); }
}
