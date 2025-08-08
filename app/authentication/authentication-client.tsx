'use client'

import { MouseEventHandler, MouseEvent, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';
import * as Ably from 'ably'
import Logger, { LogEntry } from '../../components/logger'
import SampleHeader from '../../components/SampleHeader'
import { AblyProvider, useAbly, useConnectionStateListener } from 'ably/react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type AblyClient = Ably.Types.RealtimePromise;

export default function Authentication() {
  const supabase = createClientComponentClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [client, setClient] = useState<AblyClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    let ablyClient: AblyClient | null = null;

    const initializeAbly = async () => {
      try {
        // Verifica lo stato di autenticazione con Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }

        const clientId = session.user?.id || `user-${Math.random().toString(36).substr(2, 9)}`;
        
        const authCallback = async (tokenParams: any, callback: any) => {
          try {
            const response = await fetch('/api/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId })
            });
            
            if (!response.ok) {
              const errorData = await response.text();
              throw new Error(`HTTP error! status: ${response.status}, body: ${errorData}`);
            }
            
            const tokenRequest = await response.json();
            callback(null, tokenRequest);
          } catch (error) {
            console.error('Error in auth callback:', error);
            callback(error, null);
          }
        };
        
        // Inizializza Ably
        ablyClient = new Ably.Realtime({
          authCallback,
          clientId,
          echoMessages: false
        });

        // Gestione eventi di connessione
        ablyClient.connection.on('connected', async () => {
          if (!isMounted) return;
          console.log('Ably connected successfully');
          setConnectionStatus('connected');
          
          try {
            const channel = ablyClient!.channels.get('login-notifications');
            await channel.publish('user-login', {
              userId: ablyClient!.auth.clientId,
              timestamp: new Date().toISOString(),
              status: 'connected'
            });
            
            setClient(ablyClient);
            setIsAuthenticated(true);
          } catch (error) {
            console.error('Error publishing login notification:', error);
          }
        });

        ablyClient.connection.on('disconnected', () => {
          if (!isMounted) return;
          setConnectionStatus('disconnected');
          setIsAuthenticated(false);
        });

        ablyClient.connection.on('failed', () => {
          if (!isMounted) return;
          setConnectionStatus('failed');
          setIsAuthenticated(false);
        });

      } catch (error) {
        console.error('Error initializing Ably:', error);
        throw error;
      }
    };

    initializeAbly().catch(error => {
      console.error('Failed to initialize Ably:', error);
      router.push('/error?message=Failed to initialize chat service');
    });

    // Cleanup function
    return () => {
      isMounted = false;
      if (ablyClient) {
        ablyClient.connection.off();
        ablyClient.connection.close();
      }
    };
  }, [router, supabase.auth]);

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AblyProvider client={client}>
      <div className="flex flex-row justify-center">
        <div className="flex flex-col justify-start items-start gap-10">
          <SampleHeader sampleName="Authentication" sampleIcon="Authentication.svg" sampleDocsLink="https://ably.com/docs/getting-started/react#authenticate" />
          <div className="font-manrope text-base max-w-screen-sm text-slate-800 text-opacity-100 leading-6 font-light" >
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span>Status: {connectionStatus}</span>
            </div>
            {isAuthenticated ? (
              <p>Authenticated and connected to Ably platform. Login notification sent.</p>
            ) : (
              <p>Connecting to Ably platform...</p>
            )}
          </div>
          <ConnectionStatus />
        </div>
      </div>
    </AblyProvider>   
  )
}

const ConnectionStatus = () => {
  const ably = useAbly();
  
  const [logs, setLogs] = useState<Array<LogEntry>>([])
  const [connectionState, setConnectionState] = useState(ably.connection.state)
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    // Get user data from the connection
    ably.connection.on('connected', () => {
      const clientData = ably.auth.clientId;
      if (clientData) {
        try {
          const data = JSON.parse(clientData);
          setUserData(data);
        } catch (e) {
          console.error('Error parsing client data:', e);
        }
      }
    });
  }, [ably]);

  useConnectionStateListener((stateChange) => {
    setConnectionState(stateChange.current)
    setLogs(prev => [...prev, new LogEntry(`Connection state change: ${stateChange.previous} -> ${stateChange.current}`)])
  })
  
  const connectionToggle: MouseEventHandler = (_event: MouseEvent<HTMLButtonElement>) => {
    if(connectionState === 'connected') {
      ably.connection.close()
    }
    else if(connectionState === 'closed') {
      ably.connection.connect()
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {userData && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-medium text-green-800">Authenticated as:</h3>
          <p className="text-sm text-green-700">{userData.name} ({userData.email})</p>
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${
          connectionState === 'connected' ? 'bg-green-500' : 
          connectionState === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
        }`}></div>
        <span className="text-sm font-medium">
          {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
        </span>
        <button 
          onClick={connectionToggle}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
        >
          {connectionState === 'connected' ? 'Disconnect' : 'Connect'}
        </button>
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Connection Logs:</h3>
        <div className="h-48 overflow-y-auto border rounded p-2 bg-gray-50 text-sm font-mono">
          {logs.map((log, index) => {
            const formattedTime = log.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
            return (
              <div key={index} className="py-1 border-b border-gray-100 last:border-0">
                [{formattedTime}] {log.message}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}