import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Realtime } from 'ably';

type ConnectionStateChange = {
  current: string;
  previous: string;
  reason?: {
    message: string;
  };
};

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ablyApiKey = process.env.ABLY_API_KEY;

if (!supabaseUrl || !supabaseAnonKey || !ablyApiKey) {
  throw new Error('Missing required environment variables. Please check your .env.local file.');
}

// Initialize Supabase client with anon key since we're only reading public data
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Disable cache for this route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId, userName, userEmail } = await request.json();

    if (!userId || !userName || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, userName, and userEmail are required' },
        { status: 400 }
      );
    }

    // Initialize Ably client with proper TypeScript types
    if (!ablyApiKey) {
      throw new Error('ABLY_API_KEY is not defined');
    }
    
    const ably = new Realtime(ablyApiKey);
    
    try {
      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        ably.connection.once('connected', () => resolve());
        ably.connection.once('failed', (stateChange: ConnectionStateChange) => {
          reject(new Error(`Connection failed: ${stateChange.reason?.message || 'Unknown error'}`));
        });
      });
      
      // Get the channel for connection notifications
      const channel = ably.channels.get('user-connections');
      
      // Publish connection message
      const message = {
        userId,
        userName,
        userEmail,
        timestamp: new Date().toISOString(),
        status: 'connected' as const
      };
      
      await channel.publish('user-connected', message);

      // Update user status in the database
      const { error } = await supabase
        .from('user_status')
        .upsert({
          id: userId,
          name: userName,
          email: userEmail,
          is_online: true,
          last_seen: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating user status:', error);
        // Don't fail the request if the status update fails
      }

      return NextResponse.json({ 
        success: true,
        message: 'Connection notification sent successfully'
      });
      
    } catch (ablyError) {
      console.error('Ably error:', ablyError);
      return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
      );
    } finally {
      // Close the Ably connection
      ably.close();
    }
  } catch (error) {
    console.error('Error in notify-connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
