import { useRef } from 'react';
import type { SettlementReceipt } from '../api/client';

interface Props {
  receipt: SettlementReceipt;
  onClose: () => void;
}

export default function ReceiptModal({ receipt, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="utf-8"/>
      <title>وصل تسوية ${receipt.receiptNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 32px; color: #1a1a1a; direction: rtl; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #10b981; padding-bottom: 16px; }
        .header h1 { font-size: 22px; color: #065f46; margin-bottom: 4px; }
        .header p { font-size: 13px; color: #6b7280; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
        .meta div { background: #f3f4f6; padding: 8px 14px; border-radius: 8px; }
        .section { margin-bottom: 16px; }
        .section h3 { font-size: 14px; color: #6b7280; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #d1d5db; margin-top: 8px; padding-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
        th, td { padding: 6px 10px; border: 1px solid #e5e7eb; text-align: right; }
        th { background: #f9fafb; font-weight: 600; }
        .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        @media print { body { padding: 16px; } }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const snap = receipt.snapshotJson as Record<string, unknown>;
  const isDriver = receipt.type === 'driver_remittance';
  const orders = (snap.orders as Array<Record<string, unknown>>) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">وصل تسوية</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              🖨️ طباعة
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
          </div>
        </div>

        <div className="p-6" ref={printRef}>
          <div className="header" style={{ textAlign: 'center', marginBottom: 24, borderBottom: '2px solid #10b981', paddingBottom: 16 }}>
            <h1 style={{ fontSize: 22, color: '#065f46', marginBottom: 4 }}>منصة لحظة</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>وصل تسوية رسمي</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 14 }}>
            <div style={{ background: '#f3f4f6', padding: '8px 14px', borderRadius: 8 }}>
              <strong>رقم الوصل:</strong> {receipt.receiptNumber}
            </div>
            <div style={{ background: '#f3f4f6', padding: '8px 14px', borderRadius: 8 }}>
              <strong>التاريخ:</strong> {new Date(receipt.issuedAt).toLocaleString('ar-IQ')}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: '#6b7280', marginBottom: 6, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>
              {isDriver ? 'بيانات السائق' : 'بيانات المتجر'}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
              <span>الاسم</span>
              <span style={{ fontWeight: 600 }}>{receipt.partyName}</span>
            </div>
            {receipt.partyPhone && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                <span>الهاتف</span>
                <span>{receipt.partyPhone}</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: '#6b7280', marginBottom: 6, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>
              تفاصيل التسوية
            </h3>

            {isDriver && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span>التاريخ</span>
                  <span>{snap.date as string}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span>عدد الطلبات</span>
                  <span>{snap.ordersCount as number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span>مجموع المنتجات</span>
                  <span>{(snap.subtotalSum as number)?.toLocaleString()} د.ع</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span>رسوم التطبيق</span>
                  <span>{(snap.appFeeSum as number)?.toLocaleString()} د.ع</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span>رسوم التوصيل</span>
                  <span>{(snap.deliveryFeeSum as number)?.toLocaleString()} د.ع</span>
                </div>
              </>
            )}

            {!isDriver && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span>الرصيد قبل التسوية</span>
                  <span>{(snap.balanceBefore as number)?.toLocaleString()} د.ع</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span>ضريبة ({snap.taxPercent as number}%)</span>
                  <span>{(snap.taxAmount as number)?.toLocaleString()} د.ع</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span>الرصيد بعد التسوية</span>
                  <span>{(snap.balanceAfter as number)?.toLocaleString()} د.ع</span>
                </div>
                {snap.note && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                    <span>ملاحظة / مرجع</span>
                    <span>{snap.note as string}</span>
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 16, fontWeight: 'bold', borderTop: '2px solid #d1d5db', marginTop: 8, paddingTop: 10 }}>
              <span>المبلغ المُسوّى</span>
              <span style={{ color: '#065f46' }}>{Number(receipt.amount).toLocaleString()} د.ع</span>
            </div>
          </div>

          {isDriver && orders.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, color: '#6b7280', marginBottom: 6, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>
                الطلبات المشمولة
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 10px', border: '1px solid #e5e7eb', textAlign: 'right', background: '#f9fafb', fontWeight: 600 }}>رقم الطلب</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #e5e7eb', textAlign: 'right', background: '#f9fafb', fontWeight: 600 }}>المنتجات</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #e5e7eb', textAlign: 'right', background: '#f9fafb', fontWeight: 600 }}>الرسوم</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #e5e7eb', textAlign: 'right', background: '#f9fafb', fontWeight: 600 }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', textAlign: 'right' }}>#{o.orderNumber as string}</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{(o.subtotal as number)?.toLocaleString()} د.ع</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{(o.appFee as number)?.toLocaleString()} د.ع</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>{(o.total as number)?.toLocaleString()} د.ع</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            هذا الوصل صادر من نظام لحظة — {receipt.receiptNumber}
          </div>
        </div>
      </div>
    </div>
  );
}
