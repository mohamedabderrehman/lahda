import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getHomeSections,
  createHomeSection,
  updateHomeSection,
  deleteHomeSection,
  getMerchantsAll,
} from '../api/client';

type MerchantLite = { id: string; storeName: string; storeSlug: string };
type HomeSectionItem = {
  id: string;
  titleAr: string;
  titleEn?: string | null;
  slug?: string | null;
  sortOrder: number;
  isActive: boolean;
  merchants?: Array<{ merchantProfile?: { id: string; storeName: string; storeSlug: string } }>;
};

export default function HomeSections() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<HomeSectionItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const sectionsQ = useQuery({ queryKey: ['home-sections'], queryFn: getHomeSections });
  const merchantsQ = useQuery({ queryKey: ['merchants-all'], queryFn: getMerchantsAll });

  const createMut = useMutation({
    mutationFn: createHomeSection,
    onSuccess: () => {
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['home-sections'] });
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateHomeSection>[1] }) => updateHomeSection(id, data),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['home-sections'] });
    },
  });
  const deleteMut = useMutation({
    mutationFn: deleteHomeSection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home-sections'] }),
  });

  if (sectionsQ.isLoading || merchantsQ.isLoading) return <div className="text-gray-500">Loading...</div>;
  if (sectionsQ.isError) return <div className="text-red-600">{String(sectionsQ.error)}</div>;
  if (merchantsQ.isError) return <div className="text-red-600">{String(merchantsQ.error)}</div>;

  const sections = (sectionsQ.data ?? []) as HomeSectionItem[];
  const merchants = (merchantsQ.data ?? []) as MerchantLite[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Home Sections</h1>
        <button type="button" className="btn-primary" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? 'Close' : 'Add Section'}
        </button>
      </div>

      {showAdd && (
        <SectionForm
          merchants={merchants}
          loading={createMut.isPending}
          error={createMut.isError ? String(createMut.error) : null}
          onSubmit={(data) => createMut.mutate(data)}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {editing && (
        <SectionForm
          merchants={merchants}
          initial={editing}
          loading={updateMut.isPending}
          error={updateMut.isError ? String(updateMut.error) : null}
          onSubmit={(data) => updateMut.mutate({ id: editing.id, data })}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="grid grid-cols-1 gap-4">
        {sections.map((sec) => (
          <div key={sec.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{sec.titleAr}</h2>
                <p className="text-xs text-gray-500">
                  slug: {sec.slug || '—'} · order: {sec.sortOrder} · {sec.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => setEditing(sec)}>Edit</button>
                <button
                  type="button"
                  className="btn-ghost text-red-600"
                  onClick={() => window.confirm('Delete this section?') && deleteMut.mutate(sec.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(sec.merchants ?? []).map((m) => (
                <span key={m.merchantProfile?.id} className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                  {m.merchantProfile?.storeName || m.merchantProfile?.storeSlug}
                </span>
              ))}
              {(sec.merchants ?? []).length === 0 && <span className="text-sm text-gray-500">No merchants assigned.</span>}
            </div>
          </div>
        ))}
        {sections.length === 0 && <div className="card p-6 text-center text-gray-500">No home sections yet.</div>}
      </div>
    </div>
  );
}

function SectionForm({
  merchants,
  initial,
  loading,
  error,
  onSubmit,
  onCancel,
}: {
  merchants: MerchantLite[];
  initial?: HomeSectionItem | null;
  loading: boolean;
  error: string | null;
  onSubmit: (data: { titleAr: string; titleEn?: string; slug?: string; sortOrder?: number; isActive?: boolean; merchantIds?: string[] }) => void;
  onCancel: () => void;
}) {
  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? '');
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => (initial?.merchants ?? []).map((m) => m.merchantProfile?.id).filter(Boolean) as string[],
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const toggleMerchant = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <form
      className="card p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!titleAr.trim()) return;
        onSubmit({
          titleAr: titleAr.trim(),
          titleEn: titleEn.trim() || undefined,
          slug: slug.trim() || undefined,
          sortOrder,
          isActive,
          merchantIds: selectedIds,
        });
      }}
    >
      <h2 className="text-lg font-semibold">{initial ? 'Edit Home Section' : 'New Home Section'}</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="input" placeholder="Title (AR)" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required />
        <input className="input" placeholder="Title (EN)" value={titleEn ?? ''} onChange={(e) => setTitleEn(e.target.value)} />
        <input className="input" placeholder="Slug (optional)" value={slug ?? ''} onChange={(e) => setSlug(e.target.value)} />
        <input className="input w-40" type="number" placeholder="Sort order" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value || 0))} />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Merchants inside this section</p>
        <div className="max-h-60 overflow-auto border border-gray-100 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {merchants.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={selectedSet.has(m.id)} onChange={() => toggleMerchant(m.id)} />
              <span>{m.storeName}</span>
              <span className="text-xs text-gray-400">({m.storeSlug})</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
