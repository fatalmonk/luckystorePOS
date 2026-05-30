import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useNotify } from './NotificationContext';

type RowData = Record<string, any>;

interface ImportReviewGridProps {
  importedData: RowData[];
  onConfirm: (data: RowData[]) => void;
}

// Define schema expecting 'Item Name' and 'Sales Price'
const rowSchema = z.object({
  'Item Name': z.string().min(1, { message: 'Item Name required' }),
  'Sales Price': z.coerce.number().positive({ message: 'Price must be positive' }),
});

export default function ImportReviewGrid({ importedData, onConfirm }: ImportReviewGridProps) {
  const { notify } = useNotify();
  const [data, setData] = useState<RowData[]>(importedData);
  const [errors, setErrors] = useState<Record<number, string[]>>({});

  // Validate all rows whenever data changes
  useEffect(() => {
    const newErrors: Record<number, string[]> = {};
    data.forEach((row, idx) => {
      const result = rowSchema.safeParse(row);
      if (!result.success) {
        newErrors[idx] = result.error.issues.map(e => `${e.path.join('.')} - ${e.message}`);
      }
    });
    setErrors(newErrors);
  }, [data]);

  const handleChange = (rowIdx: number, field: string, value: string) => {
    setData(prev => {
      const newData = [...prev];
      newData[rowIdx] = { ...newData[rowIdx], [field]: value };
      return newData;
    });
  };

  const hasErrors = Object.keys(errors).length > 0;

  const handleConfirm = () => {
    // Re-validate all rows before confirming to catch stale validation state
    const newErrors: Record<number, string[]> = {};
    data.forEach((row, idx) => {
      const result = rowSchema.safeParse(row);
      if (!result.success) {
        newErrors[idx] = result.error.issues.map(e => `${e.path.join('.')} - ${e.message}`);
      }
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    notify('Data ready for import', 'success');
    onConfirm(data);
  };

  const headers = data[0] ? Object.keys(data[0]) : [];

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Review Imported Data</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-2 text-left font-medium text-gray-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={errors[i] ? 'bg-red-50' : ''}>
                {headers.map((h) => (
                  <td key={h} className="px-4 py-2 border-b">
                    <input
                      type="text"
                      value={row[h] ?? ''}
                      onChange={(e) => handleChange(i, h, e.target.value)}
                      className={`w-full border ${errors[i]?.some((e) => e.includes(h)) ? 'border-red-500' : 'border-gray-300'} rounded px-2 py-1`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasErrors && (
        <div className="mt-4 text-red-600">
          <p>Please fix validation errors before confirming.</p>
          <ul className="list-disc list-inside">
            {Object.entries(errors).flatMap(([idx, errs]) =>
              errs.map((e, i) => <li key={`${idx}-${i}`}>Row {Number(idx) + 1}: {e}</li>)
            )}
          </ul>
        </div>
      )}
      <div className="mt-6">
        <button
          onClick={handleConfirm}
          disabled={hasErrors}
          className={`px-6 py-2 rounded font-medium text-white ${hasErrors ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
        >
          Confirm Import
        </button>
      </div>
    </div>
  );
}
