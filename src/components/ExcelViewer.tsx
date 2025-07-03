import React, { useState, useEffect, useRef } from 'react';
import { Download, FileSpreadsheet, RefreshCw, Star, History, Database, Hash, Edit3, Trash2, Save, X, Plus } from 'lucide-react';
import { ExcelDatabaseService } from '../services/excelDatabaseService';

interface ExcelViewerProps {
  filename: 'submissions' | 'config';
  title: string;
}

export function ExcelViewer({ filename, title }: ExcelViewerProps) {
  const [excelData, setExcelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetStats, setSheetStats] = useState<any>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const editInputRef = useRef<HTMLInputElement>(null);

  const loadExcelData = async () => {
    setLoading(true);
    try {
      const data = await ExcelDatabaseService.getExcelFileContent(filename);
      setExcelData(data);
      
      if (filename === 'submissions') {
        const stats = ExcelDatabaseService.getSheetStatistics();
        setSheetStats(stats);
        
        // Set active sheet to current active sheet or first available
        if (data.activeSheet && data.sheets[data.activeSheet]) {
          setActiveSheet(data.activeSheet);
        } else if (Object.keys(data.sheets).length > 0) {
          setActiveSheet(Object.keys(data.sheets)[0]);
        }
      } else if (data && Object.keys(data.sheets).length > 0) {
        setActiveSheet(Object.keys(data.sheets)[0]);
      }
    } catch (error) {
      console.error('Error loading Excel data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExcelData();
  }, [filename]);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  const handleDownload = () => {
    ExcelDatabaseService.downloadExcelFile(filename);
  };

  const handleCellClick = (rowIndex: number, column: string, currentValue: any) => {
    if (column === 'ID' || column === 'Sheet_ID') return; // Don't allow editing ID columns
    
    setEditingCell({ rowIndex, column });
    setEditValue(String(currentValue || ''));
  };

  const handleCellSave = async () => {
    if (!editingCell || !excelData || !activeSheet) return;

    const data = excelData.sheets[activeSheet];
    const row = data[editingCell.rowIndex];
    
    if (row && row.ID) {
      // Update the data
      const updates = { [editingCell.column]: editValue };
      const success = ExcelDatabaseService.modifySubmissionById(row.ID, updates);
      
      if (success) {
        // Update local state
        const updatedData = { ...excelData };
        updatedData.sheets[activeSheet][editingCell.rowIndex][editingCell.column] = editValue;
        setExcelData(updatedData);
        
        setEditingCell(null);
        setEditValue('');
      } else {
        alert('Failed to update cell');
      }
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCellCancel();
    }
  };

  const handleRowSelect = (rowIndex: number, isSelected: boolean) => {
    const newSelected = new Set(selectedRows);
    if (isSelected) {
      newSelected.add(rowIndex);
    } else {
      newSelected.delete(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedRows.size} selected row(s)? This action cannot be undone.`)) {
      const data = excelData.sheets[activeSheet];
      const idsToDelete = Array.from(selectedRows).map(index => data[index]?.ID).filter(Boolean);
      
      let deletedCount = 0;
      idsToDelete.forEach(id => {
        if (ExcelDatabaseService.deleteSubmissionById(id)) {
          deletedCount++;
        }
      });
      
      if (deletedCount > 0) {
        loadExcelData(); // Refresh data
        setSelectedRows(new Set());
        alert(`${deletedCount} row(s) deleted successfully!`);
      }
    }
  };

  const handleAddRow = () => {
    // Create a new empty row template based on current sheet structure
    if (!excelData || !activeSheet) return;
    
    const data = excelData.sheets[activeSheet];
    if (data.length === 0) return;
    
    const sampleRow = data[0];
    const newRow: any = {
      ID: `sub_${ExcelDatabaseService.generateUniqueId()}`,
      Sheet_ID: ExcelDatabaseService.extractIdFromSheetName(activeSheet),
      Form_Type: sampleRow.Form_Type || 'Manual Entry',
      Submission_Date: new Date().toLocaleDateString(),
      Submission_Time: new Date().toLocaleTimeString(),
      User_Agent: 'Manual Entry'
    };
    
    // Add empty values for other columns
    Object.keys(sampleRow).forEach(key => {
      if (!newRow.hasOwnProperty(key)) {
        newRow[key] = '';
      }
    });
    
    // Add to database
    try {
      const submission = {
        id: newRow.ID,
        formId: newRow.Form_Type,
        formTitle: newRow.Form_Type,
        data: newRow,
        timestamp: new Date(),
        userAgent: newRow.User_Agent
      };
      
      ExcelDatabaseService.saveFormSubmission(submission);
      loadExcelData(); // Refresh data
      alert('New row added successfully!');
    } catch (error) {
      console.error('Error adding new row:', error);
      alert('Failed to add new row');
    }
  };

  const getSheetIcon = (sheetName: string) => {
    if (filename === 'submissions') {
      const isActive = sheetStats?.currentActiveSheet === sheetName;
      return isActive ? <Star className="w-4 h-4 text-yellow-500" /> : <History className="w-4 h-4 text-gray-400" />;
    }
    return <Database className="w-4 h-4 text-blue-500" />;
  };

  const getSheetLabel = (sheetName: string) => {
    if (filename === 'submissions') {
      const isActive = sheetStats?.currentActiveSheet === sheetName;
      const sheetId = ExcelDatabaseService.extractIdFromSheetName(sheetName);
      const baseLabel = isActive ? `${sheetName} (Active)` : `${sheetName} (History)`;
      return sheetId ? `${baseLabel} [ID: ${sheetId}]` : baseLabel;
    }
    return sheetName.replace(/_/g, ' ');
  };

  const getColumnWidth = (column: string) => {
    if (column === 'ID' || column === 'Sheet_ID') return 'w-24';
    if (column === 'Submission_Date' || column === 'Submission_Time') return 'w-32';
    if (column === 'User_Agent') return 'w-48';
    if (column === 'Form_Type') return 'w-36';
    return 'w-40';
  };

  // Check if current sheet has data
  const hasData = excelData && activeSheet && excelData.sheets[activeSheet] && excelData.sheets[activeSheet].length > 0;

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No data available</p>
          {filename === 'submissions' && (
            <div className="mt-2">
              <p className="text-sm">Submit a form through the chatbot to see data here</p>
              {sheetStats?.currentActiveSheet === activeSheet && (
                <p className="text-xs text-blue-600 mt-1">
                  ⭐ This is the active sheet - new submissions will appear here
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    const columns = Object.keys(data[0]);

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Action Bar */}
        <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {selectedRows.size > 0 ? `${selectedRows.size} row(s) selected` : `${data.length} total rows`}
            </span>
            {selectedRows.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                <Trash2 className="w-3 h-3" />
                Delete Selected
              </button>
            )}
          </div>
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            <Plus className="w-3 h-3" />
            Add Row
          </button>
        </div>

        {/* Excel-like Table Container */}
        <div className="relative overflow-hidden">
          {/* Single Table with Fixed Header and Scrollable Body */}
          <div className="overflow-auto max-h-80" style={{ scrollbarWidth: 'thin', scrollbarColor: '#9CA3AF #F3F4F6' }}>
            <table className="min-w-full border-collapse">
              {/* Fixed Header */}
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  {/* Row selector column header */}
                  <th className="w-12 border-r border-gray-300 bg-gray-200 p-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === data.length && data.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(new Set(data.map((_, index) => index)));
                        } else {
                          setSelectedRows(new Set());
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </th>
                  
                  {/* Column Headers */}
                  {columns.map((column) => (
                    <th
                      key={column}
                      className={`${getColumnWidth(column)} border-r border-gray-300 bg-gray-100 p-2 text-left`}
                    >
                      <div className="flex items-center gap-1">
                        {column === 'ID' && <Hash className="w-3 h-3 text-blue-600" />}
                        {column === 'Sheet_ID' && <Database className="w-3 h-3 text-green-600" />}
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {column.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Scrollable Body */}
              <tbody>
                {data.map((row, rowIndex) => {
                  const isSelected = selectedRows.has(rowIndex);
                  const isMetadataRow = row.ID === 'SHEET_METADATA';
                  
                  return (
                    <tr 
                      key={rowIndex} 
                      className={`border-b border-gray-200 hover:bg-blue-50 ${
                        isSelected ? 'bg-blue-100' : isMetadataRow ? 'bg-yellow-50' : 'bg-white'
                      }`}
                    >
                      {/* Row selector */}
                      <td className="w-12 border-r border-gray-200 bg-gray-50 p-2 text-center">
                        {!isMetadataRow && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleRowSelect(rowIndex, e.target.checked)}
                            className="w-4 h-4"
                          />
                        )}
                        <div className="text-xs text-gray-500 mt-1">{rowIndex + 1}</div>
                      </td>
                      
                      {/* Data cells */}
                      {columns.map((column) => {
                        const cellValue = row[column];
                        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.column === column;
                        const isIdColumn = column === 'ID' || column === 'Sheet_ID';
                        
                        return (
                          <td
                            key={column}
                            className={`${getColumnWidth(column)} border-r border-gray-200 p-2 relative`}
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-1 w-full">
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  className="w-full px-1 py-0.5 text-xs border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                  onClick={handleCellSave}
                                  className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={handleCellCancel}
                                  className="p-0.5 text-red-600 hover:bg-red-100 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className={`w-full text-xs cursor-pointer p-1 rounded ${
                                  isIdColumn ? 'font-mono text-blue-600 font-medium' : 'text-gray-900'
                                } ${!isIdColumn && !isMetadataRow ? 'hover:bg-blue-50' : ''}`}
                                onClick={() => !isIdColumn && !isMetadataRow && handleCellClick(rowIndex, column, cellValue)}
                                title={isIdColumn ? `${column}: ${cellValue}` : 'Click to edit'}
                              >
                                {isIdColumn && (
                                  <span className="inline-flex items-center gap-1">
                                    {column === 'ID' ? <Hash className="w-3 h-3" /> : <Database className="w-3 h-3" />}
                                    {String(cellValue || '')}
                                  </span>
                                )}
                                {!isIdColumn && (
                                  <span className="block truncate">
                                    {String(cellValue || '')}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Custom Scrollbar Styles */}
        <style jsx>{`
          .overflow-auto::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          
          .overflow-auto::-webkit-scrollbar-track {
            background: #f3f4f6;
            border-radius: 6px;
          }
          
          .overflow-auto::-webkit-scrollbar-thumb {
            background: #9ca3af;
            border-radius: 6px;
            border: 2px solid #f3f4f6;
          }
          
          .overflow-auto::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
          
          .overflow-auto::-webkit-scrollbar-corner {
            background: #f3f4f6;
          }
        `}</style>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {filename === 'submissions' && sheetStats && hasData && (
                <div className="text-sm text-gray-600">
                  <p>{sheetStats.totalSheets} sheets • Active: {sheetStats.currentFormTitle}</p>
                  <p className="text-xs">
                    Active Sheet ID: <span className="font-mono text-blue-600">{sheetStats.currentActiveSheetId}</span> • 
                    Form ID: <span className="font-mono text-green-600">{sheetStats.currentFormId}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadExcelData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading Excel data...</span>
          </div>
        ) : excelData ? (
          <div>
            {/* Sheet Tabs - Only show if there are multiple sheets */}
            {Object.keys(excelData.sheets).length > 1 && (
              <div className="mb-4 border-b border-gray-200">
                <nav className="flex space-x-8 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                  {Object.keys(excelData.sheets).map((sheetName) => (
                    <button
                      key={sheetName}
                      onClick={() => setActiveSheet(sheetName)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                        activeSheet === sheetName
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {getSheetIcon(sheetName)}
                      {getSheetLabel(sheetName)}
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {excelData.sheets[sheetName]?.length || 0}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
            )}

            {/* Excel Instructions - Only show if there's data */}
            {hasData && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <Edit3 className="w-4 h-4" />
                  <span className="font-medium">Edit Excel</span>
                </div>
                <div className="text-xs text-green-700 mt-1">
                  • Click any cell (except ID columns) to edit inline
                  • Use Enter to save, Escape to cancel
                  • Select rows with checkboxes for bulk operations
                  • Add new rows with the "Add Row" button (auto-generates 6-digit IDs)
                  • Fixed headers stay visible while scrolling
                  • Column names match form field labels for easy identification
                </div>
              </div>
            )}

            {/* Excel Table */}
            {renderTable(excelData.sheets[activeSheet] || [])}

            {/* Sheet Info - Only show if there's data */}
            {hasData && (
              <div className="mt-4 text-sm text-gray-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p>
                      Sheet: <strong>{activeSheet}</strong> | 
                      Rows: <strong>{excelData.sheets[activeSheet]?.length || 0}</strong>
                    </p>
                  </div>
                  {filename === 'submissions' && (
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        Sheet ID: <span className="font-mono">{ExcelDatabaseService.extractIdFromSheetName(activeSheet)}</span>
                      </span>
                      {selectedRows.size > 0 && (
                        <span className="text-blue-600">
                          Selected: <span className="font-mono">{selectedRows.size} rows</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Unable to load Excel file</p>
            <button
              onClick={loadExcelData}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}