import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getHomeSections, createHomeSection, updateHomeSection, deleteHomeSection, getMerchantsAll } from '../../api/client';

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

export default function HomeSectionsTab() {
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
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateHomeSection>[1] }) =>
      updateHomeSection(id, data),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['home-sections'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteHomeSection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home-sections'] }),
  });

  if (sectionsQ.isLoading || merchantsQ.isLoading) return <div className="p-6 text-gray-500">جاري التحميل...</div>;
  if (sectionsQ.isError) return <div className="p-6 text-red-600">{String(sectionsQ.error)}</div>;

  const sections = (sectionsQ.data ?? []) as HomeSectionItem[];
  const merchants = (merchantsQ.data ?? []) as MerchantLite[];

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="font-semibold text-indigo-900 mb-1">🏠 أقسام الصفحة الرئيسية:</h3>
        <p className="text-sm text-indigo-800">
          الأقسام تظهر في الصفحة الرئيسية من التطبيق وتحتوي على مجموعات من المتاجر.
          مثال: "المتاجر المقترحة"، "قريب منك"، "جديد التطبيق".
          يمكن ربط كل قسم بعدة متاجر.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">إجمالي الأقسام: <span className="font-semibold">{sections.length}</span></p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          + إضافة قسم جديد
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

      <div className="space-y-4">
        {sections.map((sec) => (
          <div key={sec.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{sec.titleAr}</h2>
                <p className="text-sm text-gray-500">
                  slug: {sec.slug || '—'} · ترتيب: {sec.sortOrder} · 
                  <span className={`mr-2 px-2 py-0.5 rounded-full text-xs ${sec.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {sec.isActive ? 'نشط' : 'معطل'}
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(sec.merchants ?? []).map((m) => (
                    <span key={m.merchantProfile?.id} className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700">
                      {m.merchantProfile?.storeName || m.merchantProfile?.storeSlug}
                    </span>
                  ))}
                  {(sec.merchants ?? []).length === 0 && (
                    <span className="text-sm text-gray-400">لا يوجد متاجر مرتبطة</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(sec)}
                  className="px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 rounded-lg"
                >
                  تعديل
                </button>
                <button
                  onClick={() => {
                    if (confirm('حذف هذا القسم؟')) deleteMut.mutate(sec.id);
                  }}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 rounded-lg"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-xl">
            لا يوجد أقسام. أضف قسماً للبدء.
          </div>
        )}
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
    () => (initial?.merchants ?? []).map((m) => m.merchantProfile?.id).filter(Boolean) as string[]
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleMerchant = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {initial ? 'تعديل القسم' : 'إضافة قسم جديد'}
      </h3>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
      <form
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
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (عربي) *</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="مثال: المتاجر المقترحة"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              required
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (إنجليزي)</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Recommended Stores"
              value={titleEn ?? ''}
              onChange={(e) => setTitleEn(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الرابط (slug)</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="recommended"
              value={slug ?? ''}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value || 0))}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-gray-700">نشط</span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">المتاجر داخل هذا القسم</p>
          <div className="max-h-60 overflow-auto border border-gray-200 rounded-lg p-3 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {merchants.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(m.id)}
                    onChange={() => toggleMerchant(m.id)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>{m.storeName}</span>
                  <span className="text-xs text-gray-400">({m.storeSlug})</span>
                </label>
              ))}
            </div>
            {merchants.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">لا يوجد متاجر متاحة</p>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            تم اختيار {selectedIds.length} متجر
          </p>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
