import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { SkeletonBlock, SkeletonListItem } from '../../components/PageState';
import { useDebounce } from '../../hooks/useDebounce';
import { MetricCard } from '../../components/data-display/MetricCard';
import { TableFilters } from '../../components/data-display/TableFilters';
import {
  Bell,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { Reminder, ReminderType } from '../../lib/api/types';

const REMINDER_TYPES: { value: ReminderType; label: string }[] = [
  { value: 'payment_due', label: 'Payment Due' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'stock_check', label: 'Stock Check' },
  { value: 'other', label: 'Other' },
];

const TYPE_COLORS: Record<ReminderType, { bg: string; text: string }> = {
  payment_due: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--color-danger)' },
  follow_up: { bg: 'rgba(59, 130, 246, 0.1)', text: 'var(--color-info)' },
  stock_check: { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--color-warning)' },
  other: { bg: 'rgba(100, 116, 139, 0.1)', text: 'var(--text-muted)' },
};

function formatReminderDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days}d`;
}

export function RemindersPage() {
  const { tenantId, storeId, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: reminders, isLoading, error } = useQuery({
    queryKey: ['reminders', storeId, showCompleted],
    queryFn: () => api.reminders.list(storeId, showCompleted),
  });

  const createMutation = useMutation({
    mutationFn: (params: Parameters<typeof api.reminders.create>[0]) => api.reminders.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', storeId] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: Parameters<typeof api.reminders.update>[0]) => api.reminders.update(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', storeId] });
      setShowModal(false);
      setEditingReminder(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.reminders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', storeId] });
      setDeleteConfirm(null);
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: (r: Reminder) => api.reminders.update({
      reminderId: r.id,
      isCompleted: !r.isCompleted,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', storeId] });
    },
  });

  // Summary counts — computed from raw reminders (all, including completed for accurate counts)
  const overdueCount = useMemo(
    () => (reminders ?? []).filter(r => !r.isCompleted && daysUntil(r.reminderDate) < 0).length,
    [reminders],
  );
  const todayCount = useMemo(
    () => (reminders ?? []).filter(r => !r.isCompleted && daysUntil(r.reminderDate) === 0).length,
    [reminders],
  );
  const upcomingCount = useMemo(
    () => (reminders ?? []).filter(r => !r.isCompleted && daysUntil(r.reminderDate) > 0).length,
    [reminders],
  );

  // Filtered list for display
  const filtered = useMemo(() => {
    if (!reminders) return [];
    return reminders.filter(r => {
      if (filterType && r.reminderType !== filterType) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matches =
          r.title.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [reminders, filterType, debouncedSearch]);

  const handleOpenCreate = () => {
    setEditingReminder(null);
    setShowModal(true);
  };

  const handleOpenEdit = (r: Reminder) => {
    setEditingReminder(r);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm(id);
  };

  if (error) {
    return (
      <div className="reminders-container">
        <div className="reminders-error">
          <AlertCircle size={20} />
          <span>Failed to load reminders. {(error as Error).message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="reminders-container">
      <header className="reminders-header">
        <div>
          <h1 className="reminders-title">Reminders</h1>
          <p className="reminders-subtitle">Track upcoming payments, follow-ups, and stock checks.</p>
        </div>
        <button className="button-primary" onClick={handleOpenCreate}>
          <Plus size={18} /> New Reminder
        </button>
      </header>

      {/* Summary Cards */}
      <div className="dashboard-grid">
        <MetricCard
          title="Overdue"
          value={overdueCount}
          icon={<AlertTriangle size={20} className="text-red-500" />}
          color="danger"
          variant="light"
        />
        <MetricCard
          title="Today"
          value={todayCount}
          icon={<Clock size={20} className="text-amber-500" />}
          color="warning"
          variant="light"
        />
        <MetricCard
          title="Upcoming"
          value={upcomingCount}
          icon={<Calendar size={20} className="text-emerald-600" />}
          color="success"
          variant="light"
        />
      </div>

      {/* Toolbar */}
      <div className="reminders-toolbar">
        <TableFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search reminders..."
          filters={[
            {
              label: 'Type',
              value: filterType,
              onChange: setFilterType,
              options: [
                { label: 'All Types', value: '' },
                ...REMINDER_TYPES.map(t => ({ label: t.label, value: t.value })),
              ],
            },
          ]}
          onClear={() => { setFilterType(''); setSearchTerm(''); }}
          isFiltered={!!(filterType || searchTerm)}
        >
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`reminders-toggle-btn ${showCompleted ? 'active' : ''}`}
          >
            <Check size={16} /> Show completed
          </button>
        </TableFilters>
      </div>

      {/* Reminder List */}
      {isLoading ? (
        <div className="reminders-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="card reminders-empty">
          <Bell size={48} className="reminders-empty-icon" />
          <p className="reminders-empty-title">No reminders found</p>
          <p className="reminders-empty-text">
            {reminders?.length === 0
              ? 'Create your first reminder to stay on top of payments, follow-ups, and stock checks.'
              : 'No reminders match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="reminders-list">
          {filtered.map((r) => {
            const days = daysUntil(r.reminderDate);
            const typeColor = TYPE_COLORS[r.reminderType] || TYPE_COLORS.other;
            const typeLabel = REMINDER_TYPES.find(t => t.value === r.reminderType)?.label ?? 'Other';
            const isOverdue = days < 0 && !r.isCompleted;

            return (
              <div
                key={r.id}
                className={`card reminders-item ${r.isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleCompleteMutation.mutate(r)}
                  className={`reminders-checkbox ${r.isCompleted ? 'checked' : ''}`}
                >
                  {r.isCompleted && <Check size={14} className="reminders-checkbox-icon" />}
                </button>

                {/* Content */}
                <div className="reminders-item-content">
                  <div className="reminders-item-header">
                    <span className={`reminders-item-title ${r.isCompleted ? 'done' : ''}`}>
                      {r.title}
                    </span>
                    <span className="reminders-type-badge" style={{ backgroundColor: typeColor.bg, color: typeColor.text }}>
                      {typeLabel}
                    </span>
                    {isOverdue && (
                      <span className="reminders-overdue-badge">
                        Overdue
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <p className="reminders-item-desc">{r.description}</p>
                  )}
                </div>

                {/* Date */}
                <div className="reminders-item-date">
                  <span className={`reminders-date-value ${isOverdue ? 'overdue' : ''}`}>
                    {formatReminderDate(r.reminderDate)}
                  </span>
                  <span className={`reminders-days-label ${isOverdue ? 'overdue' : ''}`}>
                    {daysLabel(days)}
                  </span>
                </div>

                {/* Actions */}
                <div className="reminders-item-actions">
                  <button
                    onClick={() => handleOpenEdit(r)}
                    title="Edit"
                    className="reminders-action-btn"
                  >
                    <Edit3 size={16} />
                  </button>
                  {deleteConfirm === r.id ? (
                    <div className="reminders-delete-confirm">
                      <button
                        onClick={() => deleteMutation.mutate(r.id)}
                        className="button-danger reminders-confirm-btn"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="button-outline reminders-confirm-btn"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDelete(r.id)}
                      title="Delete"
                      className="reminders-action-btn"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ReminderModal
          reminder={editingReminder}
          tenantId={tenantId}
          storeId={storeId}
          userId={user?.id ?? null}
          onSubmit={editingReminder
            ? (params) => updateMutation.mutate({ reminderId: editingReminder.id, ...params })
            : (params) => createMutation.mutate(params)
          }
          isLoading={createMutation.isPending || updateMutation.isPending}
          error={createMutation.error?.message || updateMutation.error?.message}
          onClose={() => { setShowModal(false); setEditingReminder(null); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reminder Modal (Create / Edit)
// ---------------------------------------------------------------------------

interface ReminderModalProps {
  reminder: Reminder | null;
  tenantId: string;
  storeId: string;
  userId: string | null;
  onSubmit: (params: {
    tenantId: string;
    storeId: string;
    title: string;
    description: string | null;
    reminderDate: string;
    reminderType: string;
    createdBy: string | null;
  }) => void;
  isLoading: boolean;
  error?: string;
  onClose: () => void;
}

function ReminderModal({ reminder, tenantId, storeId, userId, onSubmit, isLoading, error, onClose }: ReminderModalProps) {
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [description, setDescription] = useState(reminder?.description ?? '');
  const [reminderDate, setReminderDate] = useState(reminder?.reminderDate ?? '');
  const [reminderType, setReminderType] = useState<ReminderType>(reminder?.reminderType ?? 'other');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      tenantId,
      storeId,
      title: title.trim(),
      description: description.trim() || null,
      reminderDate,
      reminderType,
      createdBy: userId,
    });
  };

  return (
    <div className="reminders-modal-overlay" onClick={onClose}>
      <div className="card reminders-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reminders-modal-header">
          <h2 className="reminders-modal-title">
            {reminder ? 'Edit Reminder' : 'New Reminder'}
          </h2>
          <button onClick={onClose} className="reminders-modal-close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="reminders-form-error">
            <AlertCircle size={14} />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reminders-form">
          <label className="reminders-form-label">
            Title *
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pay supplier due"
              className="reminders-form-input"
            />
          </label>

          <label className="reminders-form-label">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              className="reminders-form-textarea"
            />
          </label>

          <div className="reminders-form-row">
            <label className="reminders-form-label">
              <Calendar size={12} className="reminders-form-label-icon" /> Date *
              <input
                type="date"
                required
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="reminders-form-input"
              />
            </label>
            <label className="reminders-form-label">
              Type *
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value as ReminderType)}
                className="reminders-form-input"
              >
                {REMINDER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="reminders-form-actions">
            <button type="button" onClick={onClose} className="button-outline">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="button-primary" style={{ opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? 'Saving...' : reminder ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}