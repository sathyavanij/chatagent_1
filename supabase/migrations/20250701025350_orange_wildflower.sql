/*
  # Initial Schema for Chatbot Database

  1. New Tables
    - `form_configurations`
      - `id` (text, primary key) - 6-digit form ID
      - `title` (text) - Form title
      - `description` (text) - Form description
      - `fields` (jsonb) - Form fields configuration
      - `submit_text` (text) - Submit button text
      - `is_active` (boolean) - Whether this is the active form
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `form_submissions`
      - `id` (text, primary key) - 6-digit submission ID
      - `form_id` (text) - References form_configurations.id
      - `form_title` (text) - Form title at time of submission
      - `submission_data` (jsonb) - Form data submitted
      - `user_agent` (text) - Browser user agent
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `custom_qa`
      - `id` (text, primary key) - 6-digit Q&A ID
      - `question_keywords` (text[]) - Array of trigger keywords
      - `response_text` (text) - Response content
      - `category` (text) - Q&A category
      - `is_form` (boolean) - Whether response includes a form
      - `form_id` (text) - Optional reference to form_configurations.id
      - `is_active` (boolean) - Whether this Q&A is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since this is a public chatbot)
*/

-- Form Configurations Table
CREATE TABLE IF NOT EXISTS form_configurations (
  form_id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  submit_text text DEFAULT 'Submit',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Form Submissions Table
CREATE TABLE IF NOT EXISTS form_submissions (
  id text PRIMARY KEY,
  form_id text REFERENCES form_configurations(id),
  form_title text NOT NULL,
  submission_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Custom Q&A Table
CREATE TABLE IF NOT EXISTS custom_qa (
  id text PRIMARY KEY,
  question_keywords text[] NOT NULL DEFAULT '{}',
  response_text text NOT NULL,
  category text DEFAULT 'custom',
  is_form boolean DEFAULT false,
  form_id text REFERENCES form_configurations(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE form_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_qa ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access on form_configurations"
  ON form_configurations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert on form_configurations"
  ON form_configurations
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on form_configurations"
  ON form_configurations
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public delete on form_configurations"
  ON form_configurations
  FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access on form_submissions"
  ON form_submissions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert on form_submissions"
  ON form_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on form_submissions"
  ON form_submissions
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public delete on form_submissions"
  ON form_submissions
  FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access on custom_qa"
  ON custom_qa
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert on custom_qa"
  ON custom_qa
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on custom_qa"
  ON custom_qa
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public delete on custom_qa"
  ON custom_qa
  FOR DELETE
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_form_configurations_is_active ON form_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_custom_qa_is_active ON custom_qa(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_qa_category ON custom_qa(category);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_form_configurations_updated_at
    BEFORE UPDATE ON form_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at
    BEFORE UPDATE ON form_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_qa_updated_at
    BEFORE UPDATE ON custom_qa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();