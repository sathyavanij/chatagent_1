import React, { useState, useRef, useEffect } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { QuickReplies } from './components/QuickReplies';
import { FloatingChatIcon } from './components/FloatingChatIcon';
import { AdminDashboard } from './pages/AdminDashboard';
import { useChat } from './hooks/useChat';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    formSubmissions,
    sendMessage,
    copyToClipboard,
    handleFormSubmit
  } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for admin access via URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setShowAdmin(true);
    }
  }, []);

  const showQuickReplies = messages.length <= 1;
  const hasUnreadMessages = formSubmissions.length > 0;

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  const handleSwitchToAdmin = () => {
    setShowAdmin(true);
    setIsChatOpen(false);
  };

  const handleSwitchToChat = () => {
    setShowAdmin(false);
  };

  if (showAdmin) {
    return <AdminDashboard onSwitchToChat={handleSwitchToChat} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Admin Access Button (Hidden) */}
      <button
        onClick={handleSwitchToAdmin}
        className="fixed top-4 left-4 opacity-0 hover:opacity-100 transition-opacity duration-300 z-50 p-2 bg-gray-800 text-white rounded-full text-xs"
        title="Admin Dashboard"
      >
        Admin
      </button>

      {/* Floating Chat Icon */}
      <FloatingChatIcon 
        onClick={handleOpenChat}
        isVisible={!isChatOpen}
        hasUnreadMessages={hasUnreadMessages}
      />

      {/* Chat Interface */}
      {isChatOpen && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-xl p-2 sm:p-4 z-50 max-w-sm w-full h-100 overflow-y-auto">
          <div className="w-full max-w-sm mx-auto h-screen max-h-[800px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-4 duration-300">
            <ChatHeader
              onCloseClick={handleCloseChat}
              formSubmissions={formSubmissions.length}
            />
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCopy={copyToClipboard}
                  onFormSubmit={handleFormSubmit}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <QuickReplies
              onSelectReply={sendMessage}
              isVisible={showQuickReplies}
            />
            
            <ChatInput
              onSendMessage={sendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;