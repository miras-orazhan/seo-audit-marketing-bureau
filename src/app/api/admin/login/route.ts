import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash, randomBytes } from 'node:crypto';

export const runtime = 'nodejs';

// Простая JWT-подобная авторизация (без внешних зависимостей)
// Токен = base64(email:timestamp:signature)
function createToken(email: string): string {
  const ts = Date.now();
  const sig = createHash('sha256').update(email + ts + (process.env.ADMIN_SECRET || 'default-secret')).digest('hex').slice(0, 16);
  return Buffer.from(`${email}:${ts}:${sig}`).toString('base64');
}

export function verifyToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email, tsStr, sig] = decoded.split(':');
    const ts = parseInt(tsStr);
    // Токен живёт 7 дней
    if (Date.now() - ts > 7 * 24 * 60 * 60 * 1000) return null;
    const expectedSig = createHash('sha256').update(email + ts + (process.env.ADMIN_SECRET || 'default-secret')).digest('hex').slice(0, 16);
    if (sig !== expectedSig) return null;
    return email;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 });
    }

    const user = await db.adminUser.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    const passwordHash = createHash('sha256').update(password).digest('hex');
    if (passwordHash !== user.passwordHash) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    const token = createToken(user.email);
    return NextResponse.json({ token, user: { email: user.email, name: user.name } });
  } catch (e) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
