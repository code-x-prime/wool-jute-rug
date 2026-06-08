import PartnerPage from "./pages/partner";
import PartnerDetailsPage from "./pages/PartnerDetailsPage";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordAdminPage from "./pages/ResetPasswordAdminPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import CategoriesPage from "./pages/CategoriesPage";
import AttributesPage from "./pages/AttributesPage";
import AttributeValuesPage from "./pages/AttributeValuesPage";
import CouponsPage from "./pages/CouponsPage";
import AdminsPage from "./pages/AdminsPage";
import AdminCreatePage from "./pages/AdminCreatePage";
import AdminPermissionsPage from "./pages/AdminPermissionsPage";
import CustomRugsManagementPage from "./pages/CustomRugsManagementPage";
import ReviewsManagementPage from "./pages/ReviewsManagementPage";
import FAQManagementPage from "./pages/FAQManagementPage";
import FAQCreatePage from "./pages/FAQCreatePage";
import NotFoundPage from "./pages/NotFoundPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProductCreatePage from "./pages/ProductCreatePage";
import { useAuth } from "./context/AuthContext";
import { Resource, Action } from "./types/admin";
import { PermissionGuard } from "./components/PermissionGuard";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "./components/ui/card";
import UserManagementPage from "./pages/UserManagementPage";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import BrandsPage from "./pages/BrandsPage";
import ProductSectionsPage from "./pages/ProductSections";
import BannersPage from "./pages/BannersPage";
import FlashSalesPage from "./pages/FlashSalesPage";
import ReferralsPage from "./pages/ReferralsPage";
import ReturnRequestsPage from "./pages/ReturnRequestsPage";
import ShoppableCarouselPage from "./pages/ShoppableCarouselPage";
import MOQSettingsPage from "./pages/MOQSettingsPage";
import PricingSlabsPage from "./pages/PricingSlabsPage";
import SettingsPage from "./pages/SettingsPage";
import MarketingSettingsPage from "./pages/MarketingSettingsPage";
import TawkToSettingsPage from "./pages/TawkToSettingsPage";
import SiteSettingsPage from "./pages/SiteSettingsPage";
import NavigationPage from "./pages/NavigationPage";
import { LanguageProvider } from "./context/LanguageContext";

// Protected Route Component
const ProtectedRoute = ({
  children,
  resource,
  action = Action.READ,
  superAdminOnly = false,
}: {
  children: React.ReactNode;
  resource?: Resource;
  action?: Action;
  superAdminOnly?: boolean;
}) => {
  const { admin, isAuthenticated } = useAuth();

  // Not authenticated at all
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super admin only route
  if (superAdminOnly && admin?.role !== "SUPER_ADMIN") {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-10 w-10 text-red-600" />
            <div>
              <h3 className="text-lg font-medium text-red-800">
                Access Denied
              </h3>
              <p className="text-red-700">
                This page is only accessible to Super Administrators.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Permission-based route
  if (resource && action) {
    const hasPermission =
      admin?.role === "SUPER_ADMIN" ||
      admin?.permissions?.includes(`${resource}:${action}`);

    if (!hasPermission) {
      return (
        <PermissionGuard resource={resource} action={action}>
          {children}
        </PermissionGuard>
      );
    }
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={<LoginPage />}
            errorElement={<ErrorBoundary />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPasswordPage />}
            errorElement={<ErrorBoundary />}
          />
          <Route
            path="/reset-password-admin/:token"
            element={<ResetPasswordAdminPage />}
            errorElement={<ErrorBoundary />}
          />

          {/* Authenticated routes with DashboardLayout */}
          <Route
            path="/"
            element={<DashboardLayout />}
            errorElement={<ErrorBoundary />}
          >
            <Route index element={<Navigate to="/dashboard" replace />} />

            <Route
              path="dashboard"
              element={
                <ProtectedRoute
                  resource={Resource.DASHBOARD}
                  action={Action.READ}
                >
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="dashboard/analytics"
              element={
                <ProtectedRoute
                  resource={Resource.ANALYTICS}
                  action={Action.READ}
                >
                  <AnalyticsDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="products"
              element={
                <ProtectedRoute resource={Resource.PRODUCTS} action={Action.READ}>
                  <ProductsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="products/new"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.CREATE}
                >
                  <ProductCreatePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="products/edit/:id"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.UPDATE}
                >
                  <ProductsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="products/:id"
              element={
                <ProtectedRoute resource={Resource.PRODUCTS} action={Action.READ}>
                  <ProductDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="orders"
              element={
                <ProtectedRoute resource={Resource.ORDERS} action={Action.READ}>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="orders/:id"
              element={
                <ProtectedRoute resource={Resource.ORDERS} action={Action.READ}>
                  <OrderDetailsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="categories"
              element={
                <ProtectedRoute
                  resource={Resource.CATEGORIES}
                  action={Action.READ}
                >
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="categories/new"
              element={
                <ProtectedRoute
                  resource={Resource.CATEGORIES}
                  action={Action.CREATE}
                >
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="categories/:id"
              element={
                <ProtectedRoute
                  resource={Resource.CATEGORIES}
                  action={Action.UPDATE}
                >
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="attributes"
              element={
                <ProtectedRoute resource={Resource.PRODUCTS} action={Action.READ}>
                  <AttributesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="attributes/new"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.CREATE}
                >
                  <AttributesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="attributes/:id"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.UPDATE}
                >
                  <AttributesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="attributes/:attributeId/values"
              element={
                <ProtectedRoute resource={Resource.PRODUCTS} action={Action.READ}>
                  <AttributeValuesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="attributes/:attributeId/values/new"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.CREATE}
                >
                  <AttributeValuesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="attributes/:attributeId/attribute-values/:id"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.UPDATE}
                >
                  <AttributeValuesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="attribute-values/:id/edit"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.UPDATE}
                >
                  <AttributeValuesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="coupons"
              element={
                <ProtectedRoute resource={Resource.COUPONS} action={Action.READ}>
                  <CouponsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="coupons/new"
              element={
                <ProtectedRoute
                  resource={Resource.COUPONS}
                  action={Action.CREATE}
                >
                  <CouponsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="coupons/:id"
              element={
                <ProtectedRoute
                  resource={Resource.COUPONS}
                  action={Action.UPDATE}
                >
                  <CouponsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="site-settings"
              element={
                <ProtectedRoute
                  resource={Resource.SETTINGS}
                  action={Action.UPDATE}
                >
                  <SiteSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="payment-settings" element={<Navigate to="/site-settings?tab=payment" replace />} />
            <Route path="price-visibility-settings" element={<Navigate to="/site-settings?tab=price" replace />} />
            <Route path="payment-gateway-settings" element={<Navigate to="/site-settings?tab=payment" replace />} />
            <Route path="shiprocket-settings" element={<Navigate to="/site-settings?tab=shipping" replace />} />
            <Route path="shipping-settings" element={<Navigate to="/site-settings?tab=shipping" replace />} />


            <Route
              path="flash-sales"
              element={
                <ProtectedRoute resource={Resource.PRODUCTS} action={Action.READ}>
                  <FlashSalesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="flash-sales/new"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.CREATE}
                >
                  <FlashSalesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="flash-sales/:id"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.UPDATE}
                >
                  <FlashSalesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="moq-settings"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.UPDATE}
                >
                  <MOQSettingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="pricing-slabs"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.UPDATE}
                >
                  <PricingSlabsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="settings"
              element={
                <ProtectedRoute
                  resource={Resource.SETTINGS}
                  action={Action.UPDATE}
                >
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="navigation-settings"
              element={
                <ProtectedRoute
                  resource={Resource.SETTINGS}
                  action={Action.UPDATE}
                >
                  <NavigationPage />
                </ProtectedRoute>
              }
            />

            <Route path="marketing-settings" element={<Navigate to="/email-delivery-settings" replace />} />
            <Route
              path="email-delivery-settings"
              element={
                <ProtectedRoute
                  resource={Resource.SETTINGS}
                  action={Action.UPDATE}
                >
                  <MarketingSettingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="tawkto-settings"
              element={
                <ProtectedRoute
                  resource={Resource.SETTINGS}
                  action={Action.UPDATE}
                >
                  <TawkToSettingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="referrals"
              element={
                <ProtectedRoute resource={Resource.USERS} action={Action.READ}>
                  <ReferralsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="return-requests"
              element={
                <ProtectedRoute resource={Resource.ORDERS} action={Action.READ}>
                  <ReturnRequestsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="admins"
              element={
                <ProtectedRoute superAdminOnly={true}>
                  <AdminsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="admins/new"
              element={
                <ProtectedRoute superAdminOnly={true}>
                  <AdminCreatePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="admins/permissions/:adminId"
              element={
                <ProtectedRoute superAdminOnly={true}>
                  <AdminPermissionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="users"
              element={
                <ProtectedRoute resource={Resource.USERS} action={Action.READ}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="contact-management"
              element={
                <ProtectedRoute resource={Resource.CONTACT} action={Action.READ}>
                  <CustomRugsManagementPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="reviews-management"
              element={
                <ProtectedRoute resource={Resource.REVIEWS} action={Action.READ}>
                  <ReviewsManagementPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="product-sections"
              element={
                <ProtectedRoute
                  resource={Resource.PRODUCTS}
                  action={Action.UPDATE}
                >
                  <ProductSectionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="faq-management"
              element={
                <ProtectedRoute resource={Resource.FAQS} action={Action.READ}>
                  <FAQManagementPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="faq-management/create"
              element={
                <ProtectedRoute resource={Resource.FAQS} action={Action.CREATE}>
                  <FAQCreatePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="brands"
              element={
                <ProtectedRoute resource={Resource.BRANDS} action={Action.READ}>
                  <BrandsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="banners/new"
              element={
                <ProtectedRoute
                  resource={Resource.BANNERS}
                  action={Action.CREATE}
                >
                  <BannersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="banners/:id"
              element={
                <ProtectedRoute
                  resource={Resource.BANNERS}
                  action={Action.UPDATE}
                >
                  <BannersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="banners"
              element={
                <ProtectedRoute resource={Resource.BANNERS} action={Action.READ}>
                  <BannersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="shoppable-carousel"
              element={
                <ProtectedRoute resource={Resource.BANNERS} action={Action.READ}>
                  <ShoppableCarouselPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="partner"
              element={
                <ProtectedRoute superAdminOnly={true}>
                  <PartnerPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="partners/:id"
              element={
                <ProtectedRoute superAdminOnly={true}>
                  <PartnerDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>

        <Toaster position="top-center" richColors />
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
