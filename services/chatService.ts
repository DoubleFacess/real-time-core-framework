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

  private constructor() {
    try {
      if (!process.env.ABLY_API_KEY) {
        throw new Error('ABLY_API_KEY is not set in environment variables');
      }

      // Initialize Ably with just the API key to avoid type issues
      this.ably = new Ably.Realtime(process.env.ABLY_API_KEY as string);
      
      // Use the same channel as the pub-sub page
      this.channel = this.ably.channels.get('status-updates');
      this.setupChannel();
      
      // Log connection status
      this.ably.connection.on('connected', () => {
        console.log('Connected to Ably!');
      });
      
      this.ably.connection.on('failed', (stateChange: any) => {
        console.error('Connection failed:', stateChange);
      });
      
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
      this.channel.subscribe('update-from-client', (message: any) => {
        // Convert the pub-sub message format to ChatMessage format
        const chatMessage: ChatMessage = {
          id: Date.now().toString(),
          text: message.data.text,
          sender: message.data.sender || 'them',
          time: message.data.time || new Date().toLocaleTimeString(),
          status: 'delivered'
        };
        console.log('Message received in chat:', chatMessage);
        this.messageHandlers.forEach(handler => handler(chatMessage));
      });
      console.log('Successfully subscribed to status-updates channel');
    } catch (error) {
      console.error('Error setting up channel subscription:', error);
      throw error;
    }
  }

  public async sendMessage(message: Omit<ChatMessage, 'id' | 'status'>): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log('Sending message:', message);
        // Format the message to match the pub-sub page format
        const pubSubMessage = {
          name: 'update-from-client',
          data: {
            text: message.text || 'Media message',
            sender: message.sender,
            time: message.time
          }
        };
        
        this.channel.publish('update-from-client', pubSubMessage.data, (err: Error | null) => {
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
