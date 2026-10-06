import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMerchantsWithBalances, getMerchantLedger, createMerchantPayout, getSettlementReceipts, type MerchantBalance, type LedgerEntry, type SettlementReceipt } from '../../api/client';
import ReceiptModal from '../../components/ReceiptModal';

export default function MerchantAccountsTab() {
  const queryClient = useQueryClient();
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantBalance | null>(null);
  const [payoutModal, setPayoutModal] = useState<{ merchant: MerchantBalance; amount: string; note: string } | null>(null);
  const [viewReceipt, setViewReceipt] = useState<SettlementReceipt | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['merchants-balances', page],
    queryFn: () => getMerchantsWithBalances(page, 15),
  });

  const payoutMutation = useMutation({
    mutationFn: ({ merchantId, amount, note }: { merchantId: string; amount: number; note: string }) =>
      createMerchantPayout(merchantId, amount, note),
    onSuccess: (data: { entry: LedgerEntry; newBalance: number; receipt?: SettlementReceipt }) => {
      queryClient.invalidateQueries({ queryKey: ['merchants-balances'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-ledger'] });
      setPayoutModal(null);
      if (data?.receipt) {
        setViewReceipt(data.receipt);
      } else {
        alert('✅ تم إنشاء عملية التسوية بنجاح');
      }
    },
  });

  const handleShowMerchantReceipts = async (merchantId: string) => {
    try {
      const res = await getSettlementReceipts({ partyType: 'merchant', partyId: merchantId, page: 1, limit: 50 });
      if (res.items.length > 0) {
        setViewReceipt(res.items[0]);
      } else {
        alert('لا توجد وصولات لهذا المتجر');
      }
    } catch { alert('خطأ في تحميل الوصولات'); }
  };

  const merchants = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15);

  // Filter
  const filteredMerchants = searchTerm
    ? merchants.filter(m => 
        m.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : merchants;

  // Stats
  const totalBalance = merchants.reduce((sum, m) => sum + m.balance, 0);
  const totalCredits = merchants.reduce((sum, m) => sum + m.totalCredits, 0);
  // Stats calculated
  const totalDebits = merchants.reduce((sum, m) => sum + m.totalDebits, 0);
  void totalDebits;
  const merchantsWithBalance = merchants.filter(m => m.balance > 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-emerald-900">🏪 حسابات المتاجر</h3>
        <p className="text-sm text-emerald-800">
          يتم إضافة رصيد للمتجر عند كل طلب منفذ (Credit)، ويتم خصم الرصيد عند إجراء تسوية (Debit).
          استخدم زر "تسوية" لإنشاء دفعة للمتجر وخصم المبلغ من رصيده.
        </p>
        <p className="text-sm text-emerald-800 border-t border-emerald-200 pt-2 mt-2">
          <strong>الضريبة:</strong> لكل متجر نسبة ضريبة (افتراضي ٥٪). الرصيد المعروض = إجمالي المستحقات.
          عند التسوية تُخصم الضريبة؛ <strong>الصافي للمتجر</strong> = الرصيد ناقص الضريبة (هذا المبلغ هو الذي يصل للمتجر فعلياً).
          يمكن تغيير نسبة الضريبة من: المستخدمين ← المتاجر ← تعديل المتجر.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{merchants.length}</div>
          <div className="text-sm text-blue-600">إجمالي المتاجر</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">{merchantsWithBalance}</div>
          <div className="text-sm text-emerald-600">لهم رصيد مستحق</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{totalBalance.toLocaleString()}</div>
          <div className="text-sm text-amber-600">إجمالي الأرصدة (د.ع)</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">{totalCredits.toLocaleString()}</div>
          <div className="text-sm text-purple-600">إجمالي المبيعات (د.ع)</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="🔍 البحث باسم المتجر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتجر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المالك</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرصيد الحالي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase" title="نسبة الضريبة عند التسوية">ضريبة %</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase" title="المبلغ الذي يصل للمتجر بعد خصم الضريبة">الصافي للمتجر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ديون (Credits)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مدفوعات (Debits)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMerchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{merchant.storeName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {merchant.user?.fullName}
                      <div className="text-xs text-gray-400">{merchant.user?.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${merchant.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {merchant.balance.toLocaleString()} د.ع
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {merchant.taxPercent ?? 5}%
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-700">
                      {(merchant.netAfterTax ?? merchant.balance).toLocaleString()} د.ع
                    </td>
                    <td className="px-6 py-4 text-sm text-emerald-600">
                      {merchant.totalCredits.toLocaleString()} د.ع
                    </td>
                    <td className="px-6 py-4 text-sm text-amber-600">
                      {merchant.totalDebits.toLocaleString()} د.ع
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedMerchant(merchant)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          التفاصيل
                        </button>
                        {merchant.balance > 0 && (
                          <button
                            onClick={() => setPayoutModal({ merchant, amount: String(merchant.balance), note: '' })}
                            className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                          >
                            💰 تسوية
                          </button>
                        )}
                        <button
                          onClick={() => handleShowMerchantReceipts(merchant.id)}
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                        >
                          🧾 الوصولات
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMerchants.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      لا يوجد متاجر {searchTerm && 'مطابقة للبحث'}
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
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  السابق
                </button>
                <button
                  onClick={() => setPage(page + 1)}
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
              <h2 className="text-xl font-bold text-gray-900">💰 تسوية رصيد المتجر</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">المتجر</p>
                <p className="font-medium text-gray-900">{payoutModal.merchant.storeName}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 space-y-1">
                <p className="text-sm text-emerald-700">الرصيد المتاح للتسوية</p>
                <p className="text-2xl font-bold text-emerald-800">{payoutModal.merchant.balance.toLocaleString()} د.ع</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800">
                <p><strong>ضريبة ({payoutModal.merchant.taxPercent ?? 5}%):</strong> {(payoutModal.merchant.taxAmount ?? 0).toLocaleString()} د.ع</p>
                <p><strong>الصافي للمتجر (بعد خصم الضريبة):</strong> {(payoutModal.merchant.netAfterTax ?? payoutModal.merchant.balance).toLocaleString()} د.ع — هذا المبلغ يصل للمتجر فعلياً عند الدفع.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المراد تسويته (د.ع)</label>
                <input
                  type="number"
                  value={payoutModal.amount}
                  onChange={(e) => setPayoutModal({ ...payoutModal, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  max={payoutModal.merchant.balance}
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">لا يمكن أن يتجاوز الرصيد المتاح</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظة / رقم الحوالة</label>
                <input
                  type="text"
                  value={payoutModal.note}
                  onChange={(e) => setPayoutModal({ ...payoutModal, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="رقم الحوالة، تاريخ الدفع، أو أي ملاحظة..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setPayoutModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
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
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {payoutMutation.isPending ? '⏳ جاري التنفيذ...' : '✅ تأكيد التسوية'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MerchantDetailsModal({ merchant, onClose, onPayout }: { 
  merchant: MerchantBalance; 
  onClose: () => void; 
  onPayout: () => void; 
}) {
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
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{merchant.storeName}</h2>
              <p className="text-sm text-gray-500">سجل الحركات المالية</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <div className="text-sm text-emerald-600">الرصيد الحالي</div>
              <div className="text-xl font-bold text-emerald-800">{merchant.balance.toLocaleString()} د.ع</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 text-center">
              <div className="text-sm text-gray-600">ضريبة ({merchant.taxPercent ?? 5}%)</div>
              <div className="text-lg font-bold text-gray-800">{(merchant.taxAmount ?? 0).toLocaleString()} د.ع</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-sm text-blue-600">الصافي للمتجر</div>
              <div className="text-sm text-gray-500 mb-0.5">(يصل للمتجر عند الدفع)</div>
              <div className="text-xl font-bold text-blue-800">{(merchant.netAfterTax ?? merchant.balance).toLocaleString()} د.ع</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-sm text-blue-600">الديون (Credits)</div>
              <div className="text-xl font-bold text-blue-800">{merchant.totalCredits.toLocaleString()} د.ع</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-sm text-amber-600">المدفوعات (Debits)</div>
              <div className="text-xl font-bold text-amber-800">{merchant.totalDebits.toLocaleString()} د.ع</div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">سجل الحركات</h3>
            {merchant.balance > 0 && (
              <button onClick={onPayout} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                💰 إجراء تسوية
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center text-gray-500 py-8">جاري التحميل...</div>
          ) : (
            <>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">التاريخ</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">النوع</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">المبلغ</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">ملاحظة / طلب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ledger.map((entry: LedgerEntry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {new Date(entry.createdAt).toLocaleDateString('ar-IQ')}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            entry.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {entry.type === 'credit' ? '💰 دين (Credit)' : '💸 دفع (Debit)'}
                          </span>
                        </td>
                        <td className={`px-4 py-2 text-sm font-bold ${entry.type === 'credit' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {entry.type === 'credit' ? '+' : '-'}{Number(entry.amount).toLocaleString()} د.ع
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {entry.note || (entry.order ? `طلب #${entry.order.orderNumber}` : '—')}
                        </td>
                      </tr>
                    ))}
                    {ledger.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          لا توجد حركات مالية
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm text-gray-500">صفحة {page} من {totalPages}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
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
