import { createClient } from '@supabase/supabase-js';

// Default fallback values - will be replaced by database settings
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create initial client with fallback values or placeholder
let supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

// Function to update Supabase client with new credentials
export const updateSupabaseClient = (url: string, anonKey: string) => {
  if (url && anonKey && url !== 'https://placeholder.supabase.co' && anonKey !== 'placeholder-key') {
    try {
      supabaseUrl = url;
      supabaseAnonKey = anonKey;
      supabase = createClient(url, anonKey);
      console.log('Supabase client updated with new credentials');
      return true;
    } catch (error) {
      console.error('Error updating Supabase client:', error);
      return false;
    }
  }
  return false;
};

// Function to get current credentials
export const getSupabaseCredentials = () => ({
  url: supabaseUrl,
  anonKey: supabaseAnonKey
});

// Function to test connection
export const testSupabaseConnection = async (url: string, anonKey: string): Promise<boolean> => {
  try {
    if (!url || !anonKey || url === 'https://placeholder.supabase.co' || anonKey === 'placeholder-key') {
      return false;
    }
    
    const testClient = createClient(url, anonKey);
    const { error } = await testClient.from('app_settings').select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};

// Function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && 
           supabaseAnonKey && 
           supabaseUrl !== 'https://placeholder.supabase.co' && 
           supabaseAnonKey !== 'placeholder-key');
};

export { supabase };

// Database types
export interface FormConfiguration {
  form_id: string;
  title: string;
  description?: string;
  fields: any[];
  submit_text?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormSubmissionRecord {
  id: string;
  form_id?: string;
  form_title: string;
  submission_data: Record<string, any>;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomQARecord {
  id: string;
  question_keywords: string[];
  response_text: string;
  category: string;
  is_form: boolean;
  form_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSettingRecord {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  is_encrypted: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}