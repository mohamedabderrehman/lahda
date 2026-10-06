import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// New simplified navigation - 7 main sections only
const nav = [
  { to: '/dashboard', label: 'الرئيسية', icon: '📊', desc: 'نظرة عامة على الأداء' },
  { to: '/users', label: 'المستخدمين', icon: '👥', desc: 'العملاء، المتاجر، والسائقين' },
  { to: '/orders', label: 'الطلبات', icon: '📦', desc: 'إدارة الطلبات والتوصيل' },
  { to: '/finance', label: 'المالية', icon: '💰', desc: 'التسعير، الأرصدة، والتحصيل' },
  { to: '/content', label: 'المحتوى', icon: '📝', desc: 'التصنيفات، البنرات، والأسئلة' },
  { to: '/ratings', label: 'التقييمات', icon: '⭐', desc: 'تقييمات المتاجر والسائقين' },
  { to: '/settings', label: 'الإعدادات', icon: '⚙️', desc: 'إعدادات التطبيق والتسعير' },
];

// Secondary links (help and support)
const secondaryNav = [
  { to: '/faq', label: 'الأسئلة الشائعة', icon: '❓' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if a route is active (including nested routes)
  const isActiveRoute = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-gray-50" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0 fixed h-full overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
              ل
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>
              <p className="text-xs text-gray-500">Lahda Admin</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
            القائمة الرئيسية
          </p>
          {nav.map(({ to, label, icon, desc }) => (
            <NavLink
              key={to}
              to={to}
              className={() =>
                `flex flex-col gap-0.5 px-3 py-3 rounded-xl text-sm font-medium transition-all mb-1 ${
                  isActiveRoute(to)
                    ? 'bg-primary-50 text-primary-700 border-r-4 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <span className="font-semibold">{label}</span>
                {isActiveRoute(to) && (
                  <span className="mr-auto w-2 h-2 rounded-full bg-primary-600"></span>
                )}
              </div>
              <span className={`text-xs mr-8 ${isActiveRoute(to) ? 'text-primary-600' : 'text-gray-400'}`}>
                {desc}
              </span>
            </NavLink>
          ))}

          <div className="my-4 border-t border-gray-100"></div>
          
          <p className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
            مساعدة
          </p>
          {secondaryNav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-gray-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-gray-400">المستخدم الحالي</p>
            <p className="text-sm font-medium text-gray-700 truncate">{user?.email}</p>
            <p className="text-xs text-primary-600 font-medium">مدير النظام</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <span>🚪</span>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 mr-72 overflow-auto min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
