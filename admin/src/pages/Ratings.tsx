import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRatings } from '../api/client';

const starDisplay = (stars: number) => '⭐'.repeat(stars);

export default function Ratings() {
  const [targetType, setTargetType] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-ratings', targetType, page],
    queryFn: () => getRatings(targetType || undefined, page, 20),
  });

  return (
    <div className="space-y-6">
      {/* Header with Help Text */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">التقييمات</h1>
        <p className="text-gray-600">
          هنا يمكنك رؤية جميع التقييمات التي قدمها العملاء. التقييمات مقسمة إلى تقييمات للمتاجر (جودة الطعام والخدمة)
          وتقييمات للسائقين (سرعة التوصيل والأداء). هذه التقييمات تساعدك على معرفة مستوى رضا العملاء.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">نوع التقييم:</label>
        <select
          value={targetType}
          onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
        >
          <option value="">الكل</option>
          <option value="store">🏪 المتاجر</option>
          <option value="driver">🚗 السائقين</option>
        </select>
      </div>

      {isLoading && <div className="text-center py-8 text-gray-500">جاري التحميل...</div>}
      {error && <div className="text-red-600 text-center py-8">{String(error)}</div>}

      {data && (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-right text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3">الطلب</th>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">التقييم</th>
                  <th className="px-4 py-3">التعليق</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{r.order?.orderNumber || r.orderId.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        r.targetType === 'store' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {r.targetType === 'store' ? '🏪 متجر' : '🚗 سائق'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{starDisplay(r.stars)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{r.comment || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(r.createdAt).toLocaleDateString('ar-IQ')}</td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      لا توجد تقييمات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">الإجمالي: {data.total}</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-30 hover:bg-gray-50"
              >
                السابق
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">الصفحة {page}</span>
              <button
                disabled={(data.items.length < 20)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-30 hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
