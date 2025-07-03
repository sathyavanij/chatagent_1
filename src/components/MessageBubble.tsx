import React from 'react';
import { Copy, User, Bot } from 'lucide-react';
import { Message } from '../types/chat';
import { FormMessage } from './FormMessage';

interface MessageBubbleProps {
  message: Message;
  onCopy: (content: string) => void;
  onFormSubmit?: (submission: any) => void;
}

export function MessageBubble({ message, onCopy, onFormSubmit }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-500' : 'bg-green-500'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      
      <div className={`max-w-[85%] group ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Regular message bubble */}
        <div className={`relative px-3 py-2 rounded-2xl shadow-sm ${
          isUser 
            ? 'bg-blue-500 text-white rounded-br-md' 
            : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
        } ${message.isTyping ? 'animate-pulse' : ''}`}>
          {message.isTyping ? (
            <div className="flex space-x-1 py-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          )}
          
          {!message.isTyping && (
            <button
              onClick={() => onCopy(message.content)}
              className={`absolute -top-1 ${isUser ? '-left-1' : '-right-1'} opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full ${
                isUser ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title="Copy message"
            >
              <Copy className={`w-3 h-3 ${isUser ? 'text-white' : 'text-gray-600'}`} />
            </button>
          )}
        </div>
        
        {/* Form component */}
        {message.isForm && message.formData && onFormSubmit && (
          <div className="mt-2">
            <FormMessage
              form={message.formData}
              onSubmit={onFormSubmit}
              messageId={message.id}
            />
          </div>
        )}
        
        <span className="text-xs text-gray-500 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}