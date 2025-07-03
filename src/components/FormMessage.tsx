import React, { useState } from 'react';
import { Send, Download } from 'lucide-react';
import { FormDefinition, FormField, FormSubmission } from '../types/chat';

interface FormMessageProps {
  form: FormDefinition;
  onSubmit: (submission: FormSubmission) => void;
  messageId: string;
}

export function FormMessage({ form, onSubmit, messageId }: FormMessageProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const validateField = (field: FormField, value: any): string => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (field.validation && value) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value.toString())) {
        return field.validation.message || `Invalid ${field.label}`;
      }
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const newErrors: Record<string, string> = {};
    form.fields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Create submission
    const submission: FormSubmission = {
      id: `${messageId}-${Date.now()}`,
      formId: form.id,
      formTitle: form.title,
      data: formData,
      timestamp: new Date(),
      userAgent: navigator.userAgent
    };

    try {
      await onSubmit(submission);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];

    const baseInputClasses = `w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
      error ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className={baseInputClasses}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={baseInputClasses}
            >
              <option value="">Select an option</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={baseInputClasses}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm max-w-md">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-base">{form.title}</h3>
        {form.description && (
          <p className="text-sm text-gray-600 mt-1">{form.description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {form.fields.map(renderField)}

        <div className="pt-3 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {form.submitText || 'Submit'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}