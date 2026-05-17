import React, { forwardRef } from 'react';
import { FormField } from './FormCore';
import { clsx } from 'clsx';
import { RegisterOptions } from 'react-hook-form';
import { ScanBarcode, DollarSign, Package, Hash } from 'lucide-react';

interface BaseRetailInputProps {
  name: string;
  label?: string;
  description?: string;
  rules?: RegisterOptions;
  className?: string;
  disabled?: boolean;
}

export interface FormNumberInputProps extends BaseRetailInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  min?: number;
  max?: number;
  step?: number | 'any';
}

export const FormNumberInput = forwardRef<HTMLInputElement, FormNumberInputProps>(
  ({ name, label, description, rules, className, ...props }, ref) => {
    return (
      <FormField
        name={name}
        label={label}
        description={description}
        className={className}
        rules={{
          valueAsNumber: true,
          ...rules
        } as RegisterOptions}
        render={({ field, fieldState }) => (
          <div className="relative">
            <input
              type="number"
              {...field}
              {...props}
              ref={(e) => {
                field.ref(e);
                if (typeof ref === 'function') ref(e);
                else if (ref) ref.current = e;
              }}
              id={name}
              className={clsx(
                "input w-full font-mono",
                fieldState.error && "border-danger focus:ring-danger/20",
                props.disabled && "opacity-50 cursor-not-allowed",
                className
              )}
            />
          </div>
        )}
      />
    );
  }
);
FormNumberInput.displayName = 'FormNumberInput';

export const PriceInput = forwardRef<HTMLInputElement, FormNumberInputProps>(
  ({ name, label = "Price", description, rules, className, ...props }, ref) => {
    return (
      <FormField
        name={name}
        label={label}
        description={description}
        className={className}
        rules={{
          valueAsNumber: true,
          min: { value: 0, message: "Price cannot be negative" },
          ...rules
        } as RegisterOptions}
        render={({ field, fieldState }) => (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-text-muted font-mono font-medium">৳</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              {...field}
              {...props}
              ref={(e) => {
                field.ref(e);
                if (typeof ref === 'function') ref(e);
                else if (ref) ref.current = e;
              }}
              id={name}
              className={clsx(
                "input w-full pl-8 font-mono",
                fieldState.error && "border-danger focus:ring-danger/20",
                props.disabled && "opacity-50 cursor-not-allowed",
                className
              )}
            />
          </div>
        )}
      />
    );
  }
);
PriceInput.displayName = 'PriceInput';

export const QuantityInput = forwardRef<HTMLInputElement, FormNumberInputProps>(
  ({ name, label = "Quantity", description, rules, className, ...props }, ref) => {
    return (
      <FormField
        name={name}
        label={label}
        description={description}
        className={className}
        rules={{
          valueAsNumber: true,
          min: { value: 1, message: "Quantity must be at least 1" },
          ...rules
        } as RegisterOptions}
        render={({ field, fieldState }) => (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Package size={16} className="text-text-muted" />
            </div>
            <input
              type="number"
              step="1"
              min="1"
              {...field}
              {...props}
              ref={(e) => {
                field.ref(e);
                if (typeof ref === 'function') ref(e);
                else if (ref) ref.current = e;
              }}
              id={name}
              className={clsx(
                "input w-full pl-9 font-mono",
                fieldState.error && "border-danger focus:ring-danger/20",
                props.disabled && "opacity-50 cursor-not-allowed",
                className
              )}
            />
          </div>
        )}
      />
    );
  }
);
QuantityInput.displayName = 'QuantityInput';

export const BarcodeInput = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> & BaseRetailInputProps>(
  ({ name, label = "Barcode / SKU", description, rules, className, ...props }, ref) => {
    return (
      <FormField
        name={name}
        label={label}
        description={description}
        className={className}
        rules={rules}
        render={({ field, fieldState }) => (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <ScanBarcode size={16} className="text-text-muted" />
            </div>
            <input
              type="text"
              {...field}
              {...props}
              ref={(e) => {
                field.ref(e);
                if (typeof ref === 'function') ref(e);
                else if (ref) ref.current = e;
              }}
              id={name}
              className={clsx(
                "input w-full pl-9 uppercase font-mono",
                fieldState.error && "border-danger focus:ring-danger/20",
                props.disabled && "opacity-50 cursor-not-allowed",
                className
              )}
              autoComplete="off"
            />
          </div>
        )}
      />
    );
  }
);
BarcodeInput.displayName = 'BarcodeInput';

export const StockAdjustmentInput = forwardRef<HTMLInputElement, FormNumberInputProps>(
  ({ name, label = "Stock Adjustment", description, rules, className, ...props }, ref) => {
    return (
      <FormField
        name={name}
        label={label}
        description={description}
        className={className}
        rules={{
          valueAsNumber: true,
          ...rules
        } as RegisterOptions}
        render={({ field, fieldState }) => {
          const val = field.value || 0;
          const isPositive = val > 0;
          const isNegative = val < 0;
          
          return (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash size={16} className={clsx(
                  "text-text-muted transition-colors",
                  isPositive && "text-success",
                  isNegative && "text-danger"
                )} />
              </div>
              <input
                type="number"
                step="1"
                {...field}
                {...props}
                ref={(e) => {
                  field.ref(e);
                  if (typeof ref === 'function') ref(e);
                  else if (ref) ref.current = e;
                }}
                id={name}
                className={clsx(
                  "input w-full pl-9 font-mono font-bold",
                  fieldState.error && "border-danger focus:ring-danger/20",
                  isPositive && "text-success border-success/30 focus:ring-success/20 focus:border-success",
                  isNegative && "text-danger border-danger/30 focus:ring-danger/20 focus:border-danger",
                  props.disabled && "opacity-50 cursor-not-allowed",
                  className
                )}
                placeholder="+0 or -0"
              />
            </div>
          );
        }}
      />
    );
  }
);
StockAdjustmentInput.displayName = 'StockAdjustmentInput';
