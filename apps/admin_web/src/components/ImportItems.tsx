import React, { useState, useCallback } from 'react';
import { CloudUpload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useNotify } from '../components/NotificationContext';

export default function ImportItems() {
  const { notify } = useNotify();
  const [file, setFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<any[]>([]);
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return; // Guard empty drop
    if (f.size > 1024 * 1024) { notify('File exceeds 1 MB size limit', 'error'); return; }
    if (!/\.xlsx?$/i.test(f.name)) { notify('Invalid file type. Only .xlsx or .xls allowed', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        if (json.length > 500) { notify('Too many rows (max 500)', 'error'); setImportedData([]); setFile(null); }
        else { setImportedData(json); setFile(f); }
      } catch (err: any) {
        notify(`Error parsing file: ${err.message || 'Unknown error'}`, 'error');
        setImportedData([]); setFile(null);
      }

    };
    reader.readAsArrayBuffer(f);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });
  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column – steps list */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-xl">1.</span>
            <div className="flex-1">
              <p className="font-medium">Download the file &amp; Fill Data</p>
              <button className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">
                Download Template
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="font-bold text-xl">2.</span>
            <p className="font-medium">Review &amp; Adjust Data</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="font-bold text-xl">3.</span>
            <p className="font-medium">Confirm &amp; Import</p>
          </div>
        </div>
        {/* Right column – drag‑and‑drop zone */}
<div {...getRootProps()} className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-indigo-500 transition cursor-pointer">
  <input {...getInputProps()} />
  <CloudUpload className="text-gray-400" size={48} />
  {isDragActive ? (
    <p className="mt-4 text-indigo-600 font-medium">Drop the file here...</p>
  ) : (
    <p className="mt-4 text-gray-600">Drag & drop an Excel file here, or click to select</p>
  )}
</div>
      </div>
      {file && <p className="mt-4 text-center text-sm text-gray-600">Selected: {file.name}</p>}
      {importedData.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded p-4">
          <h3 className="font-medium mb-2">Preview ({importedData.length} rows):</h3>
          <pre className="text-sm overflow-auto max-h-48">{JSON.stringify(importedData.slice(0,5), null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
