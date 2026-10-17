import { NextResponse } from 'next/server';
import { tx } from '../../../lib/db';
import { guard, bad } from '../../../lib/auth';
const log = (c, uid, a, t, d) => c.query('insert into audit_logs(user_id,action,target_entity,details) values($1,$2,$3,$4)', [uid, a, t, d]);
export async function POST(req) {
  const [u, e] = await guard(['admin', 'operator']); if (e) return e;
  const d = await req.json().catch(() => ({}));
  try {
    const r = await tx(async c => {
      const { rows: [t] } = await c.query('select * from tools where unique_id=$1 and active for update', [String(d.code || '').toUpperCase()]);
      if (!t) throw new Error('Ferramenta não encontrada');
      if (d.action === 'withdraw') {
        if (t.status !== 'available' || t.condition !== 'good') throw new Error('Retirada bloqueada: ferramenta emprestada, em manutenção ou danificada');
        const { rows: [m] } = await c.query('select * from employees where registration_code=$1', [String(d.registration || '')]);
        if (!m) throw new Error('Matrícula não encontrada');
        if (!m.active) throw new Error('Funcionário inativo não pode retirar ferramentas');
        const notes = String(d.notes || '').trim(); if (!notes) throw new Error('Informe a ordem de serviço ou justificativa');
        await c.query("update tools set status='loaned', holder_id=$2 where id=$1", [t.id, m.id]);
        await c.query("insert into movements(tool_id,employee_id,user_id,type,notes) values($1,$2,$3,'withdraw',$4)", [t.id, m.id, u.id, notes]);
        await log(c, u.id, 'RETIRADA', t.unique_id, `${m.full_name} · ${notes}`);
        return { ok: `Retirada registrada: ${t.unique_id} com ${m.full_name}` };
      }
      if (d.action === 'return') {
        if (t.status !== 'loaned') throw new Error('Esta ferramenta não está emprestada');
        if (!['good', 'maintenance', 'damaged'].includes(d.condition)) throw new Error('Informe a condição da devolução');
        await c.query('update tools set condition=$2, status=$3, holder_id=null where id=$1', [t.id, d.condition, d.condition === 'good' ? 'available' : 'maintenance']);
        await c.query("insert into movements(tool_id,employee_id,user_id,type,condition_return) values($1,$2,$3,'return',$4)", [t.id, t.holder_id, u.id, d.condition]);
        await log(c, u.id, 'DEVOLUÇÃO', t.unique_id, d.condition);
        return { ok: `Devolução registrada: ${t.unique_id}` };
      }
      throw new Error('Ação inválida');
    });
    return NextResponse.json(r);
  } catch (x) { return bad(x.message, 409); }
}
