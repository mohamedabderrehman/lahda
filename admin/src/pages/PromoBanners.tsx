import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPromoBanners, createPromoBanner, updatePromoBanner, deletePromoBanner } from '../api/client';

type PromoItem = {
  id: string;
  titleAr: string;
  titleEn: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export default function PromoBanners() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PromoItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['promo-banners'],
    queryFn: getPromoBanners,
  });
  const create = useMutation({
    mutationFn: createPromoBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-banners'] });
      setShowAdd(false);
    },
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updatePromoBanner>[1] }) => updatePromoBanner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-banners'] });
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: deletePromoBanner,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promo-banners'] }),
  });

  const items = (data ?? []) as PromoItem[];

  if (isLoading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-600">{String(error)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Promo Banners</h1>
        <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
          Add Banner
        </button>
      </div>
      <p className="text-gray-500 text-sm">These banners appear in the customer app home carousel.</p>

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
                <th className="table-th">Image</th>
                <th className="table-th">Title (AR)</th>
                <th className="table-th">Title (EN)</th>
                <th className="table-th">Link</th>
                <th className="table-th">Order</th>
                <th className="table-th">Active</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((p) =>
                editing?.id === p.id ? (
                  <EditRow
                    key={p.id}
                    item={p}
                    onSave={(d) => update.mutate({ id: p.id, data: d })}
                    onCancel={() => setEditing(null)}
                    loading={update.isPending}
                  />
                ) : (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-12 w-20 object-cover rounded" /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="table-td font-medium">{p.titleAr}</td>
                    <td className="table-td text-gray-500">{p.titleEn ?? '—'}</td>
                    <td className="table-td text-gray-500 max-w-[120px] truncate">{p.linkUrl ?? '—'}</td>
                    <td className="table-td">{p.sortOrder}</td>
                    <td className="table-td">{p.isActive ? 'Yes' : 'No'}</td>
                    <td className="table-td">
                      <button type="button" onClick={() => setEditing(p)} className="text-sm font-medium text-primary-600 mr-3">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => window.confirm('Delete this banner?') && remove.mutate(p.id)}
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
        {items.length === 0 && !showAdd && <div className="p-8 text-center text-gray-500">No promo banners yet. Add one above.</div>}
      </div>
    </div>
  );
}

function AddForm({
  onSave,
  onCancel,
  error,
  loading,
}: {
  onSave: (d: { titleAr: string; titleEn?: string; imageUrl?: string; linkUrl?: string; sortOrder?: number }) => void;
  onCancel: () => void;
  error: string | null;
  loading: boolean;
}) {
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim()) return;
    onSave({
      titleAr: titleAr.trim(),
      titleEn: titleEn.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      sortOrder: sortOrder || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">New Promo Banner</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Title (AR) *</label>
          <input type="text" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="input" dir="rtl" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title (EN)</label>
          <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
          <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input" placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
          <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="input" placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} className="input" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Adding...' : 'Add'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

function EditRow({
  item,
  onSave,
  onCancel,
  loading,
}: {
  item: PromoItem;
  onSave: (d: { titleAr?: string; titleEn?: string; imageUrl?: string; linkUrl?: string; sortOrder?: number; isActive?: boolean }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [titleAr, setTitleAr] = useState(item.titleAr);
  const [titleEn, setTitleEn] = useState(item.titleEn ?? '');
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(item.linkUrl ?? '');
  const [sortOrder, setSortOrder] = useState(item.sortOrder);
  const [isActive, setIsActive] = useState(item.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ titleAr, titleEn: titleEn || undefined, imageUrl: imageUrl || undefined, linkUrl: linkUrl || undefined, sortOrder, isActive });
  };

  return (
    <tr>
      <td colSpan={7} className="table-td bg-gray-50">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Image URL</label>
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input w-56" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title AR</label>
            <input type="text" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="input w-40" dir="rtl" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title EN</label>
            <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="input w-40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Link URL</label>
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="input w-48" />
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
            <button type="submit" disabled={loading} className="btn-primary text-sm py-1.5">
              Save
            </button>
            <button type="button" onClick={onCancel} className="btn-ghost text-sm py-1.5">
              Cancel
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
