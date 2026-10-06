import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';

// Main Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Orders from './pages/Orders';
import Finance from './pages/Finance';
import Content from './pages/Content';
import Ratings from './pages/Ratings';
import Settings from './pages/Settings';
import Faq from './pages/Faq';

// Tab Components
import CustomersTab from './pages/tabs/CustomersTab';
import MerchantsTab from './pages/tabs/MerchantsTab';
import DriversTab from './pages/tabs/DriversTab';
import OrdersListTab from './pages/tabs/OrdersListTab';
import CodRemittancesTab from './pages/tabs/CodRemittancesTab';
import PricingTab from './pages/tabs/PricingTab';
import MerchantAccountsTab from './pages/tabs/MerchantAccountsTab';
import DriverCodTab from './pages/tabs/DriverCodTab';
import CategoriesTab from './pages/tabs/CategoriesTab';
import PromoBannersTab from './pages/tabs/PromoBannersTab';
import PromoCodesTab from './pages/tabs/PromoCodesTab';
import HomeSectionsTab from './pages/tabs/HomeSectionsTab';
import FaqTab from './pages/tabs/FaqTab';
import SupportChannelsTab from './pages/tabs/SupportChannelsTab';
import AppearanceTab from './pages/tabs/AppearanceTab';
import PricingSettingsTab from './pages/tabs/PricingSettingsTab';
import RewardChallengeTab from './pages/tabs/RewardChallengeTab';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Users - With Tabs */}
        <Route path="users" element={<Users />}>
          <Route index element={<CustomersTab />} />
          <Route path="customers" element={<CustomersTab />} />
          <Route path="merchants" element={<MerchantsTab />} />
          <Route path="drivers" element={<DriversTab />} />
        </Route>

        {/* Orders - With Tabs */}
        <Route path="orders" element={<Orders />}>
          <Route index element={<OrdersListTab />} />
          <Route path="list" element={<OrdersListTab />} />
          <Route path="cod" element={<CodRemittancesTab />} />
        </Route>

        {/* Finance - With Tabs */}
        <Route path="finance" element={<Finance />}>
          <Route index element={<PricingTab />} />
          <Route path="pricing" element={<PricingTab />} />
          <Route path="merchants" element={<MerchantAccountsTab />} />
          <Route path="driver-cod" element={<DriverCodTab />} />
        </Route>

        {/* Content - With Tabs */}
        <Route path="content" element={<Content />}>
          <Route index element={<CategoriesTab />} />
          <Route path="categories" element={<CategoriesTab />} />
          <Route path="banners" element={<PromoBannersTab />} />
          <Route path="sections" element={<HomeSectionsTab />} />
          <Route path="promo-codes" element={<PromoCodesTab />} />
          <Route path="faq" element={<FaqTab />} />
          <Route path="support" element={<SupportChannelsTab />} />
        </Route>

        {/* Ratings */}
        <Route path="ratings" element={<Ratings />} />

        {/* Settings - With Tabs */}
        <Route path="settings" element={<Settings />}>
          <Route index element={<AppearanceTab />} />
          <Route path="appearance" element={<AppearanceTab />} />
          <Route path="pricing" element={<PricingSettingsTab />} />
          <Route path="reward-challenge" element={<RewardChallengeTab />} />
        </Route>

        {/* FAQ Help Page */}
        <Route path="faq" element={<Faq />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
