import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPromoCodes, createPromoCode } from '../../api/client';

type PromoCodeItem = {
  id: string;
  code: string;
  description: string | null;
  percentage: number;
  maxDiscount: number | null;
  minSubtotal: number | null;
  expiresAt: string | null;
  isActive: boolean;
};

export default function PromoCodesTab() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: getPromoCodes,
  });

  const createMut = useMutation({
    mutationFn: createPromoCode,
    onSuccess: () => {
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
    },
  });

  const codes = (data ?? []) as PromoCodeItem[];

  return (
    <div className="p-6 space-y-6">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <h3 className="font-semibold text-emerald-900 mb-1">🎟️ أكواد الخصم</h3>
        <p className="text-sm text-emerald-800">
          يمكن استخدام أكواد الخصم لتشجيع الطلبات، مثل خصم نسبة من قيمة السلة لفترة زمنية محددة.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          إجمالي الأكواد: <span className="font-semibold">{codes.length}</span>
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
        >
          + إضافة كود خصم
        </button>
      </div>

      {showAdd && (
        <PromoCodeForm
          onSubmit={(d) => createMut.mutate(d)}
          onCancel={() => setShowAdd(false)}
          loading={createMut.isPending}
          error={createMut.isError ? String(createMut.error) : null}
        />
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {codes.map((c) => (
            <div
              key={c.id}
              className="border border-gray-200 rounded-xl p-4 bg-white flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-lg text-emerald-700">
                  {c.code}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    c.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c.isActive ? 'نشط' : 'معطل'}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                خصم <span className="font-semibold">{c.percentage}%</span>
                {c.maxDiscount != null && (
                  <span className="text-xs text-gray-500 ml-1">
                    (حد أقصى {c.maxDiscount.toLocaleString('ar-IQ')} د.ع)
                  </span>
                )}
              </div>
              {c.minSubtotal != null && (
                <div className="text-xs text-gray-500">
                  حد أدنى للطلب: {c.minSubtotal.toLocaleString('ar-IQ')} د.ع
                </div>
              )}
              {c.expiresAt && (
                <div className="text-xs text-gray-500">
                  ينتهي في: {new Date(c.expiresAt).toLocaleString('ar-IQ')}
                </div>
              )}
              {c.description && (
                <div className="text-xs text-gray-600 mt-1">{c.description}</div>
              )}
            </div>
          ))}
          {codes.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              لا توجد أكواد خصم بعد.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PromoCodeForm({
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  onSubmit: (data: {
    code: string;
    description?: string;
    percentage: number;
    maxDiscount?: number | null;
    minSubtotal?: number | null;
    expiresAt?: string | null;
    isActive?: boolean;
  }) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [percentage, setPercentage] = useState(10);
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('');
  const [minSubtotal, setMinSubtotal] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">إضافة كود خصم جديد</h3>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            code: code.trim().toUpperCase(),
            description: description.trim() || undefined,
            percentage,
            maxDiscount: maxDiscount === '' ? null : Number(maxDiscount),
            minSubtotal: minSubtotal === '' ? null : Number(minSubtotal),
            expiresAt: expiresAt || null,
            isActive,
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الكود *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              dir="ltr"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              النسبة المئوية *
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={percentage}
              onChange={(e) => setPercentage(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الحد الأقصى للخصم (اختياري)
            </label>
            <input
              type="number"
              min={0}
              value={maxDiscount}
              onChange={(e) =>
                setMaxDiscount(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الحد الأدنى لقيمة الطلب (اختياري)
            </label>
            <input
              type="number"
              min={0}
              value={minSubtotal}
              onChange={(e) =>
                setMinSubtotal(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ينتهي في (اختياري)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="promo-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="promo-active" className="mr-2 text-sm text-gray-700">
              نشط
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ملاحظات (اختياري)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 min-h-[60px]"
          />
        </div>
        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
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

