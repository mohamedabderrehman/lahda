import { NavLink, Outlet, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/content/categories', label: 'التصنيفات', icon: '📁', desc: 'تصنيفات المتاجر' },
  { to: '/content/banners', label: 'البنرات', icon: '🖼️', desc: 'الصور الترويجية' },
  { to: '/content/sections', label: 'أقسام الصفحة الرئيسية', icon: '🏠', desc: 'تنظيم الصفحة الرئيسية' },
  { to: '/content/promo-codes', label: 'أكواد الخصم', icon: '🎟️', desc: 'إدارة أكواد الخصم' },
  { to: '/content/faq', label: 'الأسئلة الشائعة', icon: '❓', desc: 'FAQ للعملاء' },
  { to: '/content/support', label: 'قنوات الدعم', icon: '📞', desc: 'طرق التواصل' },
];

export default function Content() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      {/* Header with Help Text */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">إدارة المحتوى</h1>
        <p className="text-gray-600">
          هنا يمكنك إدارة كل المحتوى الظاهر في التطبيق: تصنيفات المتاجر التي يراها العملاء، 
          البنرات الترويجية، أقسام الصفحة الرئيسية، الأسئلة الشائعة، وقنوات التواصل مع الدعم.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-1 flex-wrap">
        {tabs.map(({ to, label, icon, desc }) => (
          <NavLink
            key={to}
            to={to}
            className={() =>
              `flex flex-col px-4 py-3 rounded-t-lg text-sm font-medium transition-all ${
                location.pathname === to || (to === '/content/categories' && location.pathname === '/content')
                  ? 'bg-white text-cyan-600 border-t-2 border-x border-gray-200 border-t-cyan-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <div className="flex items-center gap-2">
              <span>{icon}</span>
              <span>{label}</span>
            </div>
            <span className={`text-xs mr-6 ${location.pathname === to || (to === '/content/categories' && location.pathname === '/content') ? 'text-cyan-500' : 'text-gray-400'}`}>
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
