import { NavLink, Outlet, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/settings/appearance', label: 'المظهر العام', icon: '🎨', desc: 'الاسم والشعار' },
  { to: '/settings/pricing', label: 'إعدادات التسعير', icon: '💲', desc: 'الأسعار والرسوم' },
  { to: '/settings/reward-challenge', label: 'تحدي المكافآت', icon: '🏆', desc: 'مكافآت السائقين' },
];

export default function Settings() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      {/* Header with Help Text */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">إعدادات التطبيق</h1>
        <p className="text-gray-600">
          هنا يمكنك تخصيص إعدادات التطبيق بشكل عام: مظهر التطبيق (الاسم والشعار) الذي يراه العملاء،
          بالإضافة إلى إعدادات التسعير والرسوم التي تحدد كيفية حساب تكلفة الطلبات.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {tabs.map(({ to, label, icon, desc }) => (
          <NavLink
            key={to}
            to={to}
            className={() =>
              `flex flex-col px-4 py-3 rounded-t-lg text-sm font-medium transition-all ${
                location.pathname === to || (to === '/settings/appearance' && location.pathname === '/settings')
                  ? 'bg-white text-gray-900 border-t-2 border-x border-gray-200 border-t-slate-600 -mb-px shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <div className="flex items-center gap-2">
              <span>{icon}</span>
              <span>{label}</span>
            </div>
            <span className={`text-xs mr-6 ${location.pathname === to || (to === '/settings/appearance' && location.pathname === '/settings') ? 'text-gray-500' : 'text-gray-400'}`}>
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
