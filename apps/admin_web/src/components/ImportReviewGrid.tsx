import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';

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
  const [data, setData] = useState<RowData[]>(importedData);
  const [errors, setErrors] = useState<Record<number, string[]>>({});

  // Validate all rows whenever data changes
  useEffect(() => {
    const newErrors: Record<number, string[]> = {};
    data.forEach((row, idx) => {
      const result = rowSchema.safeParse(row);
      if (!result.success) {
        newErrors[idx] = result.error.errors.map(e => `${e.path.join('.')} - ${e.message}`);
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
    if (hasErrors) return;
    toast.success('Data ready for import');
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
                {headers.map((field) => (
                  <td key={field} className="border px-4 py-2">
                    <input
                      value={row[field] ?? ''}
                      onChange={(e) => handleChange(i, field, e.target.value)}
                      className={`w-full p-1 border rounded ${errors[i] && errors[i].some(err => err.startsWith(field)) ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={handleConfirm}
          disabled={hasErrors}
          className={`px-4 py-2 bg-indigo-600 text-white rounded ${hasErrors ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
        >
          Confirm & Import
        </button>
      </div>
    </div>
  );
}
