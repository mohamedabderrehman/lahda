import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUsers, getMerchants, getDrivers } from '../api/client';

// Tab navigation for Users section
const tabs = [
  { to: '/users/customers', label: 'العملاء', icon: '👤', desc: 'مستخدمي التطبيق من العملاء' },
  { to: '/users/merchants', label: 'المتاجر', icon: '🏪', desc: 'المتاجر والمطاعم المسجلة' },
  { to: '/users/drivers', label: 'السائقين', icon: '🚗', desc: 'سائقي التوصيل' },
];

export default function Users() {
  const location = useLocation();

  // Get counts for badges
  const { data: customersData } = useQuery({
    queryKey: ['admin-users-count'],
    queryFn: () => getUsers(1, 1),
    staleTime: 60000,
  });
  const { data: merchantsData } = useQuery({
    queryKey: ['admin-merchants-count'],
    queryFn: () => getMerchants(1, 1),
    staleTime: 60000,
  });
  const { data: driversData } = useQuery({
    queryKey: ['admin-drivers-count'],
    queryFn: () => getDrivers(1, 1),
    staleTime: 60000,
  });

  const counts = {
    customers: customersData?.total || 0,
    merchants: merchantsData?.total || 0,
    drivers: driversData?.total || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header with Help Text */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">إدارة المستخدمين</h1>
        <p className="text-gray-600">
          هنا يمكنك إدارة جميع المستخدمين في النظام: العملاء الذين يطلبون الطعام، المتاجر التي تبيع المنتجات، والسائقين الذين يقومون بالتوصيل.
          يمكنك تفعيل/تعطيل الحسابات، تغيير البيانات، أو إضافة مستخدمين جدد.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {tabs.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={() =>
              `flex items-center gap-2 px-4 py-3 rounded-t-lg text-sm font-medium transition-all ${
                location.pathname === to || (to === '/users/customers' && location.pathname === '/users')
                  ? 'bg-white text-primary-600 border-t-2 border-x border-gray-200 border-t-primary-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              location.pathname === to || (to === '/users/customers' && location.pathname === '/users')
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {counts[label === 'العملاء' ? 'customers' : label === 'المتاجر' ? 'merchants' : 'drivers']}
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
