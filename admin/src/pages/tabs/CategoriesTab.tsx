import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/client';

type CategoryItem = {
  id: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  iconUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export default function CategoriesTab() {
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

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <h3 className="font-semibold text-cyan-900 mb-1">📁 التصنيفات:</h3>
        <p className="text-sm text-cyan-800">
          التصنيفات تظهر للعملاء في التطبيق لمساعدتهم على اكتشاف المتاجر حسب نوعها (مطاعم، مقاهي، سوبرماركت...).
          كل متجر يمكن أن ينتمي لعدة تصنيفات.
        </p>
      </div>

      {/* Add Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">إجمالي التصنيفات: <span className="font-semibold">{items.length}</span></p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 flex items-center gap-2"
        >
          <span>+</span>
          إضافة تصنيف جديد
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <AddForm
          onSave={(d) => create.mutate(d)}
          onCancel={() => setShowAdd(false)}
          error={create.isError ? String(create.error) : null}
          loading={create.isPending}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="text-red-600 text-center py-8">{String(error)}</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأيقونة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم (عربي)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم (إنجليزي)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرابط</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الترتيب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
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
                    <td className="px-6 py-4">
                      {c.iconUrl ? (
                        <img src={c.iconUrl} alt="" className="h-10 w-10 object-contain rounded" />
                      ) : (
                        <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                          📁
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.nameAr}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.nameEn ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">/{c.slug}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.sortOrder}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        c.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {c.isActive ? '✅ نشط' : '⛔ معطل'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditing(c)}
                          className="text-sm text-cyan-600 hover:text-cyan-800 font-medium"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('حذف هذا التصنيف؟')) {
                              remove.mutate(c.id);
                            }
                          }}
                          disabled={remove.isPending}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    لا توجد تصنيفات. أضف تصنيفاً للبدء.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddForm({
  onSave,
  onCancel,
  error,
  loading,
}: {
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

  return (
    <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">إضافة تصنيف جديد</h3>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!nameAr.trim() || !slug.trim()) return;
          onSave({
            nameAr: nameAr.trim(),
            nameEn: nameEn.trim() || undefined,
            slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
            iconUrl: iconUrl.trim() || undefined,
            sortOrder: sortOrder || 0,
          });
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (عربي) *</label>
          <input
            type="text"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            dir="rtl"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (إنجليزي)</label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الرابط (slug) *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="food, drinks, sweets..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">رابط الأيقونة</label>
          <input
            type="url"
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
          >
            {loading ? 'جاري الإضافة...' : 'إضافة'}
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

function EditRow({
  item,
  onSave,
  onCancel,
  loading,
}: {
  item: CategoryItem;
  onSave: (d: { nameAr?: string; nameEn?: string; slug?: string; iconUrl?: string; sortOrder?: number; isActive?: boolean }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [nameAr, setNameAr] = useState(item.nameAr);
  const [nameEn, setNameEn] = useState(item.nameEn ?? '');
  const [slug, setSlug] = useState(item.slug);
  const [iconUrl] = useState(item.iconUrl ?? '');
  const [sortOrder, setSortOrder] = useState(item.sortOrder);
  const [isActive, setIsActive] = useState(item.isActive);

  return (
    <tr className="bg-cyan-50">
      <td colSpan={7} className="px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ nameAr, nameEn: nameEn || undefined, slug, iconUrl: iconUrl || undefined, sortOrder, isActive });
          }}
          className="flex flex-wrap items-end gap-4"
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1">الاسم (عربي)</label>
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-40 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">الاسم (إنجليزي)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">الرابط</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">الترتيب</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`active-${item.id}`}
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-cyan-600 rounded"
            />
            <label htmlFor={`active-${item.id}`} className="text-sm text-gray-600">نشط</label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-cyan-600 text-white rounded text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
