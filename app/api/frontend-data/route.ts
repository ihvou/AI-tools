import { NextResponse } from 'next/server';
import { getAppData } from '@/lib/server/backendData';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getAppData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/frontend-data failed', error);
    return NextResponse.json({ error: 'Failed to load frontend data' }, { status: 500 });
  }
}
