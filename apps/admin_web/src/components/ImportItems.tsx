import React, { useState, useCallback } from 'react';
import { CloudUpload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'sonner';

export default function ImportItems() {
  const [file, setFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<any[]>([]);
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f.size > 1024 * 1024) { toast.error('File exceeds 1 MB size limit'); return; }
    if (!/\.xlsx?$/i.test(f.name)) { toast.error('Invalid file type. Only .xlsx or .xls allowed'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      if (json.length > 500) { toast.error('Too many rows (max 500)'); setImportedData([]); setFile(null); }
      else { setImportedData(json); setFile(f); }
    };
    reader.readAsArrayBuffer(f);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });
  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
    <Toaster />
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
  <p className="mt-4 text-lg font-medium text-gray-700">{isDragActive ? 'Drop the file here...' : 'Click to Upload or drag and drop'}</p>
</div>
      </div>
    </div>
  );
}
