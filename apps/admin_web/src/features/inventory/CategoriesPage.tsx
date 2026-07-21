import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonBlock } from '../../components/PageState';
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Tag,
  LayoutList,
  Palette,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ImageUploadZone } from '../../components/inventory/ImageUploadZone';
import { uploadCategoryImage } from '../../lib/images';

interface Category {
  id: string;
  name: string | null;
  category: string;
  slug: string | null;
  parent_id: string | null;
  color: string | null;
  icon: string | null;
  emoji: string | null;
  display_order: number | null;
  active: boolean | null;
  store_id: string | null;
  tenant_id: string | null;
  image_url: string | null;
}

interface CategoryFormData {
  name: string;
  slug: string;
  parent_id: string | null;
  color: string | null;
  icon: string | null;
  emoji: string | null;
  display_order: number | null;
  active: boolean;
  image_url: string | null;
}

/* ------------------------------------------------------------------ */
// Helpers

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getCategoryDisplay(cat: Category) {
  const name = cat.name || cat.category || 'Untitled';
  const displayIcon = cat.emoji || cat.icon || '📦';
  const displayColor = cat.color || '#78716c';
  return { name, displayIcon, displayColor };
}

function getCategoryItemCount(categoryId: string, allCategories: Category[], inventoryItems: any[]) {
  let count = inventoryItems.filter((item: any) => item.category_id === categoryId).length;
  const children = allCategories.filter((c) => c.parent_id === categoryId);
  for (const child of children) {
    count += getCategoryItemCount(child.id, allCategories, inventoryItems);
  }
  return count;
}

const PRESET_COLORS = [
  '#4F46E5', '#0D9488', '#E8B84B', '#EF4444',
  '#3B82F6', '#8B5CF6', '#F97316', '#10B981',
  '#EC4899', '#6366F1', '#14B8A6', '#F59E0B',
  '#78716c', '#DC2626', '#2563EB', '#059669',
];

/* ------------------------------------------------------------------ */
// CategoryTreeNode: recursive card for a category and its children

interface CategoryTreeNodeProps {
  category: Category;
  allCategories: Category[];
  inventoryItems: any[];
  level: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onToggleActive: (cat: Category) => void;
}

const CategoryTreeNode: React.FC<CategoryTreeNodeProps> = ({
  category,
  allCategories,
  inventoryItems,
  level,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const children = useMemo(
    () => allCategories.filter((c) => c.parent_id === category.id).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [allCategories, category.id]
  );
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const { name, displayIcon, displayColor } = getCategoryDisplay(category);
  const itemCount = getCategoryItemCount(category.id, allCategories, inventoryItems);
  const isActive = category.active !== false;

  return (
    <div className="flex flex-col">
      <Card
        padding="md"
        className={clsx(
          'transition-all duration-200',
          !isActive && 'opacity-60',
          level > 0 && 'ml-6 border-l-2 border-l-warm-accent/40'
        )}
      >
        <div className="flex items-center gap-3">
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(category.id)}
              className="p-1 rounded-md hover:bg-warm-border-warm/50 text-warm-muted transition-colors"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-6" />
          )}

          {/* Thumbnail or colored icon */}
          {category.image_url ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-warm-border-warm">
              <img
                src={category.image_url}
                alt={name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: displayColor + '20', color: displayColor }}
            >
              <span>{displayIcon}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={clsx('font-semibold text-sm', !isActive && 'text-warm-dim')}>
                {name}
              </span>
              {category.slug && (
                <span className="text-[10px] text-warm-muted bg-warm-border-warm/50 px-1.5 py-0.5 rounded-md">
                  /{category.slug}
                </span>
              )}
              {!isActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-warm-danger/10 text-warm-danger font-medium">
                  Inactive
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-warm-muted">
              <span className="flex items-center gap-1">
                <Tag size={11} />
                {itemCount} items
              </span>
              {hasChildren && (
                <span className="flex items-center gap-1">
                  <FolderOpen size={11} />
                  {children.length} sub{children.length === 1 ? '' : 's'}
                </span>
              )}
              {level === 0 && category.display_order !== null && (
                <span className="flex items-center gap-1">
                  <LayoutList size={11} />
                  Order {category.display_order}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggleActive(category)}
              title={isActive ? 'Deactivate' : 'Activate'}
              className={clsx(
                'p-1.5 rounded-md transition-colors',
                isActive
                  ? 'text-warm-success hover:bg-warm-success/10'
                  : 'text-warm-muted hover:bg-warm-border-warm/50'
              )}
            >
              {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              onClick={() => onEdit(category)}
              title="Edit"
              className="p-1.5 rounded-md text-warm-muted hover:text-warm-accent hover:bg-warm-accent/10 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(category)}
              title="Delete"
              className="p-1.5 rounded-md text-warm-muted hover:text-warm-danger hover:bg-warm-danger/10 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </Card>

      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              allCategories={allCategories}
              inventoryItems={inventoryItems}
              level={level + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
// CategoryFormModal

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => void;
  initialData?: Category | null;
  allCategories: Category[];
  isSubmitting: boolean;
  storeId: string;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  allCategories,
  isSubmitting,
  storeId,
}) => {
  const isEditing = !!initialData;

  const [formData, setFormData] = useState<CategoryFormData>(() => {
    if (initialData) {
      return {
        name: initialData.name || initialData.category || '',
        slug: initialData.slug || '',
        parent_id: initialData.parent_id,
        color: initialData.color,
        icon: initialData.icon,
        emoji: initialData.emoji,
        display_order: initialData.display_order ?? null,
        active: initialData.active !== false,
        image_url: initialData.image_url,
      };
    }
    return {
      name: '',
      slug: '',
      parent_id: null,
      color: null,
      icon: null,
      emoji: null,
      display_order: null,
      active: true,
      image_url: null,
    };
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || initialData.category || '',
        slug: initialData.slug || '',
        parent_id: initialData.parent_id,
        color: initialData.color,
        icon: initialData.icon,
        emoji: initialData.emoji,
        display_order: initialData.display_order ?? null,
        active: initialData.active !== false,
        image_url: initialData.image_url,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        parent_id: null,
        color: null,
        icon: null,
        emoji: null,
        display_order: null,
        active: true,
        image_url: null,
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (field: keyof CategoryFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, name: value };
      if (!isEditing && value.trim()) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  const parentOptions = useMemo(() => {
    return allCategories
      .filter((c) => !c.parent_id)
      .filter((c) => (initialData ? c.id !== initialData.id : true))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [allCategories, initialData]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Category' : 'Add Category'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-warm-muted uppercase tracking-wider mb-1">
            Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Ice Cream"
            className="w-full rounded-md border border-warm-border-warm bg-warm-surface px-3 py-2 text-sm text-warm-fg focus:outline-none focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-warm-muted uppercase tracking-wider mb-1">
            Slug
          </label>
          <div className="flex items-center">
            <span className="px-2 py-2 text-sm text-warm-muted bg-warm-border-warm/30 rounded-l-md border border-r-0 border-warm-border-warm">
              /
            </span>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              placeholder="ice-cream"
              className="flex-1 rounded-r-md border border-warm-border-warm bg-warm-surface px-3 py-2 text-sm text-warm-fg focus:outline-none focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-warm-muted uppercase tracking-wider mb-1">
            Parent Category
          </label>
          <select
            value={formData.parent_id || ''}
            onChange={(e) => handleChange('parent_id', e.target.value || null)}
            className="w-full rounded-md border border-warm-border-warm bg-warm-surface px-3 py-2 text-sm text-warm-fg focus:outline-none focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent"
          >
            <option value="">— Root category —</option>
            {parentOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name || cat.category}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-warm-muted mt-1">
            Select a parent to make this a sub-category. Leave empty for a top-level category.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-warm-muted uppercase tracking-wider mb-2">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleChange('color', color)}
                className={clsx(
                  'w-7 h-7 rounded-full border-2 transition-all',
                  formData.color === color
                    ? 'border-warm-fg scale-110 shadow-md'
                    : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <button
              type="button"
              onClick={() => handleChange('color', null)}
              className={clsx(
                'w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] text-warm-muted',
                formData.color === null
                  ? 'border-warm-fg'
                  : 'border-warm-border-warm hover:border-warm-muted'
              )}
              title="No color"
            >
              <Palette size={12} />
            </button>
          </div>
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="block text-xs font-medium text-warm-muted uppercase tracking-wider mb-2">
            Thumbnail Image
          </label>
          <div className="flex items-center gap-3">
            <ImageUploadZone
              currentImageUrl={formData.image_url ?? undefined}
              onUpload={async (file) => {
                const url = await uploadCategoryImage({
                  file,
                  storeId: storeId!,
                  categoryId: isEditing ? initialData!.id : crypto.randomUUID(),
                });
                handleChange('image_url', url);
              }}
              onRemove={() => handleChange('image_url', null)}
              size="md"
              showOnHover={false}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-warm-muted">
                Upload a thumbnail image
              </span>
              <span className="text-[10px] text-warm-muted">
                Max 5MB. JPG, PNG, WebP accepted.
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-warm-muted uppercase tracking-wider mb-1">
            Emoji Icon
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.emoji || ''}
              onChange={(e) => handleChange('emoji', e.target.value || null)}
              placeholder="🍦"
              maxLength={2}
              className="w-16 text-center rounded-md border border-warm-border-warm bg-warm-surface px-3 py-2 text-lg text-warm-fg focus:outline-none focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent"
            />
            <span className="text-xs text-warm-muted">
              Leave empty to auto-detect from category name
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-warm-muted uppercase tracking-wider mb-1">
            Display Order
          </label>
          <input
            type="number"
            value={formData.display_order ?? ''}
            onChange={(e) => handleChange('display_order', e.target.value === '' ? null : parseInt(e.target.value))}
            placeholder="0"
            min={0}
            className="w-full rounded-md border border-warm-border-warm bg-warm-surface px-3 py-2 text-sm text-warm-fg focus:outline-none focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) => handleChange('active', e.target.checked)}
            className="w-4 h-4 rounded border-warm-border-warm text-warm-accent focus:ring-warm-accent"
          />
          <label htmlFor="active" className="text-sm text-warm-fg font-medium">
            Active
          </label>
          <span className="text-[11px] text-warm-muted">
            Inactive categories are hidden from the storefront
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-warm-border-warm">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
// Main Page

export function CategoriesPage() {
  const { storeId, tenantId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory', storeId],
    queryFn: () => api.inventory.list(storeId!),
    enabled: !!storeId,
  });

  const rootCategories = useMemo(() => {
    return categories
      .filter((c: Category) => !c.parent_id)
      .sort((a: Category, b: Category) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [categories]);

  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c: Category) => c.active !== false).length;
    const roots = categories.filter((c: Category) => !c.parent_id).length;
    const leafs = categories.filter((c: Category) => {
      return !categories.some((cc: Category) => cc.parent_id === c.id);
    }).length;
    return { total, active, inactive: total - active, roots, leafs };
  }, [categories]);

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) =>
      api.categories.create(tenantId!, storeId!, {
        ...data,
        category: data.name,
      }),
    onSuccess: () => {
      notify('Category created successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsFormOpen(false);
    },
    onError: (err: any) => notify(err?.message || 'Failed to create category', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormData }) =>
      api.categories.update(id, {
        ...data,
        category: data.name,
      }),
    onSuccess: () => {
      notify('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsFormOpen(false);
      setEditingCategory(null);
    },
    onError: (err: any) => notify(err?.message || 'Failed to update category', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.categories.remove(id),
    onSuccess: () => {
      notify('Category deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeletingCategory(null);
    },
    onError: (err: any) => notify(err?.message || 'Failed to delete category', 'error'),
  });

  const handleSubmit = useCallback(
    (data: CategoryFormData) => {
      if (editingCategory) {
        updateMutation.mutate({ id: editingCategory.id, data });
      } else {
        createMutation.mutate(data);
      }
    },
    [editingCategory, createMutation, updateMutation]
  );

  const handleEdit = useCallback((cat: Category) => {
    setEditingCategory(cat);
    setIsFormOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingCategory(null);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((cat: Category) => {
    setDeletingCategory(cat);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deletingCategory) {
      deleteMutation.mutate(deletingCategory.id);
    }
  }, [deletingCategory, deleteMutation]);

  const handleToggleActive = useCallback(
    (cat: Category) => {
      const nextActive = cat.active === false ? true : false;
      api.categories
        .update(cat.id, { active: nextActive })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          notify(nextActive ? 'Category activated' : 'Category deactivated');
        })
        .catch((err: any) => notify(err?.message || 'Failed to update', 'error'));
    },
    [queryClient, notify]
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col pt-6">
      <PageHeader
        title="Categories"
        subtitle="Organize your product catalog with hierarchical categories."
      />

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 mb-4">
        {categoriesLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} padding="sm" className="flex flex-col items-center justify-center py-3">
              <SkeletonBlock className="w-8 h-6" />
            </Card>
          ))
        ) : (
          <>
            <Card padding="sm" className="flex flex-col items-center justify-center py-3">
              <span className="text-2xl font-bold text-warm-fg">{stats.total}</span>
              <span className="text-[11px] text-warm-muted uppercase tracking-wider">Total</span>
            </Card>
            <Card padding="sm" className="flex flex-col items-center justify-center py-3">
              <span className="text-2xl font-bold text-warm-success">{stats.active}</span>
              <span className="text-[11px] text-warm-muted uppercase tracking-wider">Active</span>
            </Card>
            <Card padding="sm" className="flex flex-col items-center justify-center py-3">
              <span className="text-2xl font-bold text-warm-danger">{stats.inactive}</span>
              <span className="text-[11px] text-warm-muted uppercase tracking-wider">Inactive</span>
            </Card>
            <Card padding="sm" className="flex flex-col items-center justify-center py-3">
              <span className="text-2xl font-bold text-warm-accent">{stats.roots}</span>
              <span className="text-[11px] text-warm-muted uppercase tracking-wider">Root</span>
            </Card>
            <Card padding="sm" className="flex flex-col items-center justify-center py-3">
              <span className="text-2xl font-bold text-warm-fg">{stats.leafs}</span>
              <span className="text-[11px] text-warm-muted uppercase tracking-wider">Leaf</span>
            </Card>
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button size="sm" icon={<Plus size={14} />} onClick={handleAdd}>
            Add Category
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<ChevronDown size={14} />}
            onClick={() => setExpandedIds(new Set(rootCategories.map((c: Category) => c.id)))}
          >
            Expand All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<ChevronRight size={14} />}
            onClick={() => setExpandedIds(new Set())}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Category Tree */}
      <div className="space-y-2 pb-12">
        {categoriesLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4">
              <SkeletonBlock className="w-full h-14" />
            </div>
          ))
        ) : rootCategories.length === 0 ? (
          <Card padding="lg" className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-warm-border-warm/50 flex items-center justify-center mb-4">
              <FolderOpen size={32} className="text-warm-muted" />
            </div>
            <h3 className="text-lg font-semibold text-warm-fg mb-1">No categories yet</h3>
            <p className="text-sm text-warm-muted max-w-md mb-4">
              Create your first category to start organizing products. You can add sub-categories for finer grouping.
            </p>
            <Button icon={<Plus size={16} />} onClick={handleAdd}>
              Add Category
            </Button>
          </Card>
        ) : (
          rootCategories.map((cat: Category) => (
            <CategoryTreeNode
              key={cat.id}
              category={cat}
              allCategories={categories as Category[]}
              inventoryItems={inventoryItems}
              level={0}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))
        )}
      </div>

      {/* Form Modal */}
      <CategoryFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingCategory}
        allCategories={categories as Category[]}
        isSubmitting={isSubmitting}
        storeId={storeId!}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deletingCategory}
        title="Delete Category"
        message={
          deletingCategory
            ? `Are you sure you want to delete "${deletingCategory.name || deletingCategory.category}"? This cannot be undone. Products in this category will become uncategorized.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
}

export default CategoriesPage;
