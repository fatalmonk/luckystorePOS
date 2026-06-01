import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { 
  CloudUpload, Download, AlertCircle, CheckCircle, 
  Trash2, Plus, ArrowRight, ArrowLeft, Loader2 
} from 'lucide-react';
import { z } from 'zod';

interface ImportWizardProps {
  title: string;
  sampleFileName: string;
  sampleData: Record<string, any>[];
  validationSchema: z.ZodObject<any>;
  onImportSubmit: (data: any[]) => Promise<void>;
  fieldMeta: {
    key: string;
    label: string;
    type: 'string' | 'number' | 'select';
    options?: string[];
    required?: boolean;
    defaultValue?: any;
  }[];
}

export const ImportWizard: React.FC<ImportWizardProps> = ({
  title,
  sampleFileName,
  sampleData,
  validationSchema,
  onImportSubmit,
  fieldMeta,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Download Sample CSV
  const handleDownloadSample = () => {
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = sampleFileName.replace(/\.xlsx?$/i, '.csv');
    link.click();
  };

  // Run Zod validation on data
  const validateData = (rows: Record<string, any>[]) => {
    const newErrors: Record<number, Record<string, string>> = {};
    rows.forEach((row, index) => {
      const rowErrors: Record<string, string> = {};
      
      // We parse each field individually to highlight exact cell errors
      fieldMeta.forEach((field) => {
        const val = row[field.key];
        
        // Handle numbers
        let parsedVal = val;
        if (field.type === 'number' && typeof val === 'string') {
          const parsed = Number(val);
          if (!isNaN(parsed)) {
            parsedVal = parsed;
          }
        }

        const fieldSchema = validationSchema.shape[field.key];
        if (fieldSchema) {
          const res = fieldSchema.safeParse(parsedVal === '' ? undefined : parsedVal);
          if (!res.success) {
            rowErrors[field.key] = res.error.errors[0]?.message || 'Invalid value';
          }
        }
      });

      if (Object.keys(rowErrors).length > 0) {
        newErrors[index] = rowErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // File Drop Handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('File size exceeds 2MB limit');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const json = results.data as Record<string, any>[];

          if (json.length === 0) {
            setErrorMessage('The uploaded file is empty');
            return;
          }

          // Hard limit: 500 rows max
          if (json.length > 500) {
            setErrorMessage('File exceeds maximum limit of 500 rows');
            return;
          }

          // Clean & normalize parsed data keys to match field meta keys
          const normalized = json.map((row) => {
            const newRow: Record<string, any> = {};
            fieldMeta.forEach((field) => {
              // Match keys case-insensitively or via exact label
              const matchedKey = Object.keys(row).find(
                (k) => k.toLowerCase() === field.key.toLowerCase() || k.toLowerCase() === field.label.toLowerCase()
              );
              const rawVal = matchedKey ? row[matchedKey] : '';
              
              if (field.type === 'number') {
                const numVal = Number(rawVal);
                newRow[field.key] = isNaN(numVal) || rawVal === '' ? '' : numVal;
              } else {
                newRow[field.key] = rawVal;
              }
            });
            return newRow;
          });

          setData(normalized);
          validateData(normalized);
          setErrorMessage(null);
          setStep(2);
        } catch (err: any) {
          setErrorMessage(`Error parsing file: ${err.message || 'Unknown error'}`);
        }
      },
      error: (err) => {
        setErrorMessage(`Error parsing file: ${err.message || 'Unknown error'}`);
      }
    });
  }, [fieldMeta, validationSchema]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  // Handle cell edit
  const handleCellChange = (index: number, key: string, value: any) => {
    const updated = [...data];
    let finalVal = value;
    const field = fieldMeta.find((f) => f.key === key);
    if (field?.type === 'number') {
      const num = Number(value);
      finalVal = isNaN(num) || value === '' ? '' : num;
    }
    updated[index] = { ...updated[index], [key]: finalVal };
    setData(updated);
    validateData(updated);
  };

  // Add empty row
  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    fieldMeta.forEach((f) => {
      newRow[f.key] = f.defaultValue !== undefined ? f.defaultValue : '';
    });
    const updated = [...data, newRow];
    setData(updated);
    validateData(updated);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    const updated = data.filter((_, i) => i !== index);
    setData(updated);
    validateData(updated);
  };

  // Go to confirmation step
  const handleProceedToConfirm = () => {
    // Block empty dataset
    if (data.length === 0) {
      setErrorMessage('Cannot proceed with empty dataset. Please add at least one row.');
      return;
    }
    const isValid = validateData(data);
    if (isValid) {
      setErrorMessage(null); // Clear stale error banner
      setStep(3);
    } else {
      setErrorMessage('Please fix all validation errors before proceeding.');
    }
  };

  // Final Submit
  const handleImportSubmit = async () => {
    setIsImporting(true);
    setErrorMessage(null);
    try {
      await onImportSubmit(data);
      setImportSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import data');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title & Wizard Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-warm-surface p-4 rounded-xl border border-warm-border-warm shadow-sm">
        <div>
          <h1 className="text-xl font-display font-black text-warm-fg tracking-tight">{title}</h1>
          <p className="text-xs text-warm-muted">Easily upload, review, and import business records in bulk</p>
        </div>

        {/* Custom Progress Steps */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className={`px-2.5 py-1 rounded-md transition ${step === 1 ? 'bg-warm-accent text-white' : 'bg-warm-border-warm text-warm-dim'}`}>
            1. Upload
          </div>
          <div className="h-0.5 w-6 bg-warm-border-warm"></div>
          <div className={`px-2.5 py-1 rounded-md transition ${step === 2 ? 'bg-warm-accent text-white' : 'bg-warm-border-warm text-warm-dim'}`}>
            2. Review
          </div>
          <div className="h-0.5 w-6 bg-warm-border-warm"></div>
          <div className={`px-2.5 py-1 rounded-md transition ${step === 3 ? 'bg-warm-accent text-white' : 'bg-warm-border-warm text-warm-dim'}`}>
            3. Import
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl flex items-start gap-3">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Step 1: Upload Zone & Template */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-warm-surface p-6 rounded-xl border border-warm-border-warm flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-warm-accent/10 flex items-center justify-center text-warm-accent">
                <Download size={20} />
              </div>
              <h3 className="font-display font-bold text-warm-fg text-base">Excel Spreadsheet Template</h3>
              <p className="text-xs text-warm-muted leading-relaxed">
                Ensure your Excel files match our expected headers exactly to secure automated client-side parsing.
              </p>
            </div>
            <button
              onClick={handleDownloadSample}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-warm-accent hover:bg-warm-accent-light text-white font-semibold text-xs rounded-xl shadow-level-2 transition-all duration-200"
            >
              <Download size={16} />
              Download Template
            </button>
          </div>

          <div className="md:col-span-2">
            <div
              {...getRootProps()}
              className={`h-full min-h-[260px] border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                isDragActive 
                  ? 'border-warm-accent bg-warm-accent/5' 
                  : 'border-warm-border-warm hover:border-warm-accent hover:bg-warm-bg'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-14 h-14 rounded-full bg-warm-border-warm flex items-center justify-center text-warm-dim mb-4 shadow-sm">
                <CloudUpload size={28} />
              </div>
              <p className="text-sm font-semibold text-warm-fg">
                {isDragActive ? 'Drop file here...' : 'Drag & drop CSV template file here'}
              </p>
              <p className="text-xs text-warm-muted mt-2">
                Supports .csv format only (Maximum 500 rows or 2MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Data Review Grid */}
      {step === 2 && (
        <div className="bg-warm-surface rounded-xl border border-warm-border-warm overflow-hidden shadow-sm flex flex-col">
          {/* Grid Toolbar */}
          <div className="p-4 border-b border-warm-border-warm flex justify-between items-center gap-3 bg-warm-bg/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-warm-fg bg-warm-border-warm px-2 py-1 rounded">
                {data.length} Records
              </span>
              {Object.keys(errors).length > 0 && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded flex items-center gap-1 border border-red-200 dark:border-red-900">
                  <AlertCircle size={14} />
                  {Object.keys(errors).length} invalid rows
                </span>
              )}
            </div>

            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-warm-bg hover:bg-warm-border-warm text-warm-fg border border-warm-border-warm font-semibold text-xs rounded-lg transition"
            >
              <Plus size={14} />
              Add Row
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-warm-bg/50 text-[10px] uppercase font-bold text-warm-muted tracking-wider border-b border-warm-border-warm">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  {fieldMeta.map((field) => (
                    <th key={field.key} className="py-3 px-4 min-w-[150px]">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </th>
                  ))}
                  <th className="py-3 px-4 w-12 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border-warm text-xs">
                {data.map((row, index) => {
                  const rowErrors = errors[index] || {};
                  return (
                    <tr key={index} className="hover:bg-warm-bg/30">
                      <td className="py-2.5 px-4 text-center font-semibold text-warm-muted">{index + 1}</td>
                      {fieldMeta.map((field) => {
                        const cellError = rowErrors[field.key];
                        return (
                          <td key={field.key} className="py-2 px-3 relative">
                            {field.type === 'select' ? (
                              <select
                                value={row[field.key] || ''}
                                onChange={(e) => handleCellChange(index, field.key, e.target.value)}
                                className={`w-full bg-white dark:bg-zinc-900 border px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-warm-accent transition ${
                                  cellError ? 'border-red-500 focus:ring-red-500' : 'border-warm-border-warm'
                                }`}
                              >
                                <option value="">Select...</option>
                                {field.options?.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={field.type === 'number' ? 'number' : 'text'}
                                value={row[field.key] ?? ''}
                                onChange={(e) => handleCellChange(index, field.key, e.target.value)}
                                className={`w-full bg-white dark:bg-zinc-900 border px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-warm-accent transition ${
                                  cellError ? 'border-red-500 focus:ring-red-500' : 'border-warm-border-warm'
                                }`}
                              />
                            )}
                            {cellError && (
                              <span 
                                className="absolute bottom-[-1px] left-3 text-[9px] text-red-500 font-semibold"
                                title={cellError}
                              >
                                {cellError}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-4 text-center">
                        <button
                          onClick={() => handleDeleteRow(index)}
                          className="p-1.5 text-warm-muted hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Bar */}
          <div className="p-4 border-t border-warm-border-warm flex justify-between bg-warm-bg/50">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 py-2 px-4 bg-warm-bg hover:bg-warm-border-warm text-warm-fg border border-warm-border-warm font-semibold text-xs rounded-xl transition"
            >
              <ArrowLeft size={14} />
              Back to Upload
            </button>
            <button
              onClick={handleProceedToConfirm}
              className="flex items-center gap-1.5 py-2 px-5 bg-warm-accent hover:bg-warm-accent-light text-white font-semibold text-xs rounded-xl shadow-level-2 transition"
            >
              Verify &amp; Continue
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Import */}
      {step === 3 && (
        <div className="max-w-xl mx-auto bg-warm-surface p-8 rounded-xl border border-warm-border-warm shadow-md text-center space-y-6">
          {!importSuccess ? (
            <>
              <div className="w-16 h-16 rounded-full bg-warm-accent/10 flex items-center justify-center text-warm-accent mx-auto">
                <CheckCircle size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-xl text-warm-fg">Ready to Import!</h3>
                <p className="text-sm text-warm-muted">
                  All {data.length} records have passed frontend validation flawlessly. Ready to update your database.
                </p>
              </div>

              <div className="border border-warm-border-warm rounded-xl p-4 divide-y divide-warm-border-warm text-sm bg-warm-bg/30">
                <div className="flex justify-between py-2">
                  <span className="text-warm-muted font-medium">Import Source:</span>
                  <span className="text-warm-fg font-semibold">Excel Spreadsheet</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-warm-muted font-medium">Valid Records:</span>
                  <span className="text-warm-success font-bold">{data.length} rows</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={isImporting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-warm-bg hover:bg-warm-border-warm text-warm-fg border border-warm-border-warm font-semibold text-xs rounded-xl transition"
                >
                  <ArrowLeft size={14} />
                  Adjust Data
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={isImporting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-warm-accent hover:bg-warm-accent-light text-white font-semibold text-xs rounded-xl shadow-level-2 transition disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Importing...
                    </>
                  ) : (
                    <>
                      Confirm &amp; Import
                      <CheckCircle size={14} />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/20 text-green-600 flex items-center justify-center mx-auto">
                <CheckCircle size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-xl text-warm-fg">Import Successful!</h3>
                <p className="text-sm text-warm-muted">
                  Successfully imported {data.length} records into your store database.
                </p>
              </div>
              <button
                onClick={() => {
                  setData([]);
                  setErrors({});
                  setImportSuccess(false);
                  setStep(1);
                }}
                className="py-2.5 px-6 bg-warm-accent hover:bg-warm-accent-light text-white font-semibold text-xs rounded-xl shadow-level-2 transition"
              >
                Import Another File
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportWizard;
