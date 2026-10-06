import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRemittances, confirmRemittance, getRemittanceDetails, type RemittanceItem, type RemittanceStatus } from '../api/client';

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

export default function Remittances() {
  const queryClient = useQueryClient();
  const [selectedRemittance, setSelectedRemittance] = useState<RemittanceItem | null>(null);
  const [filters, setFilters] = useState<{
    date?: string;
    status?: RemittanceStatus;
    page: number;
  }>({ page: 1 });

  const { data: remittancesData, isLoading } = useQuery({
    queryKey: ['remittances', filters],
    queryFn: () => getRemittances(filters),
  });

  // Fetch full remittance details including orders when one is selected
  const { data: remittanceDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['remittance-details', selectedRemittance?.id],
    queryFn: () => selectedRemittance ? getRemittanceDetails(selectedRemittance.id) : null,
    enabled: !!selectedRemittance,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmRemittance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remittances'] });
      if (selectedRemittance) {
        setSelectedRemittance(null);
      }
    },
  });

  const statusLabels: Record<RemittanceStatus, string> = {
    draft: 'مسودة',
    submitted: 'مُرسل',
    confirmed: 'مؤكد',
  };

  const statusColors: Record<RemittanceStatus, string> = {
    draft: 'text-gray-600 bg-gray-100',
    submitted: 'text-blue-600 bg-blue-100',
    confirmed: 'text-green-600 bg-green-100',
  };

  if (isLoading) {
    return <div className="text-gray-500">جاري التحميل...</div>;
  }

  const remittances = remittancesData?.items || [];
  const total = remittancesData?.total || 0;
  const page = remittancesData?.page || 1;
  const limit = remittancesData?.limit || 20;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">سندات التسوية (COD)</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-600">التاريخ:</span>
          <input
            type="date"
            value={filters.date || ''}
            onChange={(e) => setFilters({ ...filters, date: e.target.value || undefined, page: 1 })}
            className="input"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-600">الحالة:</span>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: (e.target.value as RemittanceStatus) || undefined, page: 1 })}
            className="input"
          >
            <option value="">الكل</option>
            <option value="submitted">مُرسل</option>
            <option value="confirmed">مؤكد</option>
          </select>
        </label>
        {(filters.date || filters.status) && (
          <button
            type="button"
            onClick={() => setFilters({ page: 1 })}
            className="btn-ghost text-sm"
          >
            إعادة ضبط
          </button>
        )}
      </div>

      {/* Remittances Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th text-right">التاريخ</th>
              <th className="table-th text-right">السائق</th>
              <th className="table-th text-right">عدد الطلبات</th>
              <th className="table-th text-right">مستحق للإدارة</th>
              <th className="table-th text-right">الحالة</th>
              <th className="table-th text-right">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {remittances.map((remittance) => (
              <tr key={remittance.id} className="hover:bg-gray-50">
                <td className="table-td">{remittance.date}</td>
                <td className="table-td">
                  {remittance.driver?.fullName || '—'}
                  <div className="text-xs text-gray-500">{remittance.driver?.phone}</div>
                </td>
                <td className="table-td">{remittance.ordersCount}</td>
                <td className="table-td font-bold text-amber-600">
                  {remittance.amountDueToAdmin.toLocaleString()} د.ع
                </td>
                <td className="table-td">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[remittance.status]}`}>
                    {statusLabels[remittance.status]}
                  </span>
                </td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRemittance(remittance)}
                      className="text-primary-600 text-sm hover:underline"
                    >
                      التفاصيل
                    </button>
                    {remittance.status === 'submitted' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('تأكيد استلام المبلغ من السائق؟')) {
                            confirmMutation.mutate(remittance.id);
                          }
                        }}
                        disabled={confirmMutation.isPending}
                        className="text-green-600 text-sm hover:underline"
                      >
                        {confirmMutation.isPending ? '...' : 'تأكيد الاستلام'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {remittances.length === 0 && (
              <tr>
                <td colSpan={6} className="table-td text-center text-gray-500 py-8">
                  لا توجد سندات تسوية
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              صفحة {page} من {totalPages} ({total} إجمالي)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFilters({ ...filters, page: page - 1 })}
                disabled={page <= 1}
                className="btn-ghost"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, page: page + 1 })}
                disabled={page >= totalPages}
                className="btn-ghost"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Remittance Details Modal */}
      {selectedRemittance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  سند تسوية #{selectedRemittance.id.slice(0, 8)}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedRemittance(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-500">التاريخ</div>
                  <div className="font-medium">{selectedRemittance.date}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-500">السائق</div>
                  <div className="font-medium">{selectedRemittance.driver?.fullName}</div>
                  <div className="text-xs text-gray-500">{selectedRemittance.driver?.phone}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-gray-500">عدد الطلبات</div>
                  <div className="font-bold text-blue-600">{selectedRemittance.ordersCount}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-gray-500">مجموع المنتجات</div>
                  <div className="font-bold text-green-600">
                    {selectedRemittance.subtotalSum.toLocaleString()} د.ع
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-gray-500">رسوم التطبيق</div>
                  <div className="font-bold text-purple-600">
                    {selectedRemittance.appFeeSum.toLocaleString()} د.ع
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="text-gray-500">مستحق للإدارة</div>
                  <div className="font-bold text-amber-600">
                    {selectedRemittance.amountDueToAdmin.toLocaleString()} د.ع
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">الطلبات المدرجة في السند</h3>
                {isDetailsLoading ? (
                  <div className="text-center text-gray-500 py-4">جاري تحميل التفاصيل...</div>
                ) : remittanceDetails?.orders && remittanceDetails.orders.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-right text-gray-600 font-medium">رقم الطلب</th>
                          <th className="px-3 py-2 text-right text-gray-600 font-medium">المنتجات</th>
                          <th className="px-3 py-2 text-right text-gray-600 font-medium">التوصيل</th>
                          <th className="px-3 py-2 text-right text-gray-600 font-medium">التطبيق</th>
                          <th className="px-3 py-2 text-right text-gray-600 font-medium">الإجمالي</th>
                          <th className="px-3 py-2 text-right text-gray-600 font-medium">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(remittanceDetails.orders as RemittanceOrderDetail[]).map((ro) => (
                          <tr key={ro.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">#{ro.order.orderNumber}</td>
                            <td className="px-3 py-2">{ro.order.subtotal.toLocaleString()} د.ع</td>
                            <td className="px-3 py-2">{ro.order.deliveryFee.toLocaleString()} د.ع</td>
                            <td className="px-3 py-2">{ro.order.appFee.toLocaleString()} د.ع</td>
                            <td className="px-3 py-2 font-bold">{ro.order.total.toLocaleString()} د.ع</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                ro.order.codStatus === 'remitted_confirmed' ? 'text-green-700 bg-green-100' :
                                ro.order.codStatus === 'in_remittance' ? 'text-blue-700 bg-blue-100' :
                                'text-amber-700 bg-amber-100'
                              }`}>
                                {ro.order.codStatus === 'remitted_confirmed' ? 'تم التأكيد' :
                                 ro.order.codStatus === 'in_remittance' ? 'ضمن السند' :
                                 'مستحق'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">لا توجد طلبات</div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedRemittance.status]}`}>
                  {statusLabels[selectedRemittance.status]}
                </span>
                {selectedRemittance.status === 'submitted' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('تأكيد استلام المبلغ من السائق؟')) {
                        confirmMutation.mutate(selectedRemittance.id);
                      }
                    }}
                    disabled={confirmMutation.isPending}
                    className="btn-primary"
                  >
                    {confirmMutation.isPending ? 'جاري التأكيد...' : 'تأكيد استلام المبلغ'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
