import { NextResponse } from 'next/server';

const DJANGO_URL = process.env.DJANGO_URL || 'http://localhost:8001';

export async function GET() {
  try {
    const response = await fetch(`${DJANGO_URL}/api/update-types/`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch update types' }, { status: 500 });
  }
}
