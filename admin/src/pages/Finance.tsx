import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMerchantsWithBalances, getRemittances } from '../api/client';

const tabs = [
  { to: '/finance/pricing', label: 'التسعير والرسوم', icon: '💲', desc: 'إعدادات رسوم التطبيق والتوصيل' },
  { to: '/finance/merchants', label: 'حسابات المتاجر', icon: '🏦', desc: 'مستحقات المتاجر والتسويات' },
  { to: '/finance/driver-cod', label: 'تحصيل السائقين', icon: '💵', desc: 'متابعة التحصيل النقدي' },
];

export default function Finance() {
  const location = useLocation();

  // Get stats for badges
  const { data: balancesData } = useQuery({
    queryKey: ['merchants-balances-count'],
    queryFn: () => getMerchantsWithBalances(1, 1),
    staleTime: 60000,
  });
  const { data: remittancesData } = useQuery({
    queryKey: ['remittances-count'],
    queryFn: () => getRemittances({ page: 1, limit: 1 }),
    staleTime: 60000,
  });

  const pendingCOD = remittancesData?.items?.filter(r => r.status === 'submitted').length || 0;
  const totalBalance = balancesData?.items?.reduce((sum, m) => sum + m.balance, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header with Help Text */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">الإدارة المالية</h1>
        <p className="text-gray-600">
          مركز التحكم بالأمور المالية في التطبيق. هنا يمكنك ضبط أسعار التوصيل ورسوم التطبيق،
          متابعة مستحقات المتاجر وإجراء التسويات، ومتابعة التحصيل النقدي (COD) من السائقين.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-xl">💵</div>
            <div>
              <div className="text-sm text-amber-700">بانتظار التأكيد من السائقين</div>
              <div className="text-xl font-bold text-amber-800">{pendingCOD} سند</div>
            </div>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-xl">🏪</div>
            <div>
              <div className="text-sm text-emerald-700">مستحقات المتاجر</div>
              <div className="text-xl font-bold text-emerald-800">{totalBalance.toLocaleString()} د.ع</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {tabs.map(({ to, label, icon, desc }) => (
          <NavLink
            key={to}
            to={to}
            className={() =>
              `flex flex-col px-4 py-3 rounded-t-lg text-sm font-medium transition-all ${
                location.pathname === to || (to === '/finance/pricing' && location.pathname === '/finance')
                  ? 'bg-white text-emerald-600 border-t-2 border-x border-gray-200 border-t-emerald-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <div className="flex items-center gap-2">
              <span>{icon}</span>
              <span>{label}</span>
              {to === '/finance/driver-cod' && pendingCOD > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                  {pendingCOD}
                </span>
              )}
            </div>
            <span className={`text-xs mr-6 ${location.pathname === to || (to === '/finance/pricing' && location.pathname === '/finance') ? 'text-emerald-500' : 'text-gray-400'}`}>
              {desc}
            </span>
          </NavLink>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl">
        <Outlet />
      </div>
    </div>
  );
}
