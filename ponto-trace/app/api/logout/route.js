import { NextResponse } from 'next/server';
export async function POST() { const r = NextResponse.json({ ok: 1 }); r.cookies.set('pt', '', { path: '/', maxAge: 0 }); return r; }
