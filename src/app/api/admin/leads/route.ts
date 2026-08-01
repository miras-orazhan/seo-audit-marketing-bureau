import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '../login/route';

export const runtime = 'nodejs';

export async function PUT(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!verifyToken(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  try {
    const { id, status } = await req.json();
    await db.lead.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
