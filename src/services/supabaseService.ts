import { supabase, FormConfiguration, FormSubmissionRecord, CustomQARecord } from '../lib/supabase';
import { FormDefinition, FormSubmission, PredefinedResponse } from '../types/chat';

export class SupabaseService {
  // Generate exactly 6-digit unique ID (keeping your existing system)
  static generateUniqueId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const combined = (timestamp + random).toString();
    const id = combined.slice(-6);
    return id.padStart(6, '0');
  }

  // Form Configuration Management
  static async saveFormConfiguration(form: FormDefinition): Promise<void> {
    try {
      // Ensure form has unique ID
      if (!form.id || form.id === 'custom-form') {
        form.id = `form_${this.generateUniqueId()}`;
      }

      // First, set all other forms as inactive
      await supabase
        .from('form_configurations')
        .update({ is_active: false })
        .neq('form_id', form.id);

      // Insert or update the current form as active
      const { error } = await supabase
        .from('form_configurations')
        .upsert({
          form_id: form.id,
          title: form.title,
          description: form.description,
          fields: form.fields,
          submit_text: form.submitText,
          is_active: true
        });

      if (error) throw error;

      console.log(`Form configuration saved with ID: ${form.id}`);
    } catch (error) {
      console.error('Error saving form configuration:', error);
      throw error;
    }
  }

  static async loadFormConfiguration(): Promise<FormDefinition | null> {
    try {
      const { data, error } = await supabase
        .from('form_configurations')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        id: data.form_id,
        title: data.title,
        description: data.description,
        fields: data.fields,
        submitText: data.submit_text
      };
    } catch (error) {
      console.error('Error loading form configuration:', error);
      return null;
    }
  }

  static async getAllFormConfigurations(): Promise<FormConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('form_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading all form configurations:', error);
      return [];
    }
  }

  // Form Submissions Management
  static async saveFormSubmission(submission: FormSubmission): Promise<void> {
    try {
      // Generate unique ID if not present
      const submissionId = submission.id || `sub_${this.generateUniqueId()}`;

      const { error } = await supabase
        .from('form_submissions')
        .insert({
          id: submissionId,
          form_id: submission.formId,
          form_title: submission.formTitle,
          submission_data: submission.data,
          user_agent: submission.userAgent
        });

      if (error) throw error;

      console.log(`Form submission saved with ID: ${submissionId}`);
    } catch (error) {
      console.error('Error saving form submission:', error);
      throw error;
    }
  }

  static async loadFormSubmissions(): Promise<FormSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((record: FormSubmissionRecord) => ({
        id: record.id,
        formId: record.form_id || 'unknown',
        formTitle: record.form_title,
        data: record.submission_data,
        timestamp: new Date(record.created_at),
        userAgent: record.user_agent
      }));
    } catch (error) {
      console.error('Error loading form submissions:', error);
      throw error;
    }
  }

  static async updateFormSubmission(id: string, updates: Partial<any>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('form_submissions')
        .update({
          submission_data: updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating form submission:', error);
      return false;
    }
  }

  static async deleteFormSubmission(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('form_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting form submission:', error);
      return false;
    }
  }

  // Custom Q&A Management
  static async saveCustomQA(qaList: PredefinedResponse[]): Promise<void> {
    try {
      // First, deactivate all existing Q&A
      await supabase
        .from('custom_qa')
        .update({ is_active: false })
        .eq('is_active', true);

      // Prepare Q&A data with unique IDs
      const qaData = qaList.map(qa => ({
        id: qa.id || `qa_${this.generateUniqueId()}`,
        question_keywords: qa.trigger,
        response_text: qa.response,
        category: qa.category,
        is_form: qa.isForm || false,
        form_id: qa.formData?.id,
        is_active: true
      }));

      // Insert new Q&A data
      const { error } = await supabase
        .from('custom_qa')
        .upsert(qaData);

      if (error) throw error;

      console.log('Custom Q&A saved to Supabase');
    } catch (error) {
      console.error('Error saving custom Q&A:', error);
      throw error;
    }
  }

  static async loadCustomQA(): Promise<PredefinedResponse[]> {
    try {
      const { data, error } = await supabase
        .from('custom_qa')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((record: CustomQARecord) => ({
        id: record.id,
        trigger: record.question_keywords,
        response: record.response_text,
        category: record.category,
        isForm: record.is_form,
        formData: record.form_id ? { id: record.form_id } : undefined
      }));
    } catch (error) {
      console.error('Error loading custom Q&A:', error);
      throw error;
    }
  }

  // Analytics and Statistics
  static async getSubmissionStats(): Promise<any> {
    try {
      // Get total submissions count
      const { count: totalSubmissions } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true });

      // Get submissions by form type
      const { data: formTypeData, error: formTypeError } = await supabase
        .from('form_submissions')
        .select('form_title')
        .order('created_at', { ascending: false });

      if (formTypeError) throw formTypeError;

      // Calculate form type distribution
      const formTypeCount = (formTypeData || []).reduce((acc: any, submission: any) => {
        acc[submission.form_title] = (acc[submission.form_title] || 0) + 1;
        return acc;
      }, {});

      // Get recent submissions for daily analysis
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentData, error: recentError } = await supabase
        .from('form_submissions')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (recentError) throw recentError;

      // Calculate daily submissions
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toLocaleDateString();
      }).reverse();

      const dailySubmissions = last7Days.map(date => {
        const count = (recentData || []).filter(s => 
          new Date(s.created_at).toLocaleDateString() === date
        ).length;
        return { date, count };
      });

      return {
        totalSubmissions: totalSubmissions || 0,
        formTypeCount,
        dailySubmissions,
        averagePerDay: ((totalSubmissions || 0) / 7).toFixed(1)
      };
    } catch (error) {
      console.error('Error getting submission stats:', error);
      return {
        totalSubmissions: 0,
        formTypeCount: {},
        dailySubmissions: [],
        averagePerDay: '0'
      };
    }
  }

  // Real-time subscriptions
  static subscribeToSubmissions(callback: (payload: any) => void) {
    try {
      return supabase
        .channel('form_submissions')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'form_submissions' }, 
          callback
        )
        .subscribe();
    } catch (error) {
      console.error('Error setting up subscription:', error);
      // Return a dummy subscription object
      return {
        unsubscribe: () => {}
      };
    }
  }

  static subscribeToFormConfigurations(callback: (payload: any) => void) {
    try {
      return supabase
        .channel('form_configurations')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'form_configurations' }, 
          callback
        )
        .subscribe();
    } catch (error) {
      console.error('Error setting up subscription:', error);
      // Return a dummy subscription object
      return {
        unsubscribe: () => {}
      };
    }
  }

  // Data export for Excel compatibility
  static async exportAllData(): Promise<any> {
    try {
      const [forms, submissions, qa] = await Promise.all([
        this.getAllFormConfigurations(),
        this.loadFormSubmissions(),
        this.loadCustomQA()
      ]);

      return {
        forms,
        submissions,
        qa,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }
}