export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
  isForm?: boolean;
  formData?: FormDefinition;
}

export interface PredefinedResponse {
  id?: string;
  trigger: string[];
  response: string;
  category: string;
  isForm?: boolean;
  formData?: FormDefinition;
}

export interface ChatConfig {
  useOpenAI: boolean;
  openAIApiKey?: string;
  systemPrompt: string;
  predefinedResponses: PredefinedResponse[];
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'date' | 'number';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    pattern?: string;
    message?: string;
  };
}

export interface FormDefinition {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitText?: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  data: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
}