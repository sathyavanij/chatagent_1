import { supabase, AppSettingRecord, updateSupabaseClient, testSupabaseConnection, isSupabaseConfigured } from '../lib/supabase';

export interface AppSettings {
  openaiEnabled: boolean;
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  systemPrompt: string;
}

export class SettingsService {
  // Load all settings from database
  static async loadSettings(): Promise<AppSettings> {
    try {
      // Only try to load from Supabase if it's properly configured
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*');

        if (error) throw error;

        const settings: AppSettings = {
          openaiEnabled: false,
          openaiApiKey: '',
          supabaseUrl: '',
          supabaseAnonKey: '',
          systemPrompt: 'You are a helpful AI assistant for a form collection chatbot.'
        };

        // Convert database records to settings object
        (data || []).forEach((record: AppSettingRecord) => {
          switch (record.setting_key) {
            case 'openai_enabled':
              settings.openaiEnabled = record.setting_value === 'true';
              break;
            case 'openai_api_key':
              settings.openaiApiKey = record.setting_value || '';
              break;
            case 'supabase_url':
              settings.supabaseUrl = record.setting_value || '';
              break;
            case 'supabase_anon_key':
              settings.supabaseAnonKey = record.setting_value || '';
              break;
            case 'system_prompt':
              settings.systemPrompt = record.setting_value || 'You are a helpful AI assistant for a form collection chatbot.';
              break;
          }
        });

        return settings;
      } else {
        console.warn('Supabase not configured, loading settings from localStorage');
        return this.loadSettingsFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading settings from Supabase:', error);
      
      // Fallback to localStorage
      return this.loadSettingsFromLocalStorage();
    }
  }

  // Save settings to database
  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      // Update Supabase client first if credentials changed
      if (settings.supabaseUrl && settings.supabaseAnonKey) {
        const updated = updateSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
        if (!updated) {
          throw new Error('Failed to update Supabase client');
        }
      }

      const settingsToSave = [
        {
          id: 'openai_enabled',
          setting_key: 'openai_enabled',
          setting_value: settings.openaiEnabled.toString(),
          setting_type: 'boolean',
          description: 'Enable OpenAI integration'
        },
        {
          id: 'openai_api_key',
          setting_key: 'openai_api_key',
          setting_value: settings.openaiApiKey,
          setting_type: 'api_key',
          description: 'OpenAI API Key'
        },
        {
          id: 'supabase_url',
          setting_key: 'supabase_url',
          setting_value: settings.supabaseUrl,
          setting_type: 'url',
          description: 'Supabase Project URL'
        },
        {
          id: 'supabase_anon_key',
          setting_key: 'supabase_anon_key',
          setting_value: settings.supabaseAnonKey,
          setting_type: 'api_key',
          description: 'Supabase Anonymous Key'
        },
        {
          id: 'system_prompt',
          setting_key: 'system_prompt',
          setting_value: settings.systemPrompt,
          setting_type: 'text',
          description: 'System prompt for AI responses'
        }
      ];

      const { error } = await supabase
        .from('app_settings')
        .upsert(settingsToSave);

      if (error) throw error;

      // Also save to localStorage as backup
      this.saveSettingsToLocalStorage(settings);

      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      
      // Fallback to localStorage
      this.saveSettingsToLocalStorage(settings);
      throw error;
    }
  }

  // Test Supabase connection
  static async testSupabaseConnection(url: string, anonKey: string): Promise<boolean> {
    return await testSupabaseConnection(url, anonKey);
  }

  // Initialize settings on app start
  static async initializeSettings(): Promise<AppSettings> {
    try {
      // First try to load from localStorage to get Supabase credentials
      const localSettings = this.loadSettingsFromLocalStorage();
      
      // If we have Supabase credentials in localStorage, update the client
      if (localSettings.supabaseUrl && localSettings.supabaseAnonKey) {
        updateSupabaseClient(localSettings.supabaseUrl, localSettings.supabaseAnonKey);
      }
      
      // Now try to load from Supabase
      const settings = await this.loadSettings();
      
      // Update Supabase client if we have credentials from database
      if (settings.supabaseUrl && settings.supabaseAnonKey) {
        updateSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
      }
      
      return settings;
    } catch (error) {
      console.error('Error initializing settings:', error);
      return this.loadSettingsFromLocalStorage();
    }
  }

  // Fallback methods for localStorage
  private static loadSettingsFromLocalStorage(): AppSettings {
    return {
      openaiEnabled: localStorage.getItem('useOpenAI') === 'true',
      openaiApiKey: localStorage.getItem('openAIApiKey') || '',
      supabaseUrl: localStorage.getItem('supabaseUrl') || '',
      supabaseAnonKey: localStorage.getItem('supabaseAnonKey') || '',
      systemPrompt: localStorage.getItem('systemPrompt') || 'You are a helpful AI assistant for a form collection chatbot.'
    };
  }

  private static saveSettingsToLocalStorage(settings: AppSettings): void {
    localStorage.setItem('useOpenAI', settings.openaiEnabled.toString());
    localStorage.setItem('openAIApiKey', settings.openaiApiKey);
    localStorage.setItem('supabaseUrl', settings.supabaseUrl);
    localStorage.setItem('supabaseAnonKey', settings.supabaseAnonKey);
    localStorage.setItem('systemPrompt', settings.systemPrompt);
  }

  // Get individual setting
  static async getSetting(key: string): Promise<string | null> {
    try {
      if (!isSupabaseConfigured()) {
        return localStorage.getItem(key);
      }

      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', key)
        .single();

      if (error) throw error;
      return data?.setting_value || null;
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return localStorage.getItem(key);
    }
  }

  // Set individual setting
  static async setSetting(key: string, value: string, type: string = 'text', description: string = ''): Promise<void> {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: key,
          setting_key: key,
          setting_value: value,
          setting_type: type,
          description: description
        });

      if (error) throw error;
      
      // Also save to localStorage
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      // Fallback to localStorage
      localStorage.setItem(key, value);
      throw error;
    }
  }
}