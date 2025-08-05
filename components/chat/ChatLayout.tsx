'use client';

import { useState, useEffect } from 'react';
import { FiMenu, FiMessageSquare, FiUsers, FiSettings, FiArrowLeft } from 'react-icons/fi';
import ChatWindow from './ChatWindow';
import ConversationList from './ConversationList';

interface User {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  time?: string;
  unread?: number;
}

export default function ChatLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'conversations' | 'users'>('conversations');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<User[]>([
    { id: '1', name: 'John Doe', lastMessage: 'Hey, how are you?', time: '10:30 AM', unread: 2 },
    { id: '2', name: 'Jane Smith', lastMessage: 'Meeting at 3 PM', time: 'Yesterday' },
    { id: '3', name: 'Team Group', lastMessage: 'Alice: I finished the design', time: 'Yesterday' },
  ]);

  // Auto-close sidebar on mobile when a conversation is selected
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setIsSidebarOpen(true);
      } else if (selectedConversation) {
        setIsSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedConversation]);

  const users: User[] = [
    { id: '4', name: 'Alex Johnson' },
    { id: '5', name: 'Sarah Wilson' },
    { id: '6', name: 'Mike Brown' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Hidden on mobile when chat is open */}
      <div 
        className={`${isSidebarOpen ? 'w-72 xl:w-80' : 'w-0 xl:w-20'} 
        bg-white border-r border-gray-200 flex flex-col transition-all duration-300 
        fixed xl:relative z-10 h-full ${!isSidebarOpen ? 'invisible xl:visible' : ''}`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {isSidebarOpen ? (
            <h2 className="text-xl font-semibold">Messages</h2>
          ) : (
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white xl:mx-auto">
              <FiMessageSquare size={20} />
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <FiMenu size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 flex items-center justify-center gap-2 ${
              activeTab === 'conversations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('conversations')}
          >
            <FiMessageSquare />
            {isSidebarOpen && <span>Conversations</span>}
          </button>
          <button
            className={`flex-1 py-3 flex items-center justify-center gap-2 ${
              activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('users')}
          >
            <FiUsers />
            {isSidebarOpen && <span>Users</span>}
          </button>
        </div>

        {/* Search */}
        {isSidebarOpen && (
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2 pl-10 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Conversation/User List */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'conversations' ? (
            <ConversationList 
              conversations={conversations} 
              selectedId={selectedConversation}
              onSelect={setSelectedConversation}
              isCompact={!isSidebarOpen}
            />
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((user) => (
                <div 
                  key={user.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                  onClick={() => {
                    // Handle starting a new conversation with this user
                    setSelectedConversation(user.id);
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                    {user.name.charAt(0)}
                  </div>
                  {isSidebarOpen && <span className="font-medium">{user.name}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Full width on mobile when sidebar is hidden */}
      <div className={`flex-1 flex flex-col overflow-hidden h-full ${isSidebarOpen ? 'hidden xl:flex' : 'flex'}`}>
        <div className="w-full h-full flex flex-col">
        {selectedConversation ? (
          <>
            {/* Mobile header with back button */}
            <div className="md:hidden p-3 border-b border-gray-200 bg-white flex items-center">
              <button 
                onClick={() => setSelectedConversation(null)}
                className="p-1 mr-2 text-gray-500 hover:text-gray-700"
              >
                <FiArrowLeft size={20} />
              </button>
              <h3 className="font-medium">
                {conversations.find(c => c.id === selectedConversation)?.name || 'Chat'}
              </h3>
            </div>
            <ChatWindow 
              conversationId={selectedConversation} 
              onBack={() => setSelectedConversation(null)} 
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 w-full">
            <div className="text-center p-6 w-full max-w-4xl">
              <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <FiMessageSquare className="text-blue-600 text-4xl" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Nessuna conversazione selezionata</h3>
              <p className="text-gray-600 text-lg">Seleziona una conversazione esistente o iniziane una nuova</p>
              
              {/* Show conversations button on mobile */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="mt-4 md:hidden px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Show Conversations
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}