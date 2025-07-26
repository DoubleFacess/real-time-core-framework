import { NextResponse } from 'next/server';
import Ably from 'ably';

export async function GET() {
  try {
    if (!process.env.ABLY_API_KEY) {
      throw new Error('Missing ABLY_API_KEY environment variable');
    }

    const client = new Ably.Rest(process.env.ABLY_API_KEY);
    const tokenRequestData = await client.auth.createTokenRequest({ 
      clientId: 'chat-client' 
    });

    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error generating Ably token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
