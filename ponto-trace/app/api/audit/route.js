import { NextResponse } from 'next/server';
import { q } from '../../../lib/db';
import { guard } from '../../../lib/auth';
const PER = 50;
const TZ = "'America/Sao_Paulo'";
// Busca na auditoria inteira (somente admin): texto, ação e período, em páginas de 50.
export async function GET(req) {
  const [, e] = await guard(['admin']); if (e) return e;
  const sp = new URL(req.url).searchParams, w = [], p = [];
  const t = (sp.get('q') || '').trim();
  if (t) { p.push('%' + t.replace(/[\\%_]/g, '\\$&') + '%'); const n = '$' + p.length;
    w.push(`(a.action ilike ${n} or a.target_entity ilike ${n} or a.details ilike ${n} or u.username ilike ${n} or u.full_name ilike ${n})`); }
  const act = sp.get('action'); if (act) { p.push(act); w.push(`a.action = $${p.length}`); }
  const d = /^\d{4}-\d{2}-\d{2}$/, from = sp.get('from') || '', to = sp.get('to') || '';
  if (d.test(from)) { p.push(from); w.push(`a."timestamp" >= ($${p.length}::date)::timestamp at time zone ${TZ}`); }
  if (d.test(to)) { p.push(to); w.push(`a."timestamp" < (($${p.length}::date)+1)::timestamp at time zone ${TZ}`); }
  const where = w.length ? 'where ' + w.join(' and ') : '';
  const from_ = 'from audit_logs a left join users u on u.id=a.user_id ' + where;
  const [{ n: total }] = await q(`select count(*)::int n ${from_}`, p);
  const pages = Math.max(1, Math.ceil(total / PER));
  const page = Math.min(Math.max(parseInt(sp.get('page')) || 1, 1), pages);
  const rows = await q(`select a.id, u.username, a.action, a.target_entity, a.details, (extract(epoch from a."timestamp")*1000)::float8 as ts ${from_} order by a.id desc limit ${PER} offset ${(page - 1) * PER}`, p);
  const actions = (await q('select distinct action from audit_logs order by action')).map(r => r.action);
  return NextResponse.json({ rows, total, page, pages, actions });
}
