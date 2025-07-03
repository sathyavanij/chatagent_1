import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  FileText, 
  BarChart3, 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Edit3,
  Key,
  Globe,
  TestTube,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import { ExcelViewer } from '../components/ExcelViewer';
import { FormDefinition, FormField, PredefinedResponse } from '../types/chat';
import { ExcelDatabaseService } from '../services/excelDatabaseService';
import { SupabaseService } from '../services/supabaseService';
import { SettingsService, AppSettings } from '../services/settingsService';
import { ExcelService } from '../services/excelService';

interface AdminDashboardProps {
  onSwitchToChat: () => void;
}

export function AdminDashboard({ onSwitchToChat }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'forms' | 'data' | 'analytics' | 'settings'>('forms');
  const [currentForm, setCurrentForm] = useState<FormDefinition>({
    id: 'custom-form',
    title: 'Contact Form',
    description: 'Please fill out your contact information',
    fields: [],
    submitText: 'Submit'
  });
  const [customQA, setCustomQA] = useState<PredefinedResponse[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    openaiEnabled: false,
    openaiApiKey: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    systemPrompt: 'You are a helpful AI assistant for a form collection chatbot.'
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load settings
      const loadedSettings = await SettingsService.loadSettings();
      setSettings(loadedSettings);

      // Load form configuration
      const form = await SupabaseService.loadFormConfiguration();
      if (form) {
        setCurrentForm(form);
      }

      // Load custom Q&A count only (not the actual data)
      try {
        const qa = await SupabaseService.loadCustomQA();
        setCustomQA(qa);
      } catch (error) {
        console.error('Error loading custom Q&A:', error);
        setCustomQA([]);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await SettingsService.saveSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSupabaseConnection = async () => {
    if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
      alert('Please enter both Supabase URL and Anonymous Key');
      return;
    }

    setConnectionStatus('testing');
    try {
      const isConnected = await SettingsService.testSupabaseConnection(
        settings.supabaseUrl,
        settings.supabaseAnonKey
      );
      setConnectionStatus(isConnected ? 'success' : 'error');
      
      if (isConnected) {
        alert('Supabase connection successful!');
      } else {
        alert('Supabase connection failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      alert('Connection test failed. Please check your credentials.');
    }
  };

  const handleSaveForm = async () => {
    setIsLoading(true);
    try {
      await SupabaseService.saveFormConfiguration(currentForm);
      await ExcelDatabaseService.saveFormConfiguration(currentForm);
      alert('Form configuration saved successfully!');
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Error saving form. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `field_${ExcelDatabaseService.generateUniqueId()}`,
      type: 'text',
      label: 'New Field',
      placeholder: 'Enter value...',
      required: false
    };
    setCurrentForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const handleUpdateField = (index: number, field: FormField) => {
    setCurrentForm(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? field : f)
    }));
  };

  const handleRemoveField = (index: number) => {
    setCurrentForm(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const handleDownloadQA = async () => {
    setIsLoading(true);
    try {
      const qa = await SupabaseService.loadCustomQA();
      
      if (qa.length === 0) {
        alert('No Q&A data to download');
        return;
      }

      // Prepare Q&A data for Excel export
      const qaData = qa.map((item, index) => ({
        'Q&A #': index + 1,
        'ID': item.id,
        'Keywords': item.trigger.join(', '),
        'Response': item.response,
        'Category': item.category,
        'Is Form': item.isForm ? 'Yes' : 'No',
        'Form ID': item.formData?.id || '',
        'Created Date': new Date().toLocaleDateString()
      }));

      // Create Excel workbook
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(qaData);
      
      // Auto-size columns
      const colWidths = qaData.length > 0 ? Object.keys(qaData[0]).map(key => {
        const maxLength = Math.max(
          key.length,
          ...qaData.map(row => (row[key as keyof typeof row] ? row[key as keyof typeof row].toString().length : 0))
        );
        return { width: Math.min(Math.max(maxLength + 2, 10), 50) };
      }) : [];
      
      worksheet['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Custom Q&A');

      // Download the file
      const filename = `custom-qa-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      alert(`Downloaded ${qa.length} Q&A entries to ${filename}`);
    } catch (error) {
      console.error('Error downloading Q&A:', error);
      alert('Error downloading Q&A data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormBuilder = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Form ID</label>
            <input
              type="text"
              value={currentForm.id}
              readOnly
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
            <input
              type="text"
              value={currentForm.title}
              onChange={(e) => setCurrentForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={currentForm.description}
              onChange={(e) => setCurrentForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Submit Button Text</label>
            <input
              type="text"
              value={currentForm.submitText}
              onChange={(e) => setCurrentForm(prev => ({ ...prev, submitText: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
          <button
            onClick={handleAddField}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </button>
        </div>
        
        <div className="space-y-4">
          {currentForm.fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">Field ID: {field.id}</span>
                <button
                  onClick={() => handleRemoveField(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => handleUpdateField(index, { ...field, type: e.target.value as any })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Select</option>
                    <option value="date">Date</option>
                    <option value="number">Number</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleUpdateField(index, { ...field, label: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => handleUpdateField(index, { ...field, placeholder: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={field.required || false}
                      onChange={(e) => handleUpdateField(index, { ...field, required: e.target.checked })}
                      className="mr-2"
                    />
                    Required Field
                  </label>
                </div>
                
                {field.type === 'select' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Options (comma-separated)</label>
                    <input
                      type="text"
                      value={field.options?.join(', ') || ''}
                      onChange={(e) => handleUpdateField(index, { 
                        ...field, 
                        options: e.target.value.split(',').map(opt => opt.trim()).filter(Boolean)
                      })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Option 1, Option 2, Option 3"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveForm}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Form'}
          </button>
        </div>
      </div>

      {/* Custom Q&A Section - Now with Download Only */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Custom Q&A Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              {customQA.length > 0 
                ? `${customQA.length} custom Q&A entries available` 
                : 'No custom Q&A entries found'
              }
            </p>
          </div>
          <button
            onClick={handleDownloadQA}
            disabled={isLoading || customQA.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {isLoading ? 'Downloading...' : 'Download Q&A'}
          </button>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <Database className="w-5 h-5" />
            <span className="font-medium">Q&A Data Management</span>
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Download existing Q&A entries as Excel file for review and editing</p>
            <p>• Q&A entries are automatically loaded from the database when the chatbot starts</p>
            <p>• To modify Q&A entries, update them directly in your Supabase database</p>
            <p>• Changes to the database will be reflected in the chatbot after restart</p>
          </div>
        </div>

        {customQA.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-700">
              <p className="font-medium">Current Q&A Statistics:</p>
              <ul className="mt-1 space-y-1">
                <li>• Total entries: {customQA.length}</li>
                <li>• Categories: {[...new Set(customQA.map(qa => qa.category))].join(', ')}</li>
                <li>• Form-linked entries: {customQA.filter(qa => qa.isForm).length}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      {/* PostgreSQL Database Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">PostgreSQL Database Settings</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Globe className="w-4 h-4 inline mr-1" />
              Supabase Project URL
            </label>
            <input
              type="url"
              value={settings.supabaseUrl}
              onChange={(e) => setSettings(prev => ({ ...prev, supabaseUrl: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://your-project.supabase.co"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your Supabase project URL from the project settings
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Key className="w-4 h-4 inline mr-1" />
              Supabase Anonymous Key
            </label>
            <div className="relative">
              <input
                type={showSupabaseKey ? 'text' : 'password'}
                value={settings.supabaseAnonKey}
                onChange={(e) => setSettings(prev => ({ ...prev, supabaseAnonKey: e.target.value }))}
                className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <button
                type="button"
                onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSupabaseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your Supabase anonymous/public key from the API settings
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestSupabaseConnection}
              disabled={connectionStatus === 'testing' || !settings.supabaseUrl || !settings.supabaseAnonKey}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube className="w-4 h-4" />
              {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            
            {connectionStatus === 'success' && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Connected</span>
              </div>
            )}
            
            {connectionStatus === 'error' && (
              <div className="flex items-center gap-1 text-red-600">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Connection Failed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Settings</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.openaiEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, openaiEnabled: e.target.checked }))}
                className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable OpenAI Integration</span>
            </label>
          </div>
          
          {settings.openaiEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Key className="w-4 h-4 inline mr-1" />
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.openaiApiKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your OpenAI API key for AI-powered responses
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => setSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="You are a helpful AI assistant..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Instructions for the AI on how to behave and respond
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );

  const tabs = [
    { id: 'forms', label: 'Form Configuration', icon: FileText },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onSwitchToChat}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Chat
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your chatbot configuration and data</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'forms' && renderFormBuilder()}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <ExcelViewer filename="submissions" title="Form Submissions Database" />
              <ExcelViewer filename="config" title="Form Configuration Database" />
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics Dashboard</h3>
              <p className="text-gray-600">Analytics features coming soon...</p>
            </div>
          )}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </div>
    </div>
  );
}