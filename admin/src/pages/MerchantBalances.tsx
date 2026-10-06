import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMerchantsWithBalances, getMerchantLedger, createMerchantPayout, type MerchantBalance, type LedgerEntry } from '../api/client';

export default function MerchantBalances() {
  const queryClient = useQueryClient();
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantBalance | null>(null);
  const [payoutModal, setPayoutModal] = useState<{ merchant: MerchantBalance; amount: string; note: string } | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['merchants-balances', page],
    queryFn: () => getMerchantsWithBalances(page, 15),
  });

  const payoutMutation = useMutation({
    mutationFn: ({ merchantId, amount, note }: { merchantId: string; amount: number; note: string }) =>
      createMerchantPayout(merchantId, amount, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants-balances'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-ledger'] });
      setPayoutModal(null);
      alert('تم إنشاء عملية الدفع بنجاح');
    },
  });

  if (isLoading) {
    return <div className="text-gray-500">جاري التحميل...</div>;
  }

  const merchants = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">أرصدة المتاجر</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(() => {
          const totalBalance = merchants.reduce((sum, m) => sum + m.balance, 0);
          const totalCredits = merchants.reduce((sum, m) => sum + m.totalCredits, 0);
          const totalDebits = merchants.reduce((sum, m) => sum + m.totalDebits, 0);
          return (
            <>
              <div className="card p-4 bg-blue-50">
                <div className="text-sm text-blue-600">إجمالي الأرصدة</div>
                <div className="text-2xl font-bold text-blue-800">{totalBalance.toLocaleString()} د.ع</div>
              </div>
              <div className="card p-4 bg-green-50">
                <div className="text-sm text-green-600">إجمالي الديون (Credits)</div>
                <div className="text-2xl font-bold text-green-800">{totalCredits.toLocaleString()} د.ع</div>
              </div>
              <div className="card p-4 bg-amber-50">
                <div className="text-sm text-amber-600">إجمالي المدفوعات (Debits)</div>
                <div className="text-2xl font-bold text-amber-800">{totalDebits.toLocaleString()} د.ع</div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Merchants Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th text-right">المتجر</th>
              <th className="table-th text-right">المالك</th>
              <th className="table-th text-right">الرصيد</th>
              <th className="table-th text-right">ضريبة %</th>
              <th className="table-th text-right">الصافي للمتجر</th>
              <th className="table-th text-right">ديون (Credits)</th>
              <th className="table-th text-right">مدفوعات (Debits)</th>
              <th className="table-th text-right">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {merchants.map((merchant) => (
              <tr key={merchant.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{merchant.storeName}</td>
                <td className="table-td text-gray-500">
                  {merchant.user?.fullName}
                  <div className="text-xs">{merchant.user?.phone}</div>
                </td>
                <td className={`table-td font-bold ${merchant.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {merchant.balance.toLocaleString()} د.ع
                </td>
                <td className="table-td text-gray-600">
                  {merchant.taxPercent ?? 5}%
                </td>
                <td className="table-td font-medium text-blue-700">
                  {(merchant.netAfterTax ?? merchant.balance).toLocaleString()} د.ع
                </td>
                <td className="table-td text-green-600">
                  {merchant.totalCredits.toLocaleString()} د.ع
                </td>
                <td className="table-td text-amber-600">
                  {merchant.totalDebits.toLocaleString()} د.ع
                </td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMerchant(merchant)}
                      className="text-primary-600 text-sm hover:underline"
                    >
                      التفاصيل
                    </button>
                    {merchant.balance > 0 && (
                      <button
                        type="button"
                        onClick={() => setPayoutModal({ merchant, amount: String(merchant.balance), note: '' })}
                        className="text-green-600 text-sm hover:underline"
                      >
                        تسوية
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {merchants.length === 0 && (
              <tr>
                <td colSpan={8} className="table-td text-center text-gray-500 py-8">
                  لا توجد متاجر
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
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="btn-ghost"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="btn-ghost"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Merchant Details Modal */}
      {selectedMerchant && (
        <MerchantDetailsModal
          merchant={selectedMerchant}
          onClose={() => setSelectedMerchant(null)}
          onPayout={() => setPayoutModal({ merchant: selectedMerchant, amount: String(selectedMerchant.balance), note: '' })}
        />
      )}

      {/* Payout Modal */}
      {payoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">تسوية رصيد المتجر</h2>
              <div>
                <div className="text-sm text-gray-500">المتجر</div>
                <div className="font-medium">{payoutModal.merchant.storeName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">الرصيد المتاح</div>
                <div className="font-bold text-green-600">{payoutModal.merchant.balance.toLocaleString()} د.ع</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">ضريبة ({payoutModal.merchant.taxPercent ?? 5}%)</div>
                <div className="text-right font-medium">{(payoutModal.merchant.taxAmount ?? 0).toLocaleString()} د.ع</div>
                <div className="text-gray-600">الصافي للمتجر بعد الضريبة</div>
                <div className="text-right font-bold text-blue-700">{(payoutModal.merchant.netAfterTax ?? payoutModal.merchant.balance).toLocaleString()} د.ع</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (د.ع)</label>
                <input
                  type="number"
                  value={payoutModal.amount}
                  onChange={(e) => setPayoutModal({ ...payoutModal, amount: e.target.value })}
                  className="input"
                  max={payoutModal.merchant.balance}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظة</label>
                <input
                  type="text"
                  value={payoutModal.note}
                  onChange={(e) => setPayoutModal({ ...payoutModal, note: e.target.value })}
                  className="input"
                  placeholder="رقم الحوالة، تاريخ الدفع، إلخ"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setPayoutModal(null)}
                  className="btn-ghost flex-1"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const amount = Number(payoutModal.amount);
                    if (amount <= 0 || amount > payoutModal.merchant.balance) {
                      alert('المبلغ غير صالح');
                      return;
                    }
                    payoutMutation.mutate({
                      merchantId: payoutModal.merchant.id,
                      amount,
                      note: payoutModal.note,
                    });
                  }}
                  disabled={payoutMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {payoutMutation.isPending ? 'جاري التنفيذ...' : 'تأكيد التسوية'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MerchantDetailsModal({ merchant, onClose, onPayout }: { merchant: MerchantBalance; onClose: () => void; onPayout: () => void }) {
  const [page, setPage] = useState(1);
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['merchant-ledger', merchant.id, page],
    queryFn: () => getMerchantLedger(merchant.id, page, 20),
  });

  const ledger = ledgerData?.items || [];
  const total = ledgerData?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{merchant.storeName}</h2>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <div className="text-sm text-green-600">الرصيد</div>
              <div className="text-xl font-bold text-green-800">{merchant.balance.toLocaleString()} د.ع</div>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg text-center">
              <div className="text-sm text-gray-600">ضريبة ({merchant.taxPercent ?? 5}%)</div>
              <div className="text-lg font-bold text-gray-800">{(merchant.taxAmount ?? 0).toLocaleString()} د.ع</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="text-sm text-blue-600">الصافي للمتجر</div>
              <div className="text-xl font-bold text-blue-800">{(merchant.netAfterTax ?? merchant.balance).toLocaleString()} د.ع</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-center">
              <div className="text-sm text-amber-600">المدفوعات (Debits)</div>
              <div className="text-xl font-bold text-amber-800">{merchant.totalDebits.toLocaleString()} د.ع</div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">سجل الحركات</h3>
            {merchant.balance > 0 && (
              <button type="button" onClick={onPayout} className="btn-primary text-sm">
                إجراء تسوية
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center text-gray-500 py-8">جاري التحميل...</div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th text-right">التاريخ</th>
                    <th className="table-th text-right">النوع</th>
                    <th className="table-th text-right">المبلغ</th>
                    <th className="table-th text-right">ملاحظة / طلب</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ledger.map((entry: LedgerEntry) => (
                    <tr key={entry.id}>
                      <td className="table-td text-sm">
                        {new Date(entry.createdAt).toLocaleDateString('ar-IQ')}
                      </td>
                      <td className="table-td">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          entry.type === 'credit' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                        }`}>
                          {entry.type === 'credit' ? 'دين (Credit)' : 'دفع (Debit)'}
                        </span>
                      </td>
                      <td className={`table-td font-bold ${entry.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'credit' ? '+' : '-'}{Number(entry.amount).toLocaleString()} د.ع
                      </td>
                      <td className="table-td text-sm text-gray-500">
                        {entry.note || (entry.order ? `طلب #${entry.order.orderNumber}` : '—')}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="table-td text-center text-gray-500 py-8">
                        لا توجد حركات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm text-gray-500">صفحة {page} من {totalPages}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      className="btn-ghost text-sm"
                    >
                      السابق
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="btn-ghost text-sm"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
