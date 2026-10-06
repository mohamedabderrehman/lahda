import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/client';

type CategoryItem = {
  id: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  iconUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export default function Categories() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
  const create = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowAdd(false);
    },
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCategory>[1] }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const items = (data ?? []) as CategoryItem[];

  if (isLoading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-600">{String(error)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
          Add Category
        </button>
      </div>

      {showAdd && (
        <AddForm
          onSave={(d) => create.mutate(d)}
          onCancel={() => setShowAdd(false)}
          error={create.isError ? String(create.error) : null}
          loading={create.isPending}
        />
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Icon</th>
                <th className="table-th">Name (AR)</th>
                <th className="table-th">Name (EN)</th>
                <th className="table-th">Slug</th>
                <th className="table-th">Order</th>
                <th className="table-th">Active</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((c) =>
                editing?.id === c.id ? (
                  <EditRow
                    key={c.id}
                    item={c}
                    onSave={(d) => update.mutate({ id: c.id, data: d })}
                    onCancel={() => setEditing(null)}
                    loading={update.isPending}
                  />
                ) : (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      {c.iconUrl ? <img src={c.iconUrl} alt="" className="h-8 w-8 object-contain rounded" /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="table-td font-medium">{c.nameAr}</td>
                    <td className="table-td text-gray-500">{c.nameEn ?? '—'}</td>
                    <td className="table-td text-gray-500">{c.slug}</td>
                    <td className="table-td">{c.sortOrder}</td>
                    <td className="table-td">{c.isActive ? 'Yes' : 'No'}</td>
                    <td className="table-td">
                      <button type="button" onClick={() => setEditing(c)} className="text-sm font-medium text-primary-600 mr-3">Edit</button>
                      <button
                        type="button"
                        onClick={() => window.confirm('Delete this category?') && remove.mutate(c.id)}
                        disabled={remove.isPending}
                        className="text-sm font-medium text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        {items.length === 0 && !showAdd && <div className="p-8 text-center text-gray-500">No categories yet. Add one above.</div>}
      </div>
    </div>
  );
}

function AddForm({ onSave, onCancel, error, loading }: {
  onSave: (d: { nameAr: string; nameEn?: string; slug: string; iconUrl?: string; sortOrder?: number }) => void;
  onCancel: () => void;
  error: string | null;
  loading: boolean;
}) {
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !slug.trim()) return;
    onSave({
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || undefined,
      slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
      iconUrl: iconUrl.trim() || undefined,
      sortOrder: sortOrder || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">New Category</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name (AR) *</label>
          <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="input" dir="rtl" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name (EN)</label>
          <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="input" placeholder="e.g. food" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Icon URL</label>
          <input type="url" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} className="input" placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} className="input" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add'}</button>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

function EditRow({ item, onSave, onCancel, loading }: {
  item: CategoryItem;
  onSave: (d: { nameAr?: string; nameEn?: string; slug?: string; iconUrl?: string; sortOrder?: number; isActive?: boolean }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [nameAr, setNameAr] = useState(item.nameAr);
  const [nameEn, setNameEn] = useState(item.nameEn ?? '');
  const [slug, setSlug] = useState(item.slug);
  const [iconUrl, setIconUrl] = useState(item.iconUrl ?? '');
  const [sortOrder, setSortOrder] = useState(item.sortOrder);
  const [isActive, setIsActive] = useState(item.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ nameAr, nameEn: nameEn || undefined, slug, iconUrl: iconUrl || undefined, sortOrder, isActive });
  };

  return (
    <tr>
      <td colSpan={7} className="table-td bg-gray-50">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Icon URL</label>
            <input type="url" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} className="input w-48" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name AR</label>
            <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="input w-32" dir="rtl" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name EN</label>
            <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="input w-32" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="input w-24" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Order</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} className="input w-16" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            <label htmlFor="active" className="text-sm text-gray-600">Active</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary text-sm py-1.5">Save</button>
            <button type="button" onClick={onCancel} className="btn-ghost text-sm py-1.5">Cancel</button>
          </div>
        </form>
      </td>
    </tr>
  );
}
