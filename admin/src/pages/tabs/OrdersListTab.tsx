import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrders, getExportOrdersCsvUrl } from '../../api/client';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  accepted_by_merchant: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ready_for_pickup: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  picked_up: 'bg-violet-100 text-violet-800 border-violet-200',
  on_the_way: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

const statusLabels: Record<string, string> = {
  pending: '⏳ بانتظار الموافقة',
  accepted_by_merchant: '✅ مقبول من المتجر',
  preparing: '👨‍🍳 قيد التحضير',
  ready_for_pickup: '📦 جاهز للاستلام',
  picked_up: '🛍️ تم الاستلام',
  on_the_way: '🚗 في الطريق',
  delivered: '✨ تم التوصيل',
  cancelled: '❌ ملغي',
};

export default function OrdersListTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-orders', page, status],
    queryFn: () => getOrders(page, 15, status || undefined),
  });

  const items = (data?.items ?? []) as Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    subtotal: number;
    deliveryFee: number;
    appFee: number;
    createdAt: string;
    customer?: { fullName: string; email: string; phone?: string };
    merchantProfile?: { storeName: string };
    driver?: { fullName: string } | null;
  }>;

  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 15);

  // Filter by search
  const filteredItems = searchTerm
    ? items.filter(o => 
        o.orderNumber.includes(searchTerm) ||
        o.customer?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.merchantProfile?.storeName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  const handleExport = () => {
    const url = getExportOrdersCsvUrl({ status: status || undefined });
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>📦 الطلبات:</strong> هنا يمكنك رؤية جميع الطلبات في النظام. 
          استخدم الفلاتر للبحث بالحالة. اضغط على تصدير CSV للحصول على ملف Excel.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
          <input
            type="text"
            placeholder="🔍 رقم الطلب، اسم العميل، المتجر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">جميع الحالات</option>
            <option value="pending">⏳ بانتظار الموافقة</option>
            <option value="accepted_by_merchant">✅ مقبول من المتجر</option>
            <option value="preparing">👨‍🍳 قيد التحضير</option>
            <option value="ready_for_pickup">📦 جاهز للاستلام</option>
            <option value="picked_up">🛍️ تم الاستلام</option>
            <option value="on_the_way">🚗 في الطريق</option>
            <option value="delivered">✨ تم التوصيل</option>
            <option value="cancelled">❌ ملغي</option>
          </select>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2"
        >
          <span>📥</span>
          تصدير CSV
        </button>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        إجمالي النتائج: <span className="font-semibold text-gray-900">{filteredItems.length}</span> طلب
      </div>

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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الطلب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العميل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتجر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السائق</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      لا يوجد طلبات {searchTerm && 'مطابقة للبحث'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">#{o.orderNumber}</div>
                        <div className="text-xs text-gray-400">{o.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{o.customer?.fullName || '—'}</div>
                        <div className="text-xs text-gray-500">{o.customer?.phone || o.customer?.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{o.merchantProfile?.storeName || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{o.driver?.fullName || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${statusColors[o.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{Number(o.total).toLocaleString()} د.ع</div>
                        <div className="text-xs text-gray-500">
                          منتجات: {Number(o.subtotal).toLocaleString()} | 
                          توصيل: {Number(o.deliveryFee).toLocaleString()} | 
                          رسوم: {Number(o.appFee).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(o.createdAt).toLocaleDateString('ar-IQ')}
                        <div className="text-xs text-gray-400">
                          {new Date(o.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
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
