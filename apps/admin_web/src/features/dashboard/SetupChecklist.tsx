import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, X, Sparkles, Building2, Package, CreditCard, Users, RefreshCw } from 'lucide-react';

export interface SetupChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isCompleted: boolean;
  actionPath: string;
  actionLabel: string;
}

interface SetupChecklistProps {
  hasProducts: boolean;
  hasPaymentMethods: boolean;
  hasStaff: boolean;
  isStoreConfigured: boolean;
  onRefresh?: () => void;
}

export function SetupChecklist({
  hasProducts,
  hasPaymentMethods,
  hasStaff,
  isStoreConfigured,
  onRefresh,
}: SetupChecklistProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isBengali = i18n.language === 'bn';

  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('lucky_setup_checklist_dismissed') === 'true';
  });

  const items: SetupChecklistItem[] = [
    {
      id: 'store-profile',
      title: isBengali ? 'দোকানের বিবরণ ও রসিদ সেটআপ' : 'Store Profile & Receipt Setup',
      description: isBengali
        ? 'দোকানের নাম, ঠিকানা ও রসিদ হেডার কনফিগার করুন।'
        : 'Configure shop identity, receipt header & footer message.',
      icon: Building2,
      isCompleted: isStoreConfigured,
      actionPath: '/settings',
      actionLabel: isBengali ? 'সেটিংস দেখুন' : 'Go to Settings',
    },
    {
      id: 'catalog-init',
      title: isBengali ? 'পণ্য ক্যাটালগ শুরু করুন' : 'Add First Products',
      description: isBengali
        ? 'আপনার ইনভেন্টরিতে পণ্য ও স্টক মূল্য যোগ করুন।'
        : 'Populate your catalog with initial products, pricing, and stock.',
      icon: Package,
      isCompleted: hasProducts,
      actionPath: '/inventory',
      actionLabel: isBengali ? 'ইনভেন্টরি খুলুন' : 'Open Inventory',
    },
    {
      id: 'payment-methods',
      title: isBengali ? 'পেমেন্ট মাধ্যম যাচাই করুন' : 'Configure Payment Methods',
      description: isBengali
        ? 'ক্যাশ, বিকাশ ও কার্ড পেমেন্ট সক্রিয় আছে কিনা দেখুন।'
        : 'Verify Cash, bKash, and digital payment methods for POS checkout.',
      icon: CreditCard,
      isCompleted: hasPaymentMethods,
      actionPath: '/settings',
      actionLabel: isBengali ? 'পেমেন্ট দেখুন' : 'Check Payments',
    },
    {
      id: 'staff-roles',
      title: isBengali ? 'কর্মী ও ভূমিকা যোগ করুন' : 'Setup Team & Cashiers',
      description: isBengali
        ? 'ক্যাশিয়ার বা পরিচালকদের জন্য অ্যাকাউন্ট এবং পিন নির্ধারণ করুন।'
        : 'Create cashier accounts with quick-login PINs for daily operations.',
      icon: Users,
      isCompleted: hasStaff,
      actionPath: '/settings',
      actionLabel: isBengali ? 'কর্মী পরিচালনা' : 'Manage Staff',
    },
  ];

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  const handleDismiss = () => {
    localStorage.setItem('lucky_setup_checklist_dismissed', 'true');
    setIsDismissed(true);
  };

  const handleRestore = () => {
    localStorage.removeItem('lucky_setup_checklist_dismissed');
    setIsDismissed(false);
  };

  if (isDismissed) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-lg border border-border-default bg-surface px-4 py-2.5 text-body-sm text-text-muted">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-warm-accent" />
          <span>
            {isBengali
              ? `সেটআপ চেকলিস্ট লুকানো রয়েছে (${completedCount}/${items.length} সম্পন্ন)`
              : `Setup checklist is hidden (${completedCount}/${items.length} completed)`}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRestore}
          className="text-label-sm font-semibold text-warm-accent hover:underline focus:outline-none focus:ring-2 focus:ring-warm-accent"
        >
          {isBengali ? 'চেকলিস্ট দেখান' : 'Show Checklist'}
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label={isBengali ? 'অনবোর্ডিং চেকলিস্ট' : 'Store Setup Checklist'}
      className="mb-8 rounded-xl border border-border-default bg-surface p-5 shadow-sm transition-all"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warm-accent/20 text-warm-accent">
              <Sparkles size={14} />
            </span>
            <h2 className="text-title-md font-semibold text-text-primary">
              {isBengali ? 'স্টোর সেটআপ চেকলিস্ট' : 'Store Setup Checklist'}
            </h2>
            <span className="rounded-full bg-background-subtle px-2.5 py-0.5 text-label-sm font-medium text-text-muted">
              {completedCount}/{items.length}
            </span>
          </div>
          <p className="mt-1 text-body-sm text-text-muted">
            {isBengali
              ? 'দৈনন্দিন বিক্রয় এবং প্রতিবেদন নির্বিঘ্নে চালু করতে প্রাথমিক পদক্ষেপগুলো সম্পন্ন করুন।'
              : 'Complete these key steps to get your Lucky Store POS running smoothly.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg p-1.5 text-text-muted hover:bg-background-subtle hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              title={isBengali ? 'রিফ্রেশ করুন' : 'Refresh checklist'}
              aria-label={isBengali ? 'রিফ্রেশ করুন' : 'Refresh checklist'}
            >
              <RefreshCw size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1.5 text-text-muted hover:bg-background-subtle hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            title={isBengali ? 'চেকলিস্ট আড়াল করুন' : 'Dismiss checklist'}
            aria-label={isBengali ? 'চেকলিস্ট আড়াল করুন' : 'Dismiss checklist'}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-caption text-text-muted mb-1.5">
          <span>{isBengali ? 'অগ্রগতি' : 'Progress'}</span>
          <span className="font-semibold text-text-primary">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-background-subtle">
          <div
            className="h-full bg-warm-accent transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Items List */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-lg border p-4 transition-all ${
                item.isCompleted
                  ? 'border-warm-success/20 bg-warm-success/5'
                  : 'border-border-default bg-surface hover:border-warm-accent/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      item.isCompleted
                        ? 'bg-warm-success/15 text-warm-success'
                        : 'bg-background-subtle text-text-muted'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  {item.isCompleted ? (
                    <span className="flex items-center gap-1 text-label-sm font-medium text-warm-success">
                      <CheckCircle2 size={16} />
                      <span>{isBengali ? 'সম্পন্ন' : 'Done'}</span>
                    </span>
                  ) : (
                    <Circle size={16} className="text-text-muted" />
                  )}
                </div>

                <h3 className="mt-3 text-label-lg font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-1 text-body-sm text-text-muted line-clamp-2">{item.description}</p>
              </div>

              <button
                type="button"
                onClick={() => navigate(item.actionPath)}
                className={`mt-4 flex items-center justify-between rounded-md px-3 py-2 text-label-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  item.isCompleted
                    ? 'bg-transparent text-text-muted hover:bg-background-subtle hover:text-text-primary'
                    : 'bg-warm-accent/15 text-warm-accent hover:bg-warm-accent/25'
                }`}
              >
                <span>{item.actionLabel}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
