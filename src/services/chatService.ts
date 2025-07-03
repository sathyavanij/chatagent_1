import { Message, PredefinedResponse } from '../types/chat';
import { predefinedResponses } from '../data/predefinedResponses';
import { SupabaseService } from './supabaseService';

export class ChatService {
  private predefinedResponses: PredefinedResponse[];
  private customQA: PredefinedResponse[];
  private useOpenAI: boolean;
  private openAIApiKey?: string;
  private lastPredefinedResponse?: PredefinedResponse;
  private isInitialized: boolean = false;

  constructor(useOpenAI: boolean = false, openAIApiKey?: string) {
    this.predefinedResponses = predefinedResponses;
    this.customQA = [];
    this.useOpenAI = useOpenAI;
    this.openAIApiKey = openAIApiKey;
    this.isInitialized = false;
  }

  // Initialize the service after Supabase is configured
  async init() {
    if (this.isInitialized) return;
    
    try {
      await this.loadCustomQA();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Could not load custom Q&A, continuing with predefined responses only:', error);
      this.isInitialized = true; // Mark as initialized even if custom Q&A fails
    }
  }

  private async loadCustomQA() {
    try {
      const customQA = await SupabaseService.loadCustomQA();
      this.customQA = customQA;
      console.log('Loaded custom Q&A:', customQA);
    } catch (error) {
      console.error('Error loading custom Q&A:', error);
      // Fallback to localStorage
      const savedQA = localStorage.getItem('customQA');
      if (savedQA) {
        try {
          this.customQA = JSON.parse(savedQA);
        } catch (parseError) {
          console.error('Error parsing custom Q&A from localStorage:', parseError);
          this.customQA = [];
        }
      }
    }
  }

  async processMessage(message: string, conversationHistory: Message[]): Promise<string> {
    // Ensure service is initialized
    if (!this.isInitialized) {
      await this.init();
    }

    // First, try to find a custom Q&A response
    const customResponse = this.findCustomQAResponse(message);
    if (customResponse) {
      this.lastPredefinedResponse = customResponse;
      return customResponse.response;
    }

    // Then, try to find a predefined response
    const predefinedResponse = this.findPredefinedResponse(message);
    if (predefinedResponse) {
      this.lastPredefinedResponse = predefinedResponse;
      return predefinedResponse.response;
    }

    this.lastPredefinedResponse = undefined;

    // If no predefined response and OpenAI is enabled, use OpenAI
    if (this.useOpenAI && this.openAIApiKey) {
      try {
        return await this.getOpenAIResponse(message, conversationHistory);
      } catch (error) {
        console.error('OpenAI API error:', error);
        return this.getFallbackResponse();
      }
    }

    // Fallback response
    return this.getFallbackResponse();
  }

  getLastPredefinedResponse(): PredefinedResponse | undefined {
    return this.lastPredefinedResponse;
  }

  private findCustomQAResponse(message: string): PredefinedResponse | null {
    const lowerMessage = message.toLowerCase();
    
    for (const response of this.customQA) {
      for (const trigger of response.trigger) {
        if (lowerMessage.includes(trigger.toLowerCase())) {
          console.log('Found custom Q&A match:', response);
          return response;
        }
      }
    }
    
    return null;
  }

  private findPredefinedResponse(message: string): PredefinedResponse | null {
    const lowerMessage = message.toLowerCase();
    
    for (const response of this.predefinedResponses) {
      for (const trigger of response.trigger) {
        if (lowerMessage.includes(trigger.toLowerCase())) {
          return response;
        }
      }
    }
    
    return null;
  }

  private async getOpenAIResponse(message: string, conversationHistory: Message[]): Promise<string> {
    if (!this.openAIApiKey) {
      throw new Error('OpenAI API key not provided');
    }

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful, friendly AI assistant. Provide clear, concise, and helpful responses. You can also help users with forms and data collection.'
      },
      ...conversationHistory.slice(-10).filter(msg => !msg.isForm).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openAIApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private getFallbackResponse(): string {
    const fallbackResponses = [
      "I understand you're asking about something, but I'm not sure how to respond to that specific question. You can try asking about forms like 'contact form', 'feedback', or 'survey', or ask me to export your data to Excel!",
      "That's an interesting question! While I don't have a specific answer for that, I can help you with forms and data collection. Try asking about 'contact form', 'appointment booking', or 'export data'.",
      "I'm not quite sure about that particular topic, but I'd be happy to help you with forms, surveys, or data export. What would you like to collect information about?",
      "I don't have a specific response for that question right now. However, I can help you create forms to collect information and export the data to Excel. What kind of form would you like to create?"
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  updateSettings(useOpenAI: boolean, openAIApiKey?: string) {
    this.useOpenAI = useOpenAI;
    this.openAIApiKey = openAIApiKey;
  }

  // Method to refresh custom Q&A (can be called from admin dashboard)
  async refreshCustomQA() {
    try {
      await this.loadCustomQA();
    } catch (error) {
      console.warn('Could not refresh custom Q&A:', error);
    }
  }

  // Method to add custom Q&A
  async addCustomQA(qa: PredefinedResponse) {
    try {
      // Add to local array
      this.customQA.push(qa);
      
      // Save to Supabase
      await SupabaseService.saveCustomQA(this.customQA);
      
      console.log('Custom Q&A added successfully');
    } catch (error) {
      console.error('Error adding custom Q&A:', error);
      // Remove from local array if save failed
      this.customQA = this.customQA.filter(item => item.id !== qa.id);
      throw error;
    }
  }

  // Method to get all Q&A (for admin dashboard)
  getAllQA(): PredefinedResponse[] {
    return [...this.predefinedResponses, ...this.customQA];
  }

  // Method to get only custom Q&A
  getCustomQA(): PredefinedResponse[] {
    return this.customQA;
  }
}