import { NextResponse } from 'next/server';
import { getCategoryCounts } from '@/lib/server/backendData';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getCategoryCounts();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/category-counts failed', error);
    return NextResponse.json({ error: 'Failed to load category counts' }, { status: 500 });
  }
}
