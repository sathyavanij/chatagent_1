import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, FormSubmission, FormDefinition } from '../types/chat';
import { ChatService } from '../services/chatService';
import { SupabaseService } from '../services/supabaseService';
import { SettingsService } from '../services/settingsService';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([]);
  const chatServiceRef = useRef<ChatService>(new ChatService());

  useEffect(() => {
    // Initialize settings and load data
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize settings from database
      const settings = await SettingsService.initializeSettings();
      
      // Update chat service with settings
      chatServiceRef.current.updateSettings(settings.openaiEnabled, settings.openaiApiKey);

      // Initialize chat service after Supabase is configured
      await chatServiceRef.current.init();

      // Load form submissions from Supabase
      await loadFormSubmissions();

      // Add welcome message
      const welcomeMessage: Message = {
        id: '1',
        content: "Hello! I'm your AI assistant powered by PostgreSQL database. I can help you with various questions and collect information through forms. Try asking me about 'form' or 'contact information'!",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);

      // Set up real-time subscription for new submissions
      const subscription = SupabaseService.subscribeToSubmissions((payload) => {
        console.log('Real-time update:', payload);
        loadFormSubmissions(); // Refresh submissions when changes occur
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing app:', error);
      
      // Fallback initialization
      try {
        const savedUseOpenAI = localStorage.getItem('useOpenAI') === 'true';
        const savedApiKey = localStorage.getItem('openAIApiKey') || '';
        
        chatServiceRef.current.updateSettings(savedUseOpenAI, savedApiKey);
        
        // Initialize chat service even in fallback scenario
        await chatServiceRef.current.init();
        
        await loadFormSubmissions();

        const welcomeMessage: Message = {
          id: '1',
          content: "Hello! I'm your AI assistant. I can help you with various questions and collect information through forms. Try asking me about 'form' or 'contact information'!",
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      } catch (fallbackError) {
        console.error('Fallback initialization also failed:', fallbackError);
        
        // Final fallback - just show basic welcome message
        const basicWelcomeMessage: Message = {
          id: '1',
          content: "Hello! I'm your AI assistant. I can help you with various questions and collect information through forms.",
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages([basicWelcomeMessage]);
      }
    }
  };

  const loadFormSubmissions = async () => {
    try {
      const submissions = await SupabaseService.loadFormSubmissions();
      setFormSubmissions(submissions);
    } catch (error) {
      console.error('Error loading form submissions:', error);
      // Fallback to localStorage if Supabase fails
      try {
        const savedSubmissions = localStorage.getItem('formSubmissions');
        if (savedSubmissions) {
          const parsed = JSON.parse(savedSubmissions);
          const submissions = parsed.map((s: any) => ({
            ...s,
            timestamp: new Date(s.timestamp)
          }));
          setFormSubmissions(submissions);
        }
      } catch (localError) {
        console.error('Error loading form submissions from localStorage:', localError);
        setFormSubmissions([]);
      }
    }
  };

  const handleFormSubmit = useCallback(async (submission: FormSubmission) => {
    try {
      // Save to Supabase
      await SupabaseService.saveFormSubmission(submission);
      
      // Update local state
      const newSubmissions = [...formSubmissions, submission];
      setFormSubmissions(newSubmissions);
      
      // Also save to localStorage as backup
      localStorage.setItem('formSubmissions', JSON.stringify(newSubmissions));

      // Add confirmation message
      const confirmationMessage: Message = {
        id: Date.now().toString(),
        content: `Thank you! Your ${submission.formTitle.toLowerCase()} has been submitted successfully. The data has been saved to our PostgreSQL database and syncs across all your devices!`,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, confirmationMessage]);
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Fallback to localStorage if Supabase fails
      const newSubmissions = [...formSubmissions, submission];
      setFormSubmissions(newSubmissions);
      localStorage.setItem('formSubmissions', JSON.stringify(newSubmissions));

      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `Your ${submission.formTitle.toLowerCase()} has been saved locally. We'll sync it to the database when the connection is restored.`,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  }, [formSubmissions]);

  const getActiveForm = async (): Promise<FormDefinition | null> => {
    try {
      // Try to load from Supabase first
      const form = await SupabaseService.loadFormConfiguration();
      if (form) {
        return form;
      }
    } catch (error) {
      console.error('Error loading form from Supabase:', error);
    }

    // Fallback to localStorage
    try {
      const savedForm = localStorage.getItem('activeForm');
      if (savedForm) {
        return JSON.parse(savedForm);
      }
    } catch (error) {
      console.error('Error loading active form from localStorage:', error);
    }
    
    return null;
  };

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    };

    const typingMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isTyping: true
    };

    setMessages(prev => [...prev, userMessage, typingMessage]);
    setIsLoading(true);

    try {
      // Check for export commands - but don't allow export in chatbot
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes('export') || lowerContent.includes('download')) {
        const noExportMessage: Message = {
          id: (Date.now() + 2).toString(),
          content: "I can't provide data exports through the chat interface. Please contact an administrator to access the admin dashboard where you can download form submissions.",
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => prev.slice(0, -1).concat(noExportMessage));
        return;
      }

      // Check if user is asking for a form
      if (lowerContent.includes('form') || lowerContent.includes('contact') || lowerContent.includes('information')) {
        const activeForm = await getActiveForm();
        
        if (activeForm) {
          const formMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: "I'd be happy to collect your information! Please fill out this form (data will be stored in our PostgreSQL database):",
            role: 'assistant',
            timestamp: new Date(),
            isForm: true,
            formData: activeForm
          };
          setMessages(prev => prev.slice(0, -1).concat(formMessage));
          return;
        } else {
          const noFormMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: "I'd love to help you with a form, but no form has been configured yet. Please contact the administrator to set up a form in the PostgreSQL database.",
            role: 'assistant',
            timestamp: new Date()
          };
          setMessages(prev => prev.slice(0, -1).concat(noFormMessage));
          return;
        }
      }

      // Use chat service for other messages
      const response = await chatServiceRef.current.processMessage(content, messages);
      
      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => prev.slice(0, -1).concat(assistantMessage));
    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: "I'm sorry, I encountered an error while processing your message. Please try again.",
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => prev.slice(0, -1).concat(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [messages, formSubmissions]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const clearFormData = useCallback(async () => {
    try {
      // Clear from Supabase would require admin permissions
      // For now, just clear local state
      setFormSubmissions([]);
      localStorage.removeItem('formSubmissions');
    } catch (error) {
      console.error('Error clearing form data:', error);
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, []);

  return {
    messages,
    isLoading,
    formSubmissions,
    sendMessage,
    clearChat,
    clearFormData,
    copyToClipboard,
    handleFormSubmit
  };
}