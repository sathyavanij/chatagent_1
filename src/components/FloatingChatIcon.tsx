import React from 'react';
import { MessageCircle, X } from 'lucide-react';

interface FloatingChatIconProps {
  onClick: () => void;
  isVisible: boolean;
  hasUnreadMessages?: boolean;
}

export function FloatingChatIcon({ onClick, isVisible, hasUnreadMessages = false }: FloatingChatIconProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={onClick}
        className="relative w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center group animate-bounce"
        title="Open Chat"
      >
        <MessageCircle className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
        
        {/* Unread message indicator */}
        {hasUnreadMessages && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}
        
        {/* Pulse animation ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-green-500 animate-ping opacity-20"></div>
      </button>
      
      {/* Welcome tooltip */}
      <div className="absolute bottom-20 right-0 bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="text-sm font-medium">Hi there! 👋</div>
        <div className="text-xs text-gray-600">Click to start chatting</div>
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
      </div>
    </div>
  );
}