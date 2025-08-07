import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Ably from 'ably';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ablyApiKey = process.env.ABLY_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Disabilita la cache per questa route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId, userName, userEmail } = await request.json();

    if (!userId || !userName || !userEmail) {
      return NextResponse.json(
        { error: 'Dati mancanti' },
        { status: 400 }
      );
    }

    // Inizializza il client Ably
    const client = new Ably.Realtime(ablyApiKey);
    
    // Crea un canale per le notifiche di connessione
    const channel = client.channels.get('user-connections');
    
    // Pubblica un messaggio di connessione
    await channel.publish('user-connected', {
      userId,
      userName,
      userEmail,
      timestamp: new Date().toISOString(),
      status: 'connected'
    });

    // Aggiorna lo stato dell'utente nel database
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
      console.error('Errore aggiornamento stato utente:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore notifica connessione:', error);
    return NextResponse.json(
      { error: 'Errore durante la notifica di connessione' },
      { status: 500 }
    );
  }
}
