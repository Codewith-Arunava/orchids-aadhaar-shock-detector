import { NextResponse } from 'next/server';

const DJANGO_URL = process.env.DJANGO_URL || 'http://localhost:8001';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ state: string }> }
) {
  try {
    const { state } = await params;
    const response = await fetch(`${DJANGO_URL}/api/districts/${encodeURIComponent(state)}/`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch districts' }, { status: 500 });
  }
}
