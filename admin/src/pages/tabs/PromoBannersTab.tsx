import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPromoBanners, createPromoBanner, updatePromoBanner, deletePromoBanner } from '../../api/client';

type BannerItem = {
  id: string;
  titleAr: string;
  titleEn: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export default function PromoBannersTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BannerItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['promo-banners'], queryFn: getPromoBanners });

  const createMut = useMutation({
    mutationFn: createPromoBanner,
    onSuccess: () => {
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['promo-banners'] });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updatePromoBanner>[1] }) =>
      updatePromoBanner(id, data),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['promo-banners'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deletePromoBanner,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promo-banners'] }),
  });

  const banners = (data ?? []) as BannerItem[];

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
        <h3 className="font-semibold text-rose-900 mb-1">🖼️ البنرات الترويجية:</h3>
        <p className="text-sm text-rose-800">
          البنرات تظهر في الصفحة الرئيسية من التطبيق كصور ترويجية. يمكن استخدامها للإعلان عن عروض خاصة، 
          متاجر جديدة، أو أي معلومات مهمة للعملاء.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">إجمالي البنرات: <span className="font-semibold">{banners.length}</span></p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700"
        >
          + إضافة بنر جديد
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <BannerForm
          onSubmit={(d) => createMut.mutate(d)}
          onCancel={() => setShowAdd(false)}
          loading={createMut.isPending}
          error={createMut.isError ? String(createMut.error) : null}
        />
      )}

      {/* Edit Form */}
      {editing && (
        <BannerForm
          initial={editing}
          onSubmit={(d) => updateMut.mutate({ id: editing.id, data: d })}
          onCancel={() => setEditing(null)}
          loading={updateMut.isPending}
          error={updateMut.isError ? String(updateMut.error) : null}
        />
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              {b.imageUrl ? (
                <img src={b.imageUrl} alt={b.titleAr} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                  لا توجد صورة
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{b.titleAr}</h3>
                {b.titleEn && <p className="text-sm text-gray-500">{b.titleEn}</p>}
                <p className="text-xs text-gray-400 mt-1">الترتيب: {b.sortOrder}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    b.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {b.isActive ? '✅ نشط' : '⛔ معطل'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(b)}
                      className="text-sm text-rose-600 hover:text-rose-800 font-medium"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('حذف هذا البنر؟')) deleteMut.mutate(b.id);
                      }}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              لا توجد بنرات. أضف بنراً للبدء.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BannerForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  initial?: BannerItem | null;
  onSubmit: (data: { titleAr: string; titleEn?: string; imageUrl?: string; linkUrl?: string; sortOrder?: number; isActive?: boolean }) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? '');
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {initial ? 'تعديل البنر' : 'إضافة بنر جديد'}
      </h3>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            titleAr: titleAr.trim(),
            titleEn: titleEn.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
            linkUrl: linkUrl.trim() || undefined,
            sortOrder,
            isActive,
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (عربي) *</label>
            <input
              type="text"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              dir="rtl"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (إنجليزي)</label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">رابط الصورة *</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="https://example.com/banner.jpg"
              required
            />
            <p className="text-xs text-gray-500 mt-1">يفضل أبعاد 1200x400 بكسل</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">رابط عند الضغط (اختياري)</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="https://... أو /store/pizza-hut"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="banner-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded"
            />
            <label htmlFor="banner-active" className="mr-2 text-sm text-gray-700">نشط</label>
          </div>
        </div>
        {imageUrl && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">معاينة:</p>
            <img src={imageUrl} alt="Preview" className="max-h-40 rounded-lg border border-gray-200" />
          </div>
        )}
        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 disabled:opacity-50"
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
