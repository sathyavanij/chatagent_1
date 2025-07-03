import { FormDefinition } from '../types/chat';

export const formTemplates: Record<string, FormDefinition> = {
  contact: {
    id: 'contact',
    title: 'Contact Information',
    description: 'Please fill out your contact details so we can get in touch with you.',
    fields: [
      {
        id: 'firstName',
        type: 'text',
        label: 'First Name',
        placeholder: 'Enter your first name',
        required: true
      },
      {
        id: 'lastName',
        type: 'text',
        label: 'Last Name',
        placeholder: 'Enter your last name',
        required: true
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email address',
        required: true,
        validation: {
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
          message: 'Please enter a valid email address'
        }
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Phone Number',
        placeholder: 'Enter your phone number',
        required: false
      },
      {
        id: 'company',
        type: 'text',
        label: 'Company',
        placeholder: 'Enter your company name',
        required: false
      }
    ],
    submitText: 'Submit Contact Info'
  },
  
  feedback: {
    id: 'feedback',
    title: 'Feedback Form',
    description: 'We value your feedback! Please share your thoughts with us.',
    fields: [
      {
        id: 'name',
        type: 'text',
        label: 'Your Name',
        placeholder: 'Enter your name',
        required: true
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email',
        required: true
      },
      {
        id: 'rating',
        type: 'select',
        label: 'Overall Rating',
        required: true,
        options: ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor']
      },
      {
        id: 'category',
        type: 'select',
        label: 'Feedback Category',
        required: true,
        options: ['Product Quality', 'Customer Service', 'Website Experience', 'Pricing', 'Other']
      },
      {
        id: 'comments',
        type: 'textarea',
        label: 'Additional Comments',
        placeholder: 'Please share your detailed feedback...',
        required: false
      }
    ],
    submitText: 'Submit Feedback'
  },

  survey: {
    id: 'survey',
    title: 'Customer Survey',
    description: 'Help us improve by answering a few quick questions.',
    fields: [
      {
        id: 'customerType',
        type: 'select',
        label: 'Customer Type',
        required: true,
        options: ['New Customer', 'Existing Customer', 'Potential Customer']
      },
      {
        id: 'age',
        type: 'select',
        label: 'Age Group',
        required: false,
        options: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+']
      },
      {
        id: 'frequency',
        type: 'select',
        label: 'How often do you use our service?',
        required: true,
        options: ['Daily', 'Weekly', 'Monthly', 'Rarely', 'First time']
      },
      {
        id: 'recommendation',
        type: 'select',
        label: 'Would you recommend us to others?',
        required: true,
        options: ['Definitely', 'Probably', 'Maybe', 'Probably not', 'Definitely not']
      },
      {
        id: 'improvements',
        type: 'textarea',
        label: 'What improvements would you suggest?',
        placeholder: 'Share your suggestions...',
        required: false
      }
    ],
    submitText: 'Submit Survey'
  },

  appointment: {
    id: 'appointment',
    title: 'Book an Appointment',
    description: 'Schedule a meeting with our team.',
    fields: [
      {
        id: 'fullName',
        type: 'text',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        required: true
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email',
        required: true
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Phone Number',
        placeholder: 'Enter your phone number',
        required: true
      },
      {
        id: 'appointmentType',
        type: 'select',
        label: 'Appointment Type',
        required: true,
        options: ['Consultation', 'Demo', 'Support', 'Sales Meeting', 'Other']
      },
      {
        id: 'preferredDate',
        type: 'date',
        label: 'Preferred Date',
        required: true
      },
      {
        id: 'message',
        type: 'textarea',
        label: 'Additional Message',
        placeholder: 'Tell us more about your needs...',
        required: false
      }
    ],
    submitText: 'Book Appointment'
  }
};