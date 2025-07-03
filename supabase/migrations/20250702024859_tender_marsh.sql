/*
  # Application Settings Table

  1. New Tables
    - `app_settings`
      - `id` (text, primary key) - Setting identifier
      - `setting_key` (text) - Setting name/key
      - `setting_value` (text) - Setting value (encrypted for sensitive data)
      - `setting_type` (text) - Type of setting (api_key, url, boolean, etc.)
      - `is_encrypted` (boolean) - Whether the value is encrypted
      - `description` (text) - Setting description
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on app_settings table
    - Add policies for public access (adjust as needed)
*/

-- Application Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
  id text PRIMARY KEY,
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  setting_type text DEFAULT 'text',
  is_encrypted boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access on app_settings"
  ON app_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert on app_settings"
  ON app_settings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on app_settings"
  ON app_settings
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public delete on app_settings"
  ON app_settings
  FOR DELETE
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_settings_type ON app_settings(setting_type);

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO app_settings (id, setting_key, setting_value, setting_type, description) VALUES
  ('openai_enabled', 'openai_enabled', 'false', 'boolean', 'Enable OpenAI integration'),
  ('openai_api_key', 'openai_api_key', '', 'api_key', 'OpenAI API Key'),
  ('supabase_url', 'supabase_url', '', 'url', 'Supabase Project URL'),
  ('supabase_anon_key', 'supabase_anon_key', '', 'api_key', 'Supabase Anonymous Key'),
  ('system_prompt', 'system_prompt', 'You are a helpful AI assistant for a form collection chatbot.', 'text', 'System prompt for AI responses')
ON CONFLICT (setting_key) DO NOTHING;