import React from 'react';

interface QuickRepliesProps {
  onSelectReply: (reply: string) => void;
  isVisible: boolean;
}

const quickReplies = [
  "Show me the form",
  "Contact information", 
  "Fill out form",
  "Export data",
  "What can you do?"
];

export function QuickReplies({ onSelectReply, isVisible }: QuickRepliesProps) {
  if (!isVisible) return null;

  return (
    <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 border-t border-gray-200">
      <h3 className="text-xs font-medium text-gray-700 mb-2">Quick replies:</h3>
      <div className="flex flex-wrap gap-1.5">
        {quickReplies.map((reply, index) => (
          <button
            key={index}
            onClick={() => onSelectReply(reply)}
            className="px-2.5 py-1.5 text-xs bg-white hover:bg-gray-50 border border-gray-300 rounded-full transition-colors duration-200 shadow-sm"
          >
            {reply}
          </button>
        ))}
      </div>
    </div>
  );
}