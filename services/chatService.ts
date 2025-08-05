import * as Ably from 'ably';

export interface MediaFile {
  url: string;
  type: 'image' | 'video' | 'document';
  name?: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  text?: string;
  media?: MediaFile[];
  sender: 'me' | 'them';
  time: string;
  status: 'sent' | 'delivered' | 'read' | 'error';
}

type MessageHandler = (message: ChatMessage) => void;

class ChatService {
  private static instance: ChatService;
  private ably: any; // Using any to avoid type issues with Ably
  private channel: any;
  private messageHandlers: MessageHandler[] = [];

  private notifyMessage(message: ChatMessage) {
    console.log('Notifying message:', message);
    this.messageHandlers.forEach(handler => handler(message));
  }

  public onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
    // Restituisci una funzione per rimuovere l'handler
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  private constructor() {
    try {
      console.log('Initializing Ably client...');
      
      if (!process.env.NEXT_PUBLIC_ABLY_API_KEY) {
        throw new Error('NEXT_PUBLIC_ABLY_API_KEY is not set in environment variables');
      }

      // Log the first few characters of the API key for verification (don't log the whole key)
      const keyPreview = process.env.NEXT_PUBLIC_ABLY_API_KEY.substring(0, 10) + '...';
      console.log('Using Ably API key:', keyPreview);

      // Initialize Ably with detailed logging
      this.ably = new Ably.Realtime({
        key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
        echoMessages: false, // Don't receive our own messages
        autoConnect: true,
        log: { level: 3 } // 3 = INFO level logging
      } as any); // Using 'as any' to bypass TypeScript error with log level
      
      // Set up connection state listeners
      this.ably.connection.on('connected', () => {
        console.log('✅ Connected to Ably!');
        // Get the connection details
        console.log('Connection details:', {
          clientId: this.ably.connection.clientId,
          connectionId: this.ably.connection.id,
          key: keyPreview
        });
      });
      
      this.ably.connection.on('disconnected', () => {
        console.warn('⚠️ Disconnected from Ably');
      });
      
      this.ably.connection.on('suspended', () => {
        console.warn('⚠️ Connection to Ably suspended');
      });
      
      this.ably.connection.on('failed', (stateChange: any) => {
        console.error('❌ Connection failed:', stateChange);
      });
      
      // Initialize the channel
      this.channel = this.ably.channels.get('status-updates');
      this.setupChannel();
      
    } catch (error) {
      console.error('Error initializing Ably:', error);
      throw error;
    }
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  private setupChannel() {
    try {
      console.log('Setting up channel subscription...');
      
      // Set channel state listeners
      this.channel.on('attached', () => {
        console.log('✅ Channel attached:', this.channel.name);
        console.log('Channel state:', this.channel.state);
      });
      
      this.channel.on('failed', (stateChange: any) => {
        console.error('❌ Channel failed:', stateChange);
        console.error('Error reason:', stateChange.reason);
      });
      
      this.channel.on('suspended', () => {
        console.warn('⚠️ Channel suspended');
      });
      
      // Subscribe to messages
      this.channel.subscribe((message: any) => {
        try {
          console.log('📨 Raw message received:', JSON.stringify(message, null, 2));
          
          // Gestione per update-from-client (messaggi di testo)
          if (message.name === 'update-from-client') {
            console.log('📝 Text message:', message.data?.text || message.data);
            const chatMessage: ChatMessage = {
              id: Date.now().toString(),
              text: message.data?.text || message.data,
              sender: 'them',
              time: new Date().toISOString(),
              status: 'delivered'
            };
            this.notifyMessage(chatMessage);
          }
          // Gestione per chat-message (messaggi multimediali)
          else if (message.name === 'chat-message') {
            console.log('🖼️ Media message received');
            if (message.data?.media) {
              const mediaMessage: ChatMessage = {
                id: Date.now().toString(),
                media: message.data.media,
                sender: 'them',
                time: new Date().toISOString(),
                status: 'delivered'
              };
              this.notifyMessage(mediaMessage);
            } else {
              console.warn('Messaggio senza dati multimediali:', message);
              // Se c'è del testo nel messaggio, lo gestiamo come messaggio di testo
              if (message.data?.text || typeof message.data === 'string') {
                const textMessage: ChatMessage = {
                  id: Date.now().toString(),
                  text: message.data?.text || message.data,
                  sender: 'them',
                  time: new Date().toISOString(),
                  status: 'delivered'
                };
                this.notifyMessage(textMessage);
              }
            }
          } else {
            console.log('📩 Unknown message type:', message.name, message);
          }
        } catch (error) {
          console.error('Error processing message:', error, message);
        }
      });
      this.channel.subscribe('chat-message', (message: any) => {
        console.log('📩 Message received on channel:', message);
        
        // Convert the pub-sub message format to ChatMessage format
        const chatMessage: ChatMessage = {
          id: message.id || Date.now().toString(),
          text: message.data?.text,
          sender: message.data?.sender || 'them',
          time: message.data?.time || new Date().toISOString(),
          status: 'delivered',
          media: message.data?.media
        };
        
        console.log('Processed message:', chatMessage);
        this.messageHandlers.forEach(handler => handler(chatMessage));
      });
      
      console.log('✅ Successfully subscribed to channel:', this.channel.name);
    } catch (error) {
      console.error('Error setting up channel subscription:', error);
      throw error;
    }
  }

  public async sendMessage(message: Omit<ChatMessage, 'id' | 'status'>): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const messageId = `msg-${Date.now()}`;
        const messageToSend = {
          id: messageId,
          name: 'chat-message',
          data: {
            text: message.text,
            sender: message.sender,
            time: new Date().toISOString(),
            media: message.media
          }
        };
        
        console.log('📤 Sending message:', messageToSend);
        
        this.channel.publish('chat-message', messageToSend, (err: Error | null) => {
          if (err) {
            console.error('Error sending message:', err);
            resolve(false);
          } else {
            console.log('Message sent successfully');
            resolve(true);
          }
        });
      } catch (error) {
        console.error('Error in sendMessage:', error);
        resolve(false);
      }
    });
  }

  public subscribe(handler: (message: ChatMessage) => void) {
    this.messageHandlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  public async disconnect() {
    try {
      await this.channel.unsubscribe();
      await this.ably.close();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }
}

export const chatService = ChatService.getInstance();
