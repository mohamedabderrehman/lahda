import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { getStats, getOrdersSeries, getOrdersByStatus, getTopMerchants, getTopDrivers, getRatingsOverview } from '../api/client';

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

const statusLabelAr: Record<string, string> = {
  pending: '⏳ بانتظار الموافقة',
  accepted_by_merchant: '✅ مقبول',
  preparing: '👨‍🍳 قيد التحضير',
  ready_for_pickup: '📦 جاهز',
  picked_up: '🛍️ تم الاستلام',
  on_the_way: '🚗 في الطريق',
  delivered: '✨ تم التوصيل',
  cancelled: '❌ ملغي',
};

const statCards = [
  { key: 'usersCount', label: 'العملاء', color: 'bg-blue-500', icon: '👤', desc: 'مستخدمي التطبيق' },
  { key: 'merchantsCount', label: 'المتاجر', color: 'bg-emerald-500', icon: '🏪', desc: 'المتاجر المسجلة' },
  { key: 'driversCount', label: 'السائقين', color: 'bg-amber-500', icon: '🚗', desc: 'مندوبي التوصيل' },
  { key: 'ordersCount', label: 'الطلبات', color: 'bg-violet-500', icon: '📦', desc: 'إجمالي الطلبات' },
  { key: 'ordersToday', label: 'طلبات اليوم', color: 'bg-rose-500', icon: '📅', desc: 'طلبات هذا اليوم' },
  { key: 'totalRevenue', label: 'الإيرادات', color: 'bg-green-500', icon: '💰', desc: 'إجمالي المبيعات' },
  { key: 'ratingsCount', label: 'التقييمات', color: 'bg-yellow-500', icon: '⭐', desc: 'تقييمات المستخدمين' },
];

function formatDate30Ago() {
  const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const [from, setFrom] = useState(formatDate30Ago);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: stats, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: getStats });
  const { data: series } = useQuery({ queryKey: ['admin-orders-series', from, to], queryFn: () => getOrdersSeries(from, to) });
  const { data: byStatus } = useQuery({ queryKey: ['admin-orders-by-status'], queryFn: getOrdersByStatus });
  const { data: topMerchants } = useQuery({ queryKey: ['admin-top-merchants'], queryFn: () => getTopMerchants('orders', 8) });
  const { data: topDrivers } = useQuery({ queryKey: ['admin-top-drivers'], queryFn: () => getTopDrivers(8) });
  const { data: ratingsOv } = useQuery({ queryKey: ['admin-ratings-overview'], queryFn: getRatingsOverview });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">الرئيسية</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6 h-28 animate-pulse bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const pieData = (byStatus || []).filter((s) => s.count > 0).map((s) => ({
    name: statusLabelAr[s.status] || s.status,
    value: s.count,
  }));

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">👋 مرحباً بك في لوحة تحكم لحظة</h1>
        <p className="text-blue-100">
          هذه اللوحة تعطيك نظرة شاملة على أداء التطبيق. استخدم القائمة الجانبية للوصول إلى جميع الميزات:
          إدارة المستخدمين، الطلبات، المالية، المحتوى، والإعدادات.
        </p>
      </div>

      {/* Stat cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 إحصائيات سريعة</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {statCards.map(({ key, label, color, icon, desc }) => (
            <div key={key} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white text-lg shrink-0`}>
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{desc}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {key === 'totalRevenue'
                      ? Number(stats?.[key as keyof typeof stats] ?? 0).toLocaleString()
                      : stats?.[key as keyof typeof stats] ?? 0}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h3 className="font-semibold text-emerald-900 mb-1">🏪 المتاجر</h3>
          <p className="text-sm text-emerald-700 mb-3">إدارة المتاجر والموافقة على الجديد</p>
          <a href="#/users/merchants" className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
            الذهاب إلى المتاجر →
          </a>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-900 mb-1">💵 التحصيل النقدي</h3>
          <p className="text-sm text-amber-700 mb-3">متابعة مبالغ السائقين بانتظار التأكيد</p>
          <a href="#/finance/driver-cod" className="text-sm text-amber-600 hover:text-amber-800 font-medium">
            الذهاب إلى التحصيل →
          </a>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-1">⚙️ إعدادات التسعير</h3>
          <p className="text-sm text-blue-700 mb-3">ضبط رسوم التوصيل والتطبيق</p>
          <a href="#/finance/pricing" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            الذهاب إلى التسعير →
          </a>
        </div>
      </div>

      {/* Date range */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">📅 نطاق التاريخ</h3>
        <div className="flex gap-4 items-center flex-wrap">
          <label className="text-sm text-gray-600">
            من:
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mr-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="text-sm text-gray-600">
            إلى:
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mr-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 الطلبات عبر الزمن</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="orders" name="الطلبات" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💰 الإيرادات عبر الزمن</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString() + ' د.ع'} />
                <Bar dataKey="revenue" name="الإيرادات" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🥧 توزيع حالات الطلبات</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">⭐ نظرة عامة على التقييمات</h2>
          {ratingsOv ? (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <span className="text-sm font-medium text-gray-600">إجمالي التقييمات</span>
                <span className="text-2xl font-bold text-gray-900">{ratingsOv.total}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-600">تقييمات المتاجر</p>
                  <p className="text-xs text-gray-400">{ratingsOv.store.count} تقييم</p>
                </div>
                <span className="text-2xl font-bold text-amber-600">⭐ {ratingsOv.store.avg}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-600">تقييمات السائقين</p>
                  <p className="text-xs text-gray-400">{ratingsOv.driver.count} تقييم</p>
                </div>
                <span className="text-2xl font-bold text-purple-600">⭐ {ratingsOv.driver.avg}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">جاري التحميل...</p>
          )}
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🏆 أفضل المتاجر</h2>
          <div className="space-y-2">
            {(topMerchants || []).map((m, i) => (
              <div key={m.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                  <span className="text-sm font-medium text-gray-900">{m.storeName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{m.ordersCount} طلب</span>
                  {m.ratingCount > 0 && <span>⭐ {m.ratingAvg.toFixed(1)}</span>}
                </div>
              </div>
            ))}
            {(topMerchants || []).length === 0 && (
              <p className="text-center text-gray-500 py-4">لا توجد بيانات</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🚗 أفضل السائقين</h2>
          <div className="space-y-2">
            {(topDrivers || []).map((d, i) => (
              <div key={d.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                  <span className="text-sm font-medium text-gray-900">{d.fullName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{d.deliveries} توصيلة</span>
                  {d.ratingCount > 0 && <span>⭐ {d.ratingAvg.toFixed(1)}</span>}
                </div>
              </div>
            ))}
            {(topDrivers || []).length === 0 && (
              <p className="text-center text-gray-500 py-4">لا توجد بيانات</p>
            )}
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">📥 تصدير البيانات</h2>
        <p className="text-sm text-gray-600 mb-4">
          يمكنك تصدير تقرير الطلبات كملف CSV لفتحه في Excel.
        </p>
        <a
          href={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:2007'}/admin/reports/orders.csv`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <span>📥</span>
          تحميل تقرير الطلبات
        </a>
      </div>
    </div>
  );
}
