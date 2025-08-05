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
    if (message.trim() === '' && selectedFiles.length === 0) return;

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

    setMessages(prev => [...prev, messageToSend]);
    setMessage('');
    setSelectedFiles([]);
    setPreviewUrls([]);

    try {
      const success = await chatService.sendMessage({
        text: messageToSend.text,
        media: messageToSend.media,
        sender: messageToSend.sender,
        time: messageToSend.time
      });

      if (!success) {
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
    <div className="flex flex-col h-full bg-gray-50">
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
      <div className="flex-1 overflow-y-auto p-4 w-full">
        <div className="w-full space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`min-w-[30rem] max-w-3xl px-6 py-4 rounded-2xl text-base ${
                  msg.sender === 'me' 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 rounded-bl-none shadow'
                }`}
              >
                {msg.text && <p className="whitespace-pre-wrap text-base">{msg.text}</p>}
                {msg.media && msg.media.map((media, mediaIndex) => (
                  <div key={`${msg.id}-media-${mediaIndex}`} className="mt-3">
                    {media.type === 'image' ? (
                      <div className="relative w-full h-64 lg:h-80 rounded-xl overflow-hidden">
                        <Image
                          key={`${msg.id}-img-${mediaIndex}`}
                          src={media.url}
                          alt={media.name || 'Image'}
                          fill
                          className="object-cover"
                          unoptimized={!media.url.startsWith('/')}
                        />
                      </div>
                    ) : media.type === 'video' ? (
                      <video 
                        src={media.url} 
                        controls 
                        className="w-full max-h-96 rounded-lg"
                      />
                    ) : (
                      <a 
                        href={media.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center p-3 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        <svg className="w-8 h-8 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate max-w-xs">
                          {media.name || 'Document'}
                          {media.size && ` (${(media.size / 1024).toFixed(1)} KB)`}
                        </span>
                      </a>
                    )}
                  </div>
                ))}
                <div className="flex justify-end items-center mt-1">
                  <span className="text-xs opacity-70">
                    {msg.time}
                  </span>
                  {msg.sender === 'me' && (
                    <span className="ml-1">
                      {getStatusIcon(msg.status)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* File previews */}
      {previewUrls.length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-gray-200">
          <div className="flex overflow-x-auto space-x-2 w-full">
            {previewUrls.map((url, index) => (
              <div key={`preview-${index}`} className="relative inline-block m-1">
                <img 
                  src={url} 
                  alt={`Preview ${index + 1}`}
                  className="h-20 w-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="w-full">
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
              accept="image/*,video/*,.pdf,.doc,.docx"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full px-4 py-2 pr-10 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiSmile size={20} />
              </button>
            </div>
            <button
              type="submit"
              disabled={!message.trim() && selectedFiles.length === 0}
              className={`p-2 rounded-full ${
                message.trim() || selectedFiles.length > 0
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FiSend size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}