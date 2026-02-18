import { NextResponse } from 'next/server';
import { createReport } from '@/lib/server/backendData';

type ReportBody = {
  reportType?: 'review' | 'deal';
  entityId?: string;
  issueType?: string;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReportBody;
    if (!body.reportType || !body.entityId || !body.issueType) {
      return NextResponse.json(
        { error: 'reportType, entityId, and issueType are required' },
        { status: 400 }
      );
    }
    if (body.reportType !== 'review' && body.reportType !== 'deal') {
      return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 });
    }

    await createReport({
      reportType: body.reportType,
      entityId: body.entityId,
      issueType: body.issueType,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/reports failed', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
