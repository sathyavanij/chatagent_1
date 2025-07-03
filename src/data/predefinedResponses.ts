import { PredefinedResponse } from '../types/chat';
import { formTemplates } from './formTemplates';

export const predefinedResponses: PredefinedResponse[] = [
  {
    trigger: ['hello', 'hi', 'hey', 'greetings'],
    response: 'Hello! I\'m your AI assistant. How can I help you today?',
    category: 'greeting'
  },
  {
    trigger: ['how are you', 'how are you doing', 'what\'s up'],
    response: 'I\'m doing great, thank you for asking! I\'m here and ready to help you with any questions or tasks you might have.',
    category: 'greeting'
  },
  {
    trigger: ['what can you do', 'help', 'capabilities', 'what are your features'],
    response: 'I can help you with a variety of tasks including answering questions, providing information, helping with problem-solving, and collecting information through forms. I can also export form data to Excel files for easy management.',
    category: 'help'
  },
  {
    trigger: ['contact form', 'contact info', 'get in touch', 'contact details'],
    response: 'I\'d be happy to collect your contact information! Please fill out this form:',
    category: 'form',
    isForm: true,
    formData: formTemplates.contact
  },
  {
    trigger: ['feedback', 'review', 'rate us', 'feedback form'],
    response: 'We\'d love to hear your feedback! Please fill out this form to share your thoughts:',
    category: 'form',
    isForm: true,
    formData: formTemplates.feedback
  },
  {
    trigger: ['survey', 'questionnaire', 'customer survey'],
    response: 'Help us improve by participating in our quick survey:',
    category: 'form',
    isForm: true,
    formData: formTemplates.survey
  },
  {
    trigger: ['appointment', 'book meeting', 'schedule', 'book appointment'],
    response: 'I\'ll help you book an appointment. Please fill out this form:',
    category: 'form',
    isForm: true,
    formData: formTemplates.appointment
  },
  {
    trigger: ['weather', 'temperature', 'forecast'],
    response: 'I\'d be happy to help with weather information! However, I don\'t have access to real-time weather data. You might want to check a weather app or website like Weather.com or AccuWeather for current conditions.',
    category: 'information'
  },
  {
    trigger: ['time', 'what time is it', 'current time'],
    response: `The current time is ${new Date().toLocaleTimeString()}. Please note that this is based on your local system time.`,
    category: 'information'
  },
  {
    trigger: ['date', 'what date is it', 'today'],
    response: `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
    category: 'information'
  },
  {
    trigger: ['thank you', 'thanks', 'appreciate'],
    response: 'You\'re very welcome! I\'m glad I could help. Is there anything else you\'d like to know or discuss?',
    category: 'courtesy'
  },
  {
    trigger: ['bye', 'goodbye', 'see you later', 'farewell'],
    response: 'Goodbye! It was great chatting with you. Feel free to come back anytime you need assistance!',
    category: 'farewell'
  },
  {
    trigger: ['joke', 'tell me a joke', 'funny'],
    response: 'Why don\'t scientists trust atoms? Because they make up everything! 😄',
    category: 'entertainment'
  },
  {
    trigger: ['programming', 'coding', 'development', 'software'],
    response: 'I love talking about programming! Whether you need help with debugging, learning new concepts, or discussing best practices, I\'m here to help. What specific programming topic interests you?',
    category: 'technical'
  },
  {
    trigger: ['export data', 'download excel', 'export forms', 'download data'],
    response: 'I can help you export form submissions to Excel! All form data is automatically saved and can be downloaded as an Excel file. Would you like me to generate an export of all collected data?',
    category: 'export'
  }
];