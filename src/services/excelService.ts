import * as XLSX from 'xlsx';
import { FormSubmission } from '../types/chat';
import { ExcelDatabaseService } from './excelDatabaseService';

export class ExcelService {
  static exportFormSubmissions(submissions: FormSubmission[], filename?: string): void {
    if (submissions.length === 0) {
      alert('No form submissions to export');
      return;
    }

    // Get current form configuration to use field labels
    const currentForm = ExcelDatabaseService.getCurrentFormConfig();

    // Group submissions by form type
    const groupedSubmissions = submissions.reduce((acc, submission) => {
      if (!acc[submission.formTitle]) {
        acc[submission.formTitle] = [];
      }
      acc[submission.formTitle].push(submission);
      return acc;
    }, {} as Record<string, FormSubmission[]>);

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create a sheet for each form type
    Object.entries(groupedSubmissions).forEach(([formTitle, formSubmissions]) => {
      const worksheetData = this.prepareWorksheetData(formSubmissions, currentForm);
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Auto-size columns
      const colWidths = this.calculateColumnWidths(worksheetData);
      worksheet['!cols'] = colWidths;
      
      // Add the worksheet to the workbook
      const sheetName = formTitle.substring(0, 31); // Excel sheet name limit
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Generate filename
    const defaultFilename = `form-submissions-${new Date().toISOString().split('T')[0]}.xlsx`;
    const finalFilename = filename || defaultFilename;

    // Save the file
    XLSX.writeFile(workbook, finalFilename);
  }

  private static prepareWorksheetData(submissions: FormSubmission[], currentForm?: any): any[] {
    return submissions.map((submission, index) => {
      const row: any = {
        'Submission #': index + 1,
        'Form Type': submission.formTitle,
        'Submission Date': submission.timestamp.toLocaleDateString(),
        'Submission Time': submission.timestamp.toLocaleTimeString(),
      };

      // If we have form configuration, use field labels as column names
      if (currentForm && currentForm.fields) {
        currentForm.fields.forEach((field: any) => {
          // Use field label as column name instead of field ID
          row[field.label] = submission.data[field.id] || '';
        });
      } else {
        // Fallback to using the submission data keys directly
        Object.entries(submission.data).forEach(([key, value]) => {
          // Convert camelCase to Title Case for better readability
          const columnName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          row[columnName] = value;
        });
      }

      return row;
    });
  }

  private static calculateColumnWidths(data: any[]): any[] {
    if (data.length === 0) return [];

    const keys = Object.keys(data[0]);
    return keys.map(key => {
      const maxLength = Math.max(
        key.length,
        ...data.map(row => (row[key] ? row[key].toString().length : 0))
      );
      return { width: Math.min(Math.max(maxLength + 2, 10), 50) };
    });
  }

  static exportSingleFormType(submissions: FormSubmission[], formType: string): void {
    const filteredSubmissions = submissions.filter(s => s.formTitle === formType);
    if (filteredSubmissions.length === 0) {
      alert(`No submissions found for ${formType}`);
      return;
    }

    const filename = `${formType.toLowerCase().replace(/\s+/g, '-')}-submissions-${new Date().toISOString().split('T')[0]}.xlsx`;
    this.exportFormSubmissions(filteredSubmissions, filename);
  }

  static generateSummaryReport(submissions: FormSubmission[]): void {
    if (submissions.length === 0) {
      alert('No form submissions to analyze');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summary = this.generateSummaryData(submissions);
    const summarySheet = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // All submissions sheet with proper field labels
    const currentForm = ExcelDatabaseService.getCurrentFormConfig();
    const allData = this.prepareWorksheetData(submissions, currentForm);
    const allSheet = XLSX.utils.json_to_sheet(allData);
    allSheet['!cols'] = this.calculateColumnWidths(allData);
    XLSX.utils.book_append_sheet(workbook, allSheet, 'All Submissions');

    const filename = `form-submissions-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  private static generateSummaryData(submissions: FormSubmission[]): any[] {
    const formTypes = [...new Set(submissions.map(s => s.formTitle))];
    const summary = [];

    // Overall summary
    summary.push({
      'Metric': 'Total Submissions',
      'Value': submissions.length,
      'Details': 'All form types combined'
    });

    summary.push({
      'Metric': 'Form Types',
      'Value': formTypes.length,
      'Details': formTypes.join(', ')
    });

    summary.push({
      'Metric': 'Date Range',
      'Value': `${new Date(Math.min(...submissions.map(s => s.timestamp.getTime()))).toLocaleDateString()} - ${new Date(Math.max(...submissions.map(s => s.timestamp.getTime()))).toLocaleDateString()}`,
      'Details': 'First to last submission'
    });

    // Form type breakdown
    formTypes.forEach(formType => {
      const count = submissions.filter(s => s.formTitle === formType).length;
      summary.push({
        'Metric': `${formType} Submissions`,
        'Value': count,
        'Details': `${((count / submissions.length) * 100).toFixed(1)}% of total`
      });
    });

    return summary;
  }
}