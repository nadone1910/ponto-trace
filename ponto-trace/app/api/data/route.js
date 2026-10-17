import { NextResponse } from 'next/server';
import { q } from '../../../lib/db';
import { guard } from '../../../lib/auth';
const ms = col => `(extract(epoch from ${col})*1000)::float8 as "timestamp"`;
export async function GET() {
  const [u, e] = await guard(['admin', 'operator', 'viewer']); if (e) return e;
  const [users, boxes, employees, tools, movements, audit] = await Promise.all([
    q('select id,username,full_name,role,active from users'),
    q('select * from boxes order by code'),
    q('select * from employees order by full_name'),
    q('select id,unique_id,name,category,brand,model,condition,status,holder_id as holder,box_id,active from tools order by unique_id'),
    q(`select id,tool_id,employee_id,user_id,type,condition_return,notes,${ms('m."timestamp"')} from movements m order by m."timestamp"`),
    u.role === 'admin' ? q(`select * from (select id,user_id,action,target_entity,details,${ms('a."timestamp"')} from audit_logs a order by id desc limit 500) x order by id`) : [],
  ]);
  return NextResponse.json({ me: { id: u.id, role: u.role, full_name: u.full_name }, users, boxes, employees, tools, movements, audit });
}
