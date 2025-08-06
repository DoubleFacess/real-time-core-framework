
import { NextResponse } from 'next/server';
import Ably from 'ably';


// Support both GET (query param) and POST (body) for clientId
export async function GET(request: Request) {
  try {
    if (!process.env.ABLY_API_KEY) {
      throw new Error('Missing ABLY_API_KEY environment variable');
    }
    // Get clientId from query string, fallback to 'chat-client'
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || 'chat-client';
    const client = new Ably.Rest(process.env.ABLY_API_KEY);
    const tokenRequestData = await client.auth.createTokenRequest({ clientId });
    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error generating Ably token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    if (!process.env.ABLY_API_KEY) {
      throw new Error('Missing ABLY_API_KEY environment variable');
    }
    const body = await request.json();
    const clientId = body.clientId || 'chat-client';
    const client = new Ably.Rest(process.env.ABLY_API_KEY);
    const tokenRequestData = await client.auth.createTokenRequest({ clientId });
    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error generating Ably token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
