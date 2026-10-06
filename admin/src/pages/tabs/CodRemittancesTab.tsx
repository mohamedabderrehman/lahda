import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRemittances, confirmRemittance, getRemittanceDetails, getSettlementReceipts, type RemittanceItem, type RemittanceStatus, type SettlementReceipt } from '../../api/client';
import ReceiptModal from '../../components/ReceiptModal';

type RemittanceOrderDetail = {
  id: string;
  order: {
    id: string;
    orderNumber: string;
    subtotal: number;
    appFee: number;
    deliveryFee: number;
    total: number;
    codStatus: string;
  };
};

export default function CodRemittancesTab() {
  const queryClient = useQueryClient();
  const [selectedRemittance, setSelectedRemittance] = useState<RemittanceItem | null>(null);
  const [viewReceipt, setViewReceipt] = useState<SettlementReceipt | null>(null);
  const [filters, setFilters] = useState<{
    date?: string;
    status?: RemittanceStatus;
    page: number;
  }>({ page: 1 });

  const { data: remittancesData, isLoading } = useQuery({
    queryKey: ['remittances', filters],
    queryFn: () => getRemittances(filters),
  });

  const { data: remittanceDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['remittance-details', selectedRemittance?.id],
    queryFn: () => selectedRemittance ? getRemittanceDetails(selectedRemittance.id) : null,
    enabled: !!selectedRemittance,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmRemittance(id),
    onSuccess: (data: RemittanceItem & { receipt?: SettlementReceipt }) => {
      queryClient.invalidateQueries({ queryKey: ['remittances'] });
      setSelectedRemittance(null);
      if (data?.receipt) {
        setViewReceipt(data.receipt);
      }
    },
  });

  const handleShowReceipt = async (remittanceId: string) => {
    try {
      const res = await getSettlementReceipts({ partyType: 'driver', page: 1, limit: 100 });
      const found = res.items.find(r => r.remittanceId === remittanceId);
      if (found) setViewReceipt(found);
      else alert('لم يتم العثور على الوصل');
    } catch { alert('خطأ في تحميل الوصل'); }
  };

  const statusLabels: Record<RemittanceStatus, string> = {
    draft: 'مسودة',
    submitted: 'مُرسل بانتظار التأكيد',
    confirmed: '✅ مؤكد',
  };

  const statusColors: Record<RemittanceStatus, string> = {
    draft: 'text-gray-600 bg-gray-100',
    submitted: 'text-amber-600 bg-amber-100',
    confirmed: 'text-green-600 bg-green-100',
  };

  const remittances = remittancesData?.items || [];
  const total = remittancesData?.total || 0;
  const page = remittancesData?.page || 1;
  const limit = remittancesData?.limit || 20;
  const totalPages = Math.ceil(total / limit);

  // Stats
  const pendingCount = remittances.filter(r => r.status === 'submitted').length;
  const confirmedCount = remittances.filter(r => r.status === 'confirmed').length;
  const totalPendingAmount = remittances
    .filter(r => r.status === 'submitted')
    .reduce((sum, r) => sum + r.amountDueToAdmin, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <strong>💵 التحصيل النقدي (COD):</strong> عندما يدفع العميل نقداً عند الاستلام، 
          يجمع السائق هذا المبلغ ويسلمه للإدارة. هنا تستطيع رؤية السندات المرسلة من السائقين 
          وتأكيد استلام المبالغ منهم.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-200">
          <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
          <div className="text-sm text-amber-600">بانتظار التأكيد</div>
          <div className="text-xs text-amber-500 mt-1">
            {totalPendingAmount.toLocaleString()} د.ع
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
          <div className="text-2xl font-bold text-green-700">{confirmedCount}</div>
          <div className="text-sm text-green-600">تم تأكيدها</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">{total}</div>
          <div className="text-sm text-blue-600">إجمالي السندات</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
          <input
            type="date"
            value={filters.date || ''}
            onChange={(e) => setFilters({ ...filters, date: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: (e.target.value as RemittanceStatus) || undefined, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
          >
            <option value="">الكل</option>
            <option value="submitted">🟠 بانتظار التأكيد</option>
            <option value="confirmed">🟢 مؤكد</option>
          </select>
        </div>
        {(filters.date || filters.status) && (
          <button
            onClick={() => setFilters({ page: 1 })}
            className="self-end px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
          >
            إعادة ضبط الفلاتر
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السائق</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد الطلبات</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ المستحق للإدارة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {remittances.map((remittance) => (
                  <tr key={remittance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{remittance.date}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{remittance.driver?.fullName || '—'}</div>
                      <div className="text-xs text-gray-500">{remittance.driver?.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{remittance.ordersCount}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-amber-600">
                        {remittance.amountDueToAdmin.toLocaleString()} د.ع
                      </div>
                      <div className="text-xs text-gray-500">
                        منتجات: {remittance.subtotalSum.toLocaleString()} | 
                        رسوم: {remittance.appFeeSum.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusColors[remittance.status]}`}>
                        {statusLabels[remittance.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedRemittance(remittance)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          التفاصيل
                        </button>
                        {remittance.status === 'submitted' && (
                          <button
                            onClick={() => {
                              if (confirm('تأكيد استلام المبلغ من السائق؟')) {
                                confirmMutation.mutate(remittance.id);
                              }
                            }}
                            disabled={confirmMutation.isPending}
                            className="text-sm text-green-600 hover:text-green-800 font-medium"
                          >
                            ✅ تأكيد الاستلام
                          </button>
                        )}
                        {remittance.status === 'confirmed' && (
                          <button
                            onClick={() => handleShowReceipt(remittance.id)}
                            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                          >
                            🧾 الوصل
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {remittances.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      لا توجد سندات تسوية
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">صفحة {page} من {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: page - 1 })}
                  disabled={page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  السابق
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: page + 1 })}
                  disabled={page >= totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Receipt Modal */}
      {viewReceipt && <ReceiptModal receipt={viewReceipt} onClose={() => setViewReceipt(null)} />}

      {/* Details Modal */}
      {selectedRemittance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">سند تسوية #{selectedRemittance.id.slice(0, 8)}</h2>
                  <p className="text-sm text-gray-500">{selectedRemittance.date}</p>
                </div>
                <button onClick={() => setSelectedRemittance(null)} className="text-gray-500 hover:text-gray-700 text-2xl">
                  ✕
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-sm text-blue-600">عدد الطلبات</div>
                  <div className="text-xl font-bold text-blue-800">{selectedRemittance.ordersCount}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-sm text-green-600">مجموع المنتجات</div>
                  <div className="text-xl font-bold text-green-800">
                    {selectedRemittance.subtotalSum.toLocaleString()} د.ع
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-sm text-purple-600">رسوم التطبيق</div>
                  <div className="text-xl font-bold text-purple-800">
                    {selectedRemittance.appFeeSum.toLocaleString()} د.ع
                  </div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-sm text-amber-600">مستحق للإدارة</div>
                  <div className="text-xl font-bold text-amber-800">
                    {selectedRemittance.amountDueToAdmin.toLocaleString()} د.ع
                  </div>
                </div>
              </div>

              {/* Driver Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">معلومات السائق</h3>
                <p className="text-sm text-gray-600">
                  <strong>الاسم:</strong> {selectedRemittance.driver?.fullName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>الهاتف:</strong> {selectedRemittance.driver?.phone || '—'}
                </p>
              </div>

              {/* Orders List */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">الطلبات المدرجة في السند</h3>
                {isDetailsLoading ? (
                  <div className="text-center text-gray-500 py-4">جاري تحميل التفاصيل...</div>
                ) : remittanceDetails?.orders && remittanceDetails.orders.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-right text-gray-600 font-medium">رقم الطلب</th>
                          <th className="px-3 py-2 text-right text-gray-600 font-medium">المنتجات</th>
                          <th className="px-3 py-2 text-right text-gray-600 font-medium">الرسوم</th>
                          <th className="px-3 py-2 text-right text-gray-600 font-medium">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(remittanceDetails.orders as RemittanceOrderDetail[]).map((ro) => (
                          <tr key={ro.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">#{ro.order.orderNumber}</td>
                            <td className="px-3 py-2">{ro.order.subtotal.toLocaleString()} د.ع</td>
                            <td className="px-3 py-2">{ro.order.appFee.toLocaleString()} د.ع</td>
                            <td className="px-3 py-2 font-bold">{ro.order.total.toLocaleString()} د.ع</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">لا توجد طلبات</div>
                )}
              </div>

              {/* Actions */}
              {selectedRemittance.status === 'submitted' && (
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      if (confirm('تأكيد استلام المبلغ من السائق؟')) {
                        confirmMutation.mutate(selectedRemittance.id);
                      }
                    }}
                    disabled={confirmMutation.isPending}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {confirmMutation.isPending ? 'جاري التأكيد...' : '✅ تأكيد استلام المبلغ'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
