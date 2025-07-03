import * as XLSX from 'xlsx';
import { FormSubmission, FormDefinition, FormField, PredefinedResponse } from '../types/chat';

export class ExcelDatabaseService {
  private static SUBMISSIONS_FILE = '/data/form_submissions.xlsx';
  private static CONFIG_FILE = '/data/form_config.xlsx';

  // Generate exactly 6-digit unique ID
  static generateUniqueId(): string {
    // Use timestamp and random to ensure uniqueness
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    
    // Combine and take last 6 digits, pad with zeros if needed
    const combined = (timestamp + random).toString();
    const id = combined.slice(-6);
    
    // Ensure exactly 6 digits by padding with zeros if needed
    return id.padStart(6, '0');
  }

  // Generate sheet name with 6-digit ID
  static generateSheetName(form: FormDefinition): string {
    const uniqueId = this.generateUniqueId();
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const formName = form.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    return `${formName}_${uniqueId}_${timestamp}`;
  }

  // Extract ID from sheet name
  static extractIdFromSheetName(sheetName: string): string {
    const parts = sheetName.split('_');
    if (parts.length >= 2) {
      const idPart = parts[1];
      if (idPart && idPart.length === 6 && /^\d{6}$/.test(idPart)) {
        return idPart;
      }
    }
    return '';
  }

  // Get current active form configuration
  static getCurrentFormConfig(): FormDefinition | null {
    const savedForm = localStorage.getItem('activeForm');
    if (savedForm) {
      try {
        return JSON.parse(savedForm);
      } catch (error) {
        console.error('Error loading active form:', error);
      }
    }
    return null;
  }

  // Get all existing sheets from localStorage
  static getAllSheets(): Record<string, any[]> {
    const allSheets = localStorage.getItem('allExcelSheets');
    if (allSheets) {
      try {
        return JSON.parse(allSheets);
      } catch (error) {
        console.error('Error loading all sheets:', error);
      }
    }
    return {};
  }

  // Save all sheets to localStorage
  static saveAllSheets(sheets: Record<string, any[]>): void {
    localStorage.setItem('allExcelSheets', JSON.stringify(sheets));
  }

  // Get current active sheet name
  static getCurrentActiveSheet(): string {
    return localStorage.getItem('currentActiveSheet') || 'Submissions';
  }

  // Set current active sheet
  static setCurrentActiveSheet(sheetName: string): void {
    localStorage.setItem('currentActiveSheet', sheetName);
  }

  // Get sheet metadata including IDs
  static getSheetMetadata(): Array<{
    name: string;
    id: string;
    formName: string;
    date: string;
    rowCount: number;
    isActive: boolean;
  }> {
    const allSheets = this.getAllSheets();
    const currentActiveSheet = this.getCurrentActiveSheet();
    
    return Object.entries(allSheets).map(([sheetName, data]) => {
      const id = this.extractIdFromSheetName(sheetName);
      const parts = sheetName.split('_');
      const formName = parts[0] || 'Unknown';
      const date = parts[2] || 'Unknown';
      
      return {
        name: sheetName,
        id: id || 'N/A',
        formName,
        date,
        rowCount: data.length,
        isActive: sheetName === currentActiveSheet
      };
    }).sort((a, b) => {
      // Sort by active first, then by date descending
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return b.date.localeCompare(a.date);
    });
  }

  // Find sheet by ID
  static findSheetById(id: string): string | null {
    const allSheets = this.getAllSheets();
    for (const sheetName of Object.keys(allSheets)) {
      if (this.extractIdFromSheetName(sheetName) === id) {
        return sheetName;
      }
    }
    return null;
  }

  // Form Submissions Management
  static async loadFormSubmissions(): Promise<FormSubmission[]> {
    try {
      // Load from current active sheet
      const currentSheet = this.getCurrentActiveSheet();
      const allSheets = this.getAllSheets();
      
      if (allSheets[currentSheet]) {
        return allSheets[currentSheet].map((row: any) => ({
          id: row.ID || `sub_${this.generateUniqueId()}`,
          formId: row.Form_Type || 'unknown',
          formTitle: row.Form_Type || 'Unknown Form',
          data: this.extractFormDataFromRow(row),
          timestamp: new Date(row.Submission_Date || Date.now()),
          userAgent: row.User_Agent || navigator.userAgent
        }));
      }

      // Fallback to localStorage formSubmissions
      const localData = localStorage.getItem('formSubmissions');
      if (localData) {
        try {
          const submissions = JSON.parse(localData);
          return submissions.map((s: any) => ({
            ...s,
            timestamp: new Date(s.timestamp)
          }));
        } catch (error) {
          console.error('Error parsing localStorage data:', error);
        }
      }

      return [];
    } catch (error) {
      console.error('Error loading form submissions:', error);
      return [];
    }
  }

  // Extract form data from Excel row based on current form config
  static extractFormDataFromRow(row: any): Record<string, any> {
    const currentForm = this.getCurrentFormConfig();
    const data: Record<string, any> = {};

    if (currentForm) {
      currentForm.fields.forEach(field => {
        // Use field label as column name for extraction
        const columnName = field.label;
        data[field.id] = row[columnName] || '';
      });
    } else {
      // Fallback to standard fields
      data.name = row.Name || '';
      data.email = row.Email || '';
      data.phone = row.Phone || '';
      data.company = row.Company || '';
      data.message = row.Message || '';
    }

    return data;
  }

  // Get column name for form field - now uses the field label directly
  static getColumnName(field: FormField): string {
    return field.label; // Use the actual label instead of sanitized version
  }

  // Create new sheet when form configuration changes
  static createNewSheetForForm(form: FormDefinition): string {
    const newSheetName = this.generateSheetName(form);
    const allSheets = this.getAllSheets();
    
    // Create empty sheet with proper column structure
    allSheets[newSheetName] = [];
    
    // Save updated sheets
    this.saveAllSheets(allSheets);
    
    // Set as current active sheet
    this.setCurrentActiveSheet(newSheetName);
    
    const sheetId = this.extractIdFromSheetName(newSheetName);
    console.log(`Created new sheet: ${newSheetName} (ID: ${sheetId}) for form: ${form.title}`);
    return newSheetName;
  }

  static async saveFormSubmission(submission: FormSubmission): Promise<void> {
    try {
      const currentForm = this.getCurrentFormConfig();
      const currentSheet = this.getCurrentActiveSheet();
      const allSheets = this.getAllSheets();

      // Ensure current sheet exists
      if (!allSheets[currentSheet]) {
        allSheets[currentSheet] = [];
      }

      // Generate unique 6-digit ID for this submission
      const submissionId = submission.id || `sub_${this.generateUniqueId()}`;

      // Convert submission to Excel row format based on current form
      const excelRow: any = {
        ID: submissionId,
        Sheet_ID: this.extractIdFromSheetName(currentSheet),
        Form_Type: submission.formTitle,
        Submission_Date: submission.timestamp.toLocaleDateString(),
        Submission_Time: submission.timestamp.toLocaleTimeString(),
        User_Agent: submission.userAgent || ''
      };

      // Add form-specific fields using field labels as column names
      if (currentForm) {
        currentForm.fields.forEach(field => {
          // Use field label directly as column name
          const columnName = field.label;
          excelRow[columnName] = submission.data[field.id] || '';
        });
      } else {
        // Fallback to standard fields
        excelRow.Name = submission.data.name || '';
        excelRow.Email = submission.data.email || '';
        excelRow.Phone = submission.data.phone || '';
        excelRow.Company = submission.data.company || '';
        excelRow.Message = submission.data.message || '';
      }

      // Add to current sheet
      allSheets[currentSheet].push(excelRow);

      // Save all sheets
      this.saveAllSheets(allSheets);

      // Also save to localStorage as backup
      const existingSubmissions = JSON.parse(localStorage.getItem('formSubmissions') || '[]');
      const updatedSubmission = { ...submission, id: submissionId };
      existingSubmissions.push(updatedSubmission);
      localStorage.setItem('formSubmissions', JSON.stringify(existingSubmissions));

      const sheetId = this.extractIdFromSheetName(currentSheet);
      console.log(`Form submission saved to sheet: ${currentSheet} (ID: ${sheetId})`, {
        submissionId,
        sheetId,
        submission: updatedSubmission
      });
    } catch (error) {
      console.error('Error saving form submission:', error);
    }
  }

  // Form Configuration Management
  static async loadFormConfiguration(): Promise<FormDefinition | null> {
    // Load from localStorage first
    const savedForm = localStorage.getItem('activeForm');
    if (savedForm) {
      try {
        return JSON.parse(savedForm);
      } catch (error) {
        console.error('Error loading active form:', error);
      }
    }

    // Fallback to config file
    try {
      const response = await fetch(this.CONFIG_FILE);
      if (!response.ok) {
        return null;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets['Form_Fields'];
      
      if (!worksheet) {
        return null;
      }
      
      const data = XLSX.utils.sheet_to_json(worksheet);
      if (data.length === 0) {
        return null;
      }
      
      // Group fields by form ID
      const formGroups = data.reduce((acc: any, row: any) => {
        const formId = row.Form_ID || 'default';
        if (!acc[formId]) {
          acc[formId] = [];
        }
        acc[formId].push(row);
        return acc;
      }, {});
      
      // Take the first form (assuming single form for now)
      const firstFormId = Object.keys(formGroups)[0];
      const formFields = formGroups[firstFormId];
      
      const fields: FormField[] = formFields.map((row: any) => ({
        id: row.Field_ID || `field_${this.generateUniqueId()}`,
        type: row.Field_Type || 'text',
        label: row.Label || 'Field',
        placeholder: row.Placeholder || '',
        required: row.Required === 'TRUE' || row.Required === true,
        options: row.Options ? row.Options.split(',').map((opt: string) => opt.trim()) : undefined,
        validation: row.Validation_Pattern ? {
          pattern: row.Validation_Pattern,
          message: row.Validation_Message || 'Invalid input'
        } : undefined
      }));
      
      return {
        id: firstFormId,
        title: 'Contact Form',
        description: 'Please fill out your information',
        fields,
        submitText: 'Submit'
      };
    } catch (error) {
      console.error('Error loading form configuration:', error);
      return null;
    }
  }

  static async saveFormConfiguration(form: FormDefinition): Promise<void> {
    try {
      // Assign unique ID to form if not present
      if (!form.id || form.id === 'custom-form') {
        form.id = `form_${this.generateUniqueId()}`;
      }

      // Save to localStorage immediately
      localStorage.setItem('activeForm', JSON.stringify(form));
      
      // Create new sheet for this form configuration
      const newSheetName = this.createNewSheetForForm(form);
      const sheetId = this.extractIdFromSheetName(newSheetName);
      
      console.log(`Form configuration saved with ID: ${form.id} and new sheet created: ${newSheetName} (Sheet ID: ${sheetId})`, form);
    } catch (error) {
      console.error('Error saving form configuration:', error);
    }
  }

  // Custom Q&A Management
  static async loadCustomQA(): Promise<PredefinedResponse[]> {
    try {
      const response = await fetch(this.CONFIG_FILE);
      if (!response.ok) {
        return [];
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets['Custom_QA'];
      
      if (!worksheet) {
        return [];
      }
      
      const data = XLSX.utils.sheet_to_json(worksheet);
      return data.map((row: any) => ({
        id: row.ID || `qa_${this.generateUniqueId()}`,
        trigger: row.Question_Keywords ? row.Question_Keywords.split(',').map((k: string) => k.trim()) : [],
        response: row.Response_Text || '',
        category: row.Category || 'custom',
        isForm: row.Is_Form === 'TRUE',
        formData: row.Form_ID ? { id: row.Form_ID } : undefined
      }));
    } catch (error) {
      console.error('Error loading custom Q&A:', error);
      return [];
    }
  }

  static async saveCustomQA(qaList: PredefinedResponse[]): Promise<void> {
    try {
      // Assign unique IDs to Q&A items if not present
      const qaWithIds = qaList.map(qa => ({
        ...qa,
        id: qa.id || `qa_${this.generateUniqueId()}`
      }));

      // Save to localStorage for now
      localStorage.setItem('customQA', JSON.stringify(qaWithIds));
      console.log('Custom Q&A saved to localStorage with IDs:', qaWithIds);
    } catch (error) {
      console.error('Error saving custom Q&A:', error);
    }
  }

  // Excel File Management for Admin - Shows real-time data with multiple sheets
  static async getExcelFileContent(filename: string): Promise<any> {
    try {
      // For submissions, get all sheets from localStorage
      if (filename === 'submissions') {
        const allSheets = this.getAllSheets();
        const currentActiveSheet = this.getCurrentActiveSheet();
        
        // If no sheets exist, create default structure
        if (Object.keys(allSheets).length === 0) {
          const localData = localStorage.getItem('formSubmissions');
          if (localData) {
            try {
              const submissions = JSON.parse(localData);
              const excelData = submissions.map((sub: any) => ({
                ID: sub.id || `sub_${this.generateUniqueId()}`,
                Sheet_ID: '000001', // Default sheet ID for legacy data
                Form_Type: sub.formTitle,
                Submission_Date: new Date(sub.timestamp).toLocaleDateString(),
                Submission_Time: new Date(sub.timestamp).toLocaleTimeString(),
                Name: sub.data.name || '',
                Email: sub.data.email || '',
                Phone: sub.data.phone || '',
                Company: sub.data.company || '',
                Message: sub.data.message || '',
                User_Agent: sub.userAgent || ''
              }));
              
              allSheets['Submissions_000001_History'] = excelData;
              this.saveAllSheets(allSheets);
            } catch (error) {
              console.error('Error parsing localStorage data:', error);
            }
          }
        }
        
        return {
          filename: filename,
          sheets: allSheets,
          activeSheet: currentActiveSheet,
          metadata: this.getSheetMetadata()
        };
      }
      
      // For config file, try to load from actual file
      const filePath = this.CONFIG_FILE;
      const response = await fetch(filePath);
      if (!response.ok) {
        return {
          filename: filename,
          sheets: {
            'Form_Fields': [],
            'Custom_QA': []
          }
        };
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const result: any = {
        filename: filename,
        sheets: {}
      };
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        result.sheets[sheetName] = data;
      });
      
      return result;
    } catch (error) {
      console.error('Error reading Excel file:', error);
      return {
        filename: filename,
        sheets: {}
      };
    }
  }

  // Only download when explicitly requested - no auto downloads
  static downloadExcelFile(filename: string): void {
    try {
      if (filename === 'submissions') {
        // Create Excel file from all sheets
        const allSheets = this.getAllSheets();
        
        if (Object.keys(allSheets).length === 0) {
          alert('No data to download');
          return;
        }
        
        const workbook = XLSX.utils.book_new();
        
        // Add each sheet to workbook with metadata
        Object.entries(allSheets).forEach(([sheetName, sheetData]) => {
          if (sheetData && sheetData.length > 0) {
            // Add metadata row at the top
            const sheetId = this.extractIdFromSheetName(sheetName);
            const metadataRow = {
              ID: `SHEET_METADATA`,
              Sheet_ID: sheetId,
              Form_Type: `Sheet: ${sheetName}`,
              Submission_Date: new Date().toLocaleDateString(),
              Submission_Time: new Date().toLocaleTimeString(),
              User_Agent: `Sheet ID: ${sheetId} | Generated: ${new Date().toISOString()}`
            };
            
            const dataWithMetadata = [metadataRow, ...sheetData];
            const worksheet = XLSX.utils.json_to_sheet(dataWithMetadata);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
          }
        });
        
        // If no sheets were added, create empty sheet
        if (workbook.SheetNames.length === 0) {
          const emptySheet = XLSX.utils.json_to_sheet([]);
          XLSX.utils.book_append_sheet(workbook, emptySheet, 'No_Data');
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `form_submissions_with_ids_${timestamp}.xlsx`);
        return;
      }
      
      // For config file, download the actual file
      const filePath = filename === 'submissions' ? this.SUBMISSIONS_FILE : this.CONFIG_FILE;
      const link = document.createElement('a');
      link.href = filePath;
      link.download = filename === 'submissions' ? 'form_submissions.xlsx' : 'form_config.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Excel file:', error);
    }
  }

  // Get sheet statistics with IDs
  static getSheetStatistics(): any {
    const allSheets = this.getAllSheets();
    const currentActiveSheet = this.getCurrentActiveSheet();
    const currentForm = this.getCurrentFormConfig();
    const metadata = this.getSheetMetadata();
    
    return {
      totalSheets: Object.keys(allSheets).length,
      currentActiveSheet,
      currentActiveSheetId: this.extractIdFromSheetName(currentActiveSheet),
      currentFormTitle: currentForm?.title || 'No Form',
      currentFormId: currentForm?.id || 'N/A',
      sheetsInfo: metadata
    };
  }

  // Utility method to modify data by ID
  static modifySubmissionById(submissionId: string, updates: Partial<any>): boolean {
    try {
      const allSheets = this.getAllSheets();
      let found = false;
      
      // Search through all sheets
      Object.entries(allSheets).forEach(([sheetName, sheetData]) => {
        const rowIndex = sheetData.findIndex(row => row.ID === submissionId);
        if (rowIndex !== -1) {
          // Update the row
          allSheets[sheetName][rowIndex] = {
            ...allSheets[sheetName][rowIndex],
            ...updates,
            Modified_Date: new Date().toLocaleDateString(),
            Modified_Time: new Date().toLocaleTimeString()
          };
          found = true;
        }
      });
      
      if (found) {
        this.saveAllSheets(allSheets);
        console.log(`Submission ${submissionId} updated successfully`);
        return true;
      } else {
        console.warn(`Submission ${submissionId} not found`);
        return false;
      }
    } catch (error) {
      console.error('Error modifying submission:', error);
      return false;
    }
  }

  // Utility method to delete data by ID
  static deleteSubmissionById(submissionId: string): boolean {
    try {
      const allSheets = this.getAllSheets();
      let found = false;
      
      // Search through all sheets
      Object.entries(allSheets).forEach(([sheetName, sheetData]) => {
        const rowIndex = sheetData.findIndex(row => row.ID === submissionId);
        if (rowIndex !== -1) {
          // Remove the row
          allSheets[sheetName].splice(rowIndex, 1);
          found = true;
        }
      });
      
      if (found) {
        this.saveAllSheets(allSheets);
        console.log(`Submission ${submissionId} deleted successfully`);
        return true;
      } else {
        console.warn(`Submission ${submissionId} not found`);
        return false;
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      return false;
    }
  }
}