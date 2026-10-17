import { NextResponse } from 'next/server';
import { q } from '../../../lib/db';
import { guard, bad } from '../../../lib/auth';
export async function GET() {
  const [, e] = await guard(['admin', 'operator', 'viewer']); if (e) return e;
  return NextResponse.json(await q(`select t.*, b.code box_code, m.full_name holder_name from tools t
    left join boxes b on b.id=t.box_id left join employees m on m.id=t.holder_id order by t.unique_id`));
}
export async function POST(req) {
  const [u, e] = await guard(['admin']); if (e) return e;
  const d = await req.json().catch(() => ({}));
  if (!d.name || !d.category || !d.box_id) return bad('Informe nome, categoria e caixa');
  const [t] = await q('insert into tools(name,category,brand,model,box_id) values($1,$2,$3,$4,$5) returning *', [d.name, d.category, d.brand || '', d.model || '', d.box_id]);
  await q("insert into audit_logs(user_id,action,target_entity,details) values($1,'CRIAR FERRAMENTA',$2,$3)", [u.id, t.unique_id, t.name]);
  return NextResponse.json(t, { status: 201 });
}
