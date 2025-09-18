import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Test import endpoint called');
    const body = await request.json();
    console.log('Received body:', body);

    return NextResponse.json({
      success: true,
      message: 'Test import endpoint working',
      receivedData: body
    });
  } catch (error) {
    console.error('Test import error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}