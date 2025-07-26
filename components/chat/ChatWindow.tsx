'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { FiArrowLeft, FiPaperclip, FiSend, FiSmile } from 'react-icons/fi';
import { BsCheck2All } from 'react-icons/bs';
import Image from 'next/image';
import { chatService, ChatMessage, MediaFile } from '@/services/chatService';

interface ChatWindowProps {
  conversationId: string;
  onBack: () => void;
}

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  // State management
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set up message subscription and load initial messages
  useEffect(() => {
    const handleNewMessage = (newMessage: ChatMessage) => {
      setMessages(prev => [...prev, newMessage]);
    };
    
    // Subscribe to new messages
    const unsubscribe = chatService.subscribe(handleNewMessage);
    
    // Load initial messages
    const loadInitialMessages = async () => {
      try {
        const initialMessages: ChatMessage[] = [
          {
            id: '1',
            text: 'Hey there! How are you doing?',
            sender: 'them',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered'
          },
          {
            id: '2',
            text: 'I\'m good, thanks for asking!',
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read'
          }
        ];
        
        setMessages(initialMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };
    
    loadInitialMessages();
    
    // Clean up subscription on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      
      // Create preview URLs
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't send if there's no text or files
    if (message.trim() === '' && selectedFiles.length === 0) return;
    
    // Create media files array from selected files
    const mediaFiles: MediaFile[] = selectedFiles.map((file, index) => ({
      url: previewUrls[index],
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' : 'document',
      name: file.name,
      size: file.size
    }));

    const messageToSend: ChatMessage = {
      id: Date.now().toString(),
      text: message.trim() || undefined,
      media: mediaFiles.length > 0 ? mediaFiles : undefined,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };
    
    // Add message to local list immediately for instant feedback
    setMessages(prev => [...prev, messageToSend]);
    setMessage('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    
    try {
      // Send message through chat service
      const success = await chatService.sendMessage({
        text: messageToSend.text,
        media: messageToSend.media,
        sender: messageToSend.sender,
        time: messageToSend.time
      });
      
      if (!success) {
        // Handle send error
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageToSend.id 
              ? { ...msg, status: 'error' as const }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageToSend.id 
            ? { ...msg, status: 'error' as const }
            : msg
        )
      );
    }
  };

  const getStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sent':
        return <BsCheck2All className="text-gray-400" />;
      case 'delivered':
      case 'read':
        return <BsCheck2All className="text-blue-500" />;
      case 'error':
        return <span className="text-red-500">!</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex items-center">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-gray-100 mr-2"
        >
          <FiArrowLeft className="text-gray-600" />
        </button>
        <div className="ml-2">
          <h2 className="font-semibold">Chat</h2>
          <p className="text-xs text-gray-500">Online</p>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.sender === 'me' 
                  ? 'bg-blue-500 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none shadow'
              }`}
            >
              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
              
              {msg.media && msg.media.map((media, mediaIndex) => (
                <div key={`${msg.id}-media-${mediaIndex}`} className="mt-2">
                  {media.type === 'image' ? (
                    <div className="relative w-full h-48 md:h-64 rounded overflow-hidden">
                      <Image
                        key={`${msg.id}-img-${mediaIndex}`}
                        src={media.url}
                        alt={media.name || 'Image'}
                        fill
                        className="object-cover cursor-pointer"
                        onClick={() => window.open(media.url, '_blank')}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized={!media.url.startsWith('/')}
                      />
                    </div>
                  ) : media.type === 'video' ? (
                    <video 
                      key={`${msg.id}-video-${mediaIndex}`}
                      src={media.url} 
                      controls 
                      className="max-w-full h-auto rounded"
                    />
                  ) : (
                    <a 
                      key={`${msg.id}-doc-${mediaIndex}`}
                      href={media.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center"
                    >
                      <FiPaperclip className="mr-1" />
                      {media.name || 'Document'}
                    </a>
                  )}
                </div>
              ))}
              
              <div className="flex items-center justify-end mt-1 space-x-1 text-xs opacity-75">
                <span>{msg.time}</span>
                {msg.sender === 'me' && (
                  <span className="ml-1">
                    {getStatusIcon(msg.status)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* File previews */}
      {previewUrls.length > 0 && (
        <div className="px-4 py-2 bg-white border-t flex overflow-x-auto space-x-2">
              {previewUrls.map((url, index) => (
                <div key={`preview-${index}`} className="relative inline-block m-1">
              <img 
                src={url} 
                alt={`Preview ${index}`} 
                className="h-16 w-16 object-cover rounded"
              />
              <button 
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Message input */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <FiPaperclip size={20} />
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
          
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <button 
            type="submit"
            disabled={message.trim() === '' && selectedFiles.length === 0}
            className={`p-2 rounded-full ${
              message.trim() || selectedFiles.length > 0
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <FiSend size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
