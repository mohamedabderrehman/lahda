import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrders, getRemittances } from '../api/client';

const tabs = [
  { to: '/orders/list', label: 'قائمة الطلبات', icon: '📋', desc: 'جميع الطلبات وحالاتها' },
  { to: '/orders/cod', label: 'التحصيل النقدي', icon: '💵', desc: 'مبالغ التوصيل النقدي من السائقين' },
];

export default function Orders() {
  const location = useLocation();

  // Get stats
  const { data: ordersData } = useQuery({
    queryKey: ['admin-orders-stats'],
    queryFn: () => getOrders(1, 1),
    staleTime: 60000,
  });
  const { data: remittancesData } = useQuery({
    queryKey: ['admin-remittances-stats'],
    queryFn: () => getRemittances({ page: 1, limit: 1 }),
    staleTime: 60000,
  });

  const pendingCOD = remittancesData?.items?.filter(r => r.status === 'submitted').length || 0;

  return (
    <div className="space-y-6">
      {/* Header with Help Text */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">إدارة الطلبات</h1>
        <p className="text-gray-600">
          متابعة جميع الطلبات في النظام من لحظة الإنشاء حتى التوصيل. يمكنك رؤية حالة كل طلب، 
          المتجر المسؤول، السائق، والعميل. قسم التحصيل النقدي يسمح لك بمتابعة مبالغ 
          الدفع عند الاستلام (COD) التي جمعها السائقون.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-purple-700">{ordersData?.total || 0}</div>
          <div className="text-sm text-gray-600">إجمالي الطلبات</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{pendingCOD}</div>
          <div className="text-sm text-gray-600">سندات بانتظار التأكيد</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {tabs.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={() =>
              `flex items-center gap-2 px-4 py-3 rounded-t-lg text-sm font-medium transition-all ${
                location.pathname === to || (to === '/orders/list' && location.pathname === '/orders')
                  ? 'bg-white text-purple-600 border-t-2 border-x border-gray-200 border-t-purple-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
            {to === '/orders/cod' && pendingCOD > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                {pendingCOD}
              </span>
            )}
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
