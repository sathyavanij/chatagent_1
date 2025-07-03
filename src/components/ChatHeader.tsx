import React from 'react';
import { Bot, X } from 'lucide-react';

interface ChatHeaderProps {
  onCloseClick?: () => void;
  onExportClick?: () => void;
  formSubmissions?: number;
}

export function ChatHeader({ 
  onCloseClick, 
  onExportClick,
  formSubmissions = 0
}: ChatHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-green-500 p-4 flex items-center justify-between text-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-white">AI Assistant</h1>
          {formSubmissions > 0 && (
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span>{formSubmissions} forms collected</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {onCloseClick && (
          <button
            onClick={onCloseClick}
            className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
            title="Close Chat"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}