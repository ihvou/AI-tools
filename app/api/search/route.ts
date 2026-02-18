import { NextResponse } from 'next/server';
import { searchAll } from '@/lib/server/backendData';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json({ tools: [], deals: [] });
    }
    const data = await searchAll(q);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/search failed', error);
    return NextResponse.json({ error: 'Failed to run search' }, { status: 500 });
  }
}
