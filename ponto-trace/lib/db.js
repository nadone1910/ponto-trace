import pg from 'pg';
const g = globalThis;
export const pool = g._pool || (g._pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 }));
export const q = (t, p) => pool.query(t, p).then(r => r.rows);
export async function tx(fn) {
  const c = await pool.connect();
  try { await c.query('begin'); const r = await fn(c); await c.query('commit'); return r; }
  catch (e) { await c.query('rollback'); throw e; }
  finally { c.release(); }
}
