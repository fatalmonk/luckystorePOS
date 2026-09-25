import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Command, Search, Eye, Moon, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  category: string;
  items: {
    keys: string[];
    description: string;
  }[];
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const { i18n } = useTranslation();
  const isBengali = i18n.language?.startsWith('bn') || i18n.resolvedLanguage?.startsWith('bn');
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Move focus inside dialog
    requestAnimationFrame(() => {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalRef.current?.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: isBengali ? 'সাধারণ ও নেভিগেশন' : 'General & Navigation',
      items: [
        {
          keys: ['Ctrl', 'K'],
          description: isBengali ? 'কুইক কমান্ড প্যালেট খুলুন' : 'Open quick command palette',
        },
        {
          keys: ['/'],
          description: isBengali ? 'অনুসন্ধান বক্সে যান' : 'Focus global search input',
        },
        {
          keys: ['?'],
          description: isBengali ? 'কীবোর্ড শর্টকাট গাইড দেখুন' : 'Show keyboard shortcuts guide',
        },
        {
          keys: ['Esc'],
          description: isBengali ? 'খোলা মোডাল বা ড্রয়ার বন্ধ করুন' : 'Close active modal or drawer',
        },
      ],
    },
    {
      category: isBengali ? 'ইনভেন্টরি ও স্টক' : 'Inventory & Stock',
      items: [
        {
          keys: ['Shift', 'A'],
          description: isBengali ? 'নতুন পণ্য যোগ করার ফর্ম' : 'Add new product modal',
        },
        {
          keys: ['Shift', 'E'],
          description: isBengali ? 'বাল্ক এডিট মোড টগল করুন' : 'Toggle bulk edit mode',
        },
        {
          keys: ['Shift', 'G'],
          description: isBengali ? 'গ্রিড এবং তালিকা ভিউ টগল করুন' : 'Toggle Grid / List view',
        },
        {
          keys: ['Shift', 'S'],
          description: isBengali ? 'বারকোড স্ক্যানার মোডাল খুলুন' : 'Open barcode scanner modal',
        },
        {
          keys: ['Shift', 'X'],
          description: isBengali ? 'নির্বাচিত পণ্য এক্সপোর্ট করুন' : 'Export selected products',
        },
      ],
    },
    {
      category: isBengali ? 'হেডার ও ভিউ কন্ট্রোল' : 'Display & Privacy',
      items: [
        {
          keys: ['Ctrl', 'P'],
          description: isBengali ? 'বর্তমান স্টেটমেন্ট / রিপোর্ট প্রিন্ট করুন' : 'Print current statement / report',
        },
      ],
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={isBengali ? 'কীবোর্ড শর্টকাট' : 'Keyboard Shortcuts'}
        tabIndex={-1}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-default bg-surface p-6 shadow-level-3 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warm-accent/20 text-warm-accent">
              <Keyboard size={18} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {isBengali ? 'কীবোর্ড শর্টকাট' : 'Keyboard Shortcuts'}
              </h2>
              <p className="text-body-sm text-text-muted">
                {isBengali ? 'কীবোর্ড ব্যবহার করে দ্রুত কাজ পরিচালনা করুন' : 'Navigate Lucky Store faster with keyboard actions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isBengali ? 'বন্ধ করুন' : 'Close shortcuts guide'}
            className="rounded-lg p-1.5 text-text-muted hover:bg-background-subtle hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.category}>
              <h3 className="text-label-md font-semibold text-text-muted uppercase tracking-wider mb-3">
                {group.category}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-border-default bg-background-subtle/50 px-3 py-2 text-body-sm"
                  >
                    <span className="text-text-primary">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="rounded border border-border-default bg-surface px-2 py-0.5 text-caption font-mono font-semibold text-text-primary shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-border-default pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="button-primary px-4 py-2 rounded-lg font-medium"
          >
            {isBengali ? 'ঠিক আছে' : 'Got it'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
