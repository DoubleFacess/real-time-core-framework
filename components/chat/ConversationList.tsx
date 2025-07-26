import { User } from './ChatLayout';

interface ConversationListProps {
  conversations: User[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isCompact?: boolean;
}

export default function ConversationList({ 
  conversations, 
  selectedId, 
  onSelect,
  isCompact = false 
}: ConversationListProps) {
  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => (
        <div 
          key={conversation.id}
          className={`p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${
            selectedId === conversation.id ? 'bg-blue-50' : ''
          }`}
          onClick={() => onSelect(conversation.id)}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              {conversation.name.charAt(0)}
            </div>
            {conversation.unread && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {conversation.unread}
              </span>
            )}
          </div>
          
          {!isCompact && (
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900 truncate">{conversation.name}</h4>
                {conversation.time && (
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {conversation.time}
                  </span>
                )}
              </div>
              {conversation.lastMessage && (
                <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
