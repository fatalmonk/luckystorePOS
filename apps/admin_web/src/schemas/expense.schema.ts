import { z } from 'zod';

export const expenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'mobile_money', 'other']).default('cash'),
});

export type ExpenseData = z.infer<typeof expenseSchema>;
