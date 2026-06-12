import React from 'react';
import { z } from 'zod';
import { ImportWizard } from '../../components/ImportWizard';
import { supabase } from "@/lib/supabase";
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { useTranslation } from 'react-i18next';

const partySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['customer', 'supplier'], {
    message: 'Type must be customer or supplier',
  }),
  phone: z.string().optional(),
});

export const ImportPartiesPage: React.FC = () => {
  const { tenantId } = useAuth();
  const { notify } = useNotify();
  const { t } = useTranslation();

  const fieldMeta = [
    { key: 'name', label: 'Name', type: 'string' as const, required: true },
    { key: 'type', label: 'Type', type: 'select' as const, options: ['customer', 'supplier'], required: true },
    { key: 'phone', label: 'Phone', type: 'string' as const },
    { key: 'email', label: 'Email', type: 'string' as const },
    { key: 'address', label: 'Address', type: 'string' as const },
  ];

  const sampleData = [
    {
      Name: 'John Doe',
      Type: 'customer',
      Phone: '01712345678',
      Email: 'john@example.com',
      Address: 'Dhaka, Bangladesh',
    },
    {
      Name: 'Acme Supplies',
      Type: 'supplier',
      Phone: '01887654321',
      Email: 'info@acmesupplies.com',
      Address: 'Chittagong, Bangladesh',
    },
  ];

  const handleImportSubmit = async (data: any[]) => {
    // Inject tenant_id into each record
    const payload = data.map((row) => ({
      tenant_id: tenantId,
      name: row.name.trim(),
      type: row.type,
      phone: row.phone?.trim() || null,
    }));

    const { error } = await supabase.from('parties').insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    notify(`Successfully imported ${data.length} parties`, 'success');
  };

  return (
    <div className="dashboard-container p-6 space-y-6">
      <ImportWizard
        title={t('nav.importParties')}
        sampleFileName="lucky_store_parties_template.xlsx"
        sampleData={sampleData}
        validationSchema={partySchema}
        onImportSubmit={handleImportSubmit}
        fieldMeta={fieldMeta}
      />
    </div>
  );
};

export default ImportPartiesPage;
