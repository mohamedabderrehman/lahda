import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createMerchant,
  getMerchants,
  setMerchantApproved,
  deleteMerchant,
  updateMerchant,
} from '../../api/client';

type MerchantItem = {
  id: string;
  storeName: string;
  storeSlug: string;
  isApproved: boolean;
  isOpen: boolean;
  deliveryFee?: number | string | null;
  estimatedDeliveryMin?: number | null;
  estimatedDeliveryMax?: number | null;
  discountLabel?: string | null;
  ratingAvg?: number | null;
  hasOffers?: boolean;
  taxPercent?: number;
  user?: { email: string; fullName: string; phone?: string };
};

export default function MerchantsTab() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<MerchantItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-merchants', page],
    queryFn: () => getMerchants(page, 15),
  });

  const approve = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => setMerchantApproved(id, approved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-merchants'] }),
  });

  const create = useMutation({
    mutationFn: createMerchant,
    onSuccess: () => {
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateMerchant>[1] }) => updateMerchant(id, payload),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });

  const deleteMerchantMutation = useMutation({
    mutationFn: (id: string) => deleteMerchant(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-merchants'] }),
  });

  const items = (data?.items ?? []) as MerchantItem[];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 15);

  // Filter
  const filteredItems = searchTerm
    ? items.filter(m => 
        m.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  // Stats
  const pendingApproval = items.filter(m => !m.isApproved).length;
  const currentlyOpen = items.filter(m => m.isOpen).length;

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <p className="text-sm text-emerald-800">
          <strong>المتاجر:</strong> هذه هي المتاجر والمطاعم المسجلة في التطبيق.
          المتاجر غير المعتمدة لا تظهر للعملاء. المتاجر المغلقة لا تستقبل طلبات جديدة.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{items.length}</div>
          <div className="text-sm text-blue-600">إجمالي المتاجر</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{pendingApproval}</div>
          <div className="text-sm text-amber-600">بانتظار الموافقة</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{currentlyOpen}</div>
          <div className="text-sm text-green-600">مفتوحة الآن</div>
        </div>
      </div>

      {/* Search and Add */}
      <div className="flex gap-4 justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="البحث باسم المتجر أو المالك..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          <span>+</span>
          إضافة متجر
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <MerchantCreateForm
          loading={create.isPending}
          error={create.isError ? String(create.error) : null}
          onSubmit={(payload) => create.mutate(payload)}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Edit Form */}
      {editing && (
        <MerchantEditForm
          merchant={editing}
          loading={update.isPending}
          error={update.isError ? String(update.error) : null}
          onCancel={() => setEditing(null)}
          onSubmit={(payload) => update.mutate({ id: editing.id, payload })}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="text-red-600 text-center py-8">{String(error)}</div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتجر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المالك</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">معلومات</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      لا يوجد متاجر {searchTerm && 'مطابقة للبحث'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{m.storeName}</div>
                        <div className="text-xs text-gray-500">@{m.storeSlug}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {m.user?.fullName || '—'}
                        <div className="text-xs text-gray-400">{m.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>وقت التوصيل: {m.estimatedDeliveryMin ?? '-'} - {m.estimatedDeliveryMax ?? '-'} دقيقة</div>
                        <div>التقييم: {m.ratingAvg?.toFixed(1) ?? '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            m.isApproved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {m.isApproved ? 'معتمد' : 'بانتظار الموافقة'}
                          </span>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            m.isOpen ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {m.isOpen ? 'مفتوح' : 'مغلق'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => approve.mutate({ id: m.id, approved: !m.isApproved })}
                            disabled={approve.isPending}
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-800"
                          >
                            {m.isApproved ? 'إلغاء الموافقة' : 'موافقة'}
                          </button>
                          <button
                            onClick={() => setEditing(m)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`حذف المتجر "${m.storeName}"؟`)) {
                                deleteMerchantMutation.mutate(m.id);
                              }
                            }}
                            disabled={deleteMerchantMutation.isPending}
                            className="text-sm font-medium text-red-600 hover:text-red-800"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">الصفحة {page} من {pages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  السابق
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MerchantCreateForm({
  loading,
  error,
  onSubmit,
  onCancel,
}: {
  loading: boolean;
  error: string | null;
  onSubmit: (payload: Parameters<typeof createMerchant>[0]) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    storeName: '',
    storeSlug: '',
    estimatedDeliveryMin: 20,
    estimatedDeliveryMax: 40,
    isApproved: true,
    isOpen: true,
  });

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">إضافة متجر جديد</h3>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم المالك *</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="الاسم الكامل"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            type="email"
            placeholder="example@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور *</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            type="password"
            placeholder="******"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر *</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="مثال: بيتزا هت"
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الرابط (slug) *</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="pizza-hut"
            value={form.storeSlug}
            onChange={(e) => setForm({ ...form, storeSlug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            required
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isApproved}
              onChange={(e) => setForm({ ...form, isApproved: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">معتمد فوراً</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isOpen}
              onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">مفتوح</span>
          </label>
        </div>
        <div className="md:col-span-3 flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء المتجر'}
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

function MerchantEditForm({
  merchant,
  loading,
  error,
  onCancel,
  onSubmit,
}: {
  merchant: MerchantItem;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (payload: Parameters<typeof updateMerchant>[1]) => void;
}) {
  const [storeName, setStoreName] = useState(merchant.storeName);
  const [estimatedDeliveryMin, setEstimatedDeliveryMin] = useState(Number(merchant.estimatedDeliveryMin ?? 20));
  const [estimatedDeliveryMax, setEstimatedDeliveryMax] = useState(Number(merchant.estimatedDeliveryMax ?? 35));
  const [discountLabel, setDiscountLabel] = useState(merchant.discountLabel ?? '');
  const [taxPercent, setTaxPercent] = useState(Number(merchant.taxPercent ?? 5));
  const [hasOffers, setHasOffers] = useState(Boolean(merchant.hasOffers));
  const [isOpen, setIsOpen] = useState(Boolean(merchant.isOpen));
  const [isApproved, setIsApproved] = useState(Boolean(merchant.isApproved));

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">تعديل متجر: {merchant.storeName}</h3>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            storeName,
            estimatedDeliveryMin,
            estimatedDeliveryMax,
            discountLabel: discountLabel || undefined,
            taxPercent: taxPercent >= 0 && taxPercent <= 100 ? taxPercent : undefined,
            hasOffers,
            isOpen,
            isApproved,
          });
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وقت التوصيل (دقيقة)</label>
          <div className="flex gap-2">
            <input
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              type="number"
              placeholder="من"
              value={estimatedDeliveryMin}
              onChange={(e) => setEstimatedDeliveryMin(Number(e.target.value))}
            />
            <input
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              type="number"
              placeholder="إلى"
              value={estimatedDeliveryMax}
              onChange={(e) => setEstimatedDeliveryMax(Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وسم الخصم</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            value={discountLabel}
            onChange={(e) => setDiscountLabel(e.target.value)}
            placeholder="مثال: خصم 20%"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الضريبة عند التسوية (%)</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            type="number"
            min={0}
            max={100}
            value={taxPercent}
            onChange={(e) => setTaxPercent(Number(e.target.value))}
            placeholder="5"
          />
          <p className="text-xs text-gray-500 mt-1">
            تُخصم هذه النسبة من مستحقات المتجر عند التسوية (عند دفعكم له). الرصيد يبقى كاملاً؛ الصافي الذي يصل للمتجر = الرصيد ناقص الضريبة. الافتراضي 5%.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasOffers}
              onChange={(e) => setHasOffers(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">يوجد عروض</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isOpen}
              onChange={(e) => setIsOpen(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">مفتوح</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isApproved}
              onChange={(e) => setIsApproved(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">معتمد</span>
          </label>
        </div>
        <div className="md:col-span-3 flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
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
