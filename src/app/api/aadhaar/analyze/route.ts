import { NextResponse } from 'next/server';

const DJANGO_URL = process.env.DJANGO_URL || 'http://localhost:8001';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || '';
    const district = searchParams.get('district') || '';
    const updateType = searchParams.get('update_type') || 'All';
    const windowSize = searchParams.get('window_size') || '7';
    const zThreshold = searchParams.get('z_threshold') || '2.0';

    const url = `${DJANGO_URL}/api/analyze/?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&update_type=${encodeURIComponent(updateType)}&window_size=${windowSize}&z_threshold=${zThreshold}`;
    
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to analyze data' }, { status: 500 });
  }
}
