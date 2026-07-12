import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const storeId = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rawData = [
  '14/06/2026\t13,086\t3,213\t16,299\t0\t0',
  '15/06/2026\t9,110\t2,316\t11,426\t0\t0',
  '16/06/2026\t11,357\t1,070\t2,777\t15,204\t0\t0',
  '17/06/2026\t8,945\t\t8,945\t0\t0',
  '18/06/2026\t8,171\t1,280\t9,451\t0\t0',
  '19/06/2026\t5,303\t823\t6,126\t0\t0',
  '20/06/2026\t12,226\t500\t823\t13,549\t0\t0',
  '21/06/2026\t7,604\t1,555\t9,159\t0\t0',
  '22/06/2026\t10,487\t3,590\t14,077\t0\t0',
  '23/06/2026\t8,652\t3,301\t11,953\t0\t0',
  '24/06/2026\t7,155\t1,215\t8,370\t0\t0',
  '25/06/2026\t6,695\t7,588\t14,283\t0\t0',
  '26/06/2026\t13,900\t2,415\t16,315\t0\t0',
  '27/06/2026\t4,627\t2,032\t6,659\t0\t0',
  '28/06/2026\t17,647\t1,406\t19,053\t0\t0',
  '29/06/2026\t12,692\t1,869\t14,561\t0\t0',
  '30/06/2026\t9,405\t8,957\t18,362\t0\t0',
  '01/07/2026\t9,880\t390\t10,270\t0\t0',
  '02/07/2026\t13,601\t\t13,601\t0\t0',
  '03/07/2026\t11,335\t\t11,335\t0\t0',
  '04/07/2026\t12,446\t\t12,446\t0\t0',
  '05/07/2026\t15,835\t415\t16,250\t0\t0',
  '06/07/2026\t10,154\t6,260\t16,414\t0\t0',
  '07/07/2026\t21,894\t240\t4,265\t26,399\t0\t0',
];

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}

function parseCurrency(value) {
  if (!value || value === '') return 0;
  return parseFloat(value.replace(/,/g, '')) || 0;
}

function parseRow(rowStr) {
  const parts = rowStr.split('\t');
  const date = parseDate(parts[0]);
  const cash = parseCurrency(parts[1] || '0');
  const bkash = parseCurrency(parts[2] || '0');
  const credit = parseCurrency(parts[3] || '0');
  const totalSales = parseCurrency(parts[4] || '0');
  const stockPurchase = parseCurrency(parts[5] || '0');
  const dailyExpense = parseCurrency(parts[6] || '0');
  
  const calculatedTotal = cash + bkash + credit;
  const finalTotal = totalSales > 0 ? totalSales : calculatedTotal;
  
  return {
    store_id: storeId,
    sale_date: date,
    cash_amount: cash,
    bkash_amount: bkash,
    credit_amount: credit,
    total_sales: finalTotal,
    stock_purchase: stockPurchase,
    daily_expense: dailyExpense,
  };
}

async function bulkUpsert() {
  console.log('Starting bulk upsert of daily sales...\n');
  
  const records = rawData.map(parseRow);
  console.log(`Parsed ${records.length} records\n`);
  
  // Show what we're about to upsert
  console.log('Records to upsert (first 5):');
  records.slice(0, 5).forEach((record, i) => {
    console.log(`  ${i + 1}. ${record.sale_date}: ${record.total_sales} BDT (Cash: ${record.cash_amount}, Bkash: ${record.bkash_amount}, Credit: ${record.credit_amount})`);
  });
  console.log(`  ... ${records.length - 5} more\n`);
  
  console.log('Performing upsert to Supabase...');
  
  const { data, error } = await supabase
    .from('daily_sales')
    .upsert(records, {
      onConflict: 'store_id,sale_date',
      ignoreDuplicates: false,
    })
    .select();
  
  if (error) {
    console.error('Upsert failed:', error);
    process.exit(1);
  }
  
  console.log(`✓ Successfully upserted ${data.length} daily sales records!\n`);
  
  // Summarize the result
  const totalSales = data.reduce((sum, r) => sum + (r.total_sales || 0), 0);
  const totalCash = data.reduce((sum, r) => sum + (r.cash_amount || 0), 0);
  const totalBkash = data.reduce((sum, r) => sum + (r.bkash_amount || 0), 0);
  const totalCredit = data.reduce((sum, r) => sum + (r.credit_amount || 0), 0);
  
  console.log('Summary:');
  console.log(`  Records: ${data.length}`);
  console.log(`  Total Sales: ${totalSales.toLocaleString()} BDT`);
  console.log(`  Cash: ${totalCash.toLocaleString()} BDT`);
  console.log(`  Bkash: ${totalBkash.toLocaleString()} BDT`);
  console.log(`  Credit: ${totalCredit.toLocaleString()} BDT`);
  console.log(`  Date range: ${data[data.length - 1].sale_date} to ${data[0].sale_date}`);
  
  console.log('\n✓ Done! Check https://admin.luckystore1947.com/daily-sales');
  process.exit(0);
}

bulkUpsert().catch(console.error);