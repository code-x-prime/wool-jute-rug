import { useState, useEffect } from "react";
import {
  orders,
  inventory,
  returnRequests,
  customerUsers,
} from "@/api/adminService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Package2,
  ExternalLink,
  PieChart as PieChartIcon,
  IndianRupee,
  Users as UsersIcon,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Star,
  Image as ImageIcon,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

// Helper function to get proper image URL
const getImageUrl = (image: string | string[] | undefined | null): string => {
  if (!image) return "/images/blog-placeholder.png";

  // Handle array of images (take first one)
  if (Array.isArray(image)) {
    if (image.length === 0) return "/images/blog-placeholder.png";
    const firstImage = image[0];
    if (typeof firstImage === "string") {
      return firstImage.startsWith("http")
        ? firstImage
        : `https://desirediv-storage.blr1.digitaloceanspaces.com/${firstImage}`;
    }
    return "/images/blog-placeholder.png";
  }

  // Handle single image string
  if (typeof image === "string") {
    return image.startsWith("http")
      ? image
      : `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
  }

  return "/images/blog-placeholder.png";
};

// Define types for API data
interface OrderStats {
  totalOrders?: number;
  totalSales?: number;
  orderGrowth?: number;
  revenueGrowth?: number;
  statusCounts?: Record<string, number>;
  topProducts?: Array<any>;
  monthlySales?: Array<{ month: string; revenue: number }>;
  [key: string]: any;
}

interface ReturnStats {
  total?: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  processing?: number;
  completed?: number;
}

interface UserStats {
  total?: number;
  active?: number;
  newThisMonth?: number;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [inventoryAlerts, setInventoryAlerts] = useState<any>(null);
  const [returnStats, setReturnStats] = useState<ReturnStats | null>(null);
  const [recentReturns, setRecentReturns] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load order stats
        const orderStatsData = await orders.getOrderStats();

        // Handle different response structures
        let actualData: OrderStats = {};
        if (orderStatsData?.data?.success && orderStatsData?.data?.data) {
          actualData = orderStatsData.data.data;
        } else if (
          orderStatsData?.data?.statusCode === 200 &&
          orderStatsData?.data?.data
        ) {
          actualData = orderStatsData.data.data;
        } else if (orderStatsData?.data) {
          actualData = orderStatsData.data;
        }

        const monthlySales = actualData.monthlySales || [];
        let statusCounts = actualData.statusCounts || {};
        if (!statusCounts || Object.keys(statusCounts).length === 0) {
          statusCounts = {};
        }

        const topProducts = actualData.topProducts || [];

        const processedData = {
          ...actualData,
          totalOrders: actualData.totalOrders || 0,
          totalSales: actualData.totalSales || 0,
          statusCounts: statusCounts,
          topProducts: topProducts,
          monthlySales: monthlySales,
          orderGrowth: actualData.orderGrowth || 0,
          revenueGrowth: actualData.revenueGrowth || 0,
        };
        setOrderStats(processedData);

        // Load inventory alerts
        const inventoryAlertsData = await inventory.getInventoryAlerts();
        let actualInventoryData = {};
        if (
          inventoryAlertsData?.data?.success &&
          inventoryAlertsData?.data?.data
        ) {
          actualInventoryData = inventoryAlertsData.data.data;
        } else if (
          inventoryAlertsData?.data?.statusCode === 200 &&
          inventoryAlertsData?.data?.data
        ) {
          actualInventoryData = inventoryAlertsData.data.data;
        } else if (inventoryAlertsData?.data) {
          actualInventoryData = inventoryAlertsData.data;
        }
        setInventoryAlerts(actualInventoryData);

        // Load return requests stats
        try {
          const returnStatsData = await returnRequests.getReturnStats();
          let actualReturnStats: ReturnStats = {};
          if (returnStatsData?.data?.success && returnStatsData?.data?.data) {
            actualReturnStats = returnStatsData.data.data;
          } else if (
            returnStatsData?.data?.statusCode === 200 &&
            returnStatsData?.data?.data
          ) {
            actualReturnStats = returnStatsData.data.data;
          } else if (returnStatsData?.data) {
            actualReturnStats = returnStatsData.data;
          }
          setReturnStats(actualReturnStats);

          // Fetch recent return requests
          const recentReturnsData = await returnRequests.getAllReturnRequests({
            page: 1,
            limit: 5,
          });
          let actualReturns: any[] = [];
          if (
            recentReturnsData?.data?.success &&
            recentReturnsData?.data?.data?.returnRequests
          ) {
            actualReturns = recentReturnsData.data.data.returnRequests;
          } else if (
            recentReturnsData?.data?.statusCode === 200 &&
            recentReturnsData?.data?.data?.returnRequests
          ) {
            actualReturns = recentReturnsData.data.data.returnRequests;
          } else if (recentReturnsData?.data?.returnRequests) {
            actualReturns = recentReturnsData.data.returnRequests;
          }
          setRecentReturns(actualReturns);
        } catch (err) {
          console.error("Error fetching return stats:", err);
        }

        // Load user stats
        try {
          const userStatsData = await customerUsers.getUsers({ limit: 1 });
          let totalUsers = 0;
          if (
            userStatsData?.data?.success &&
            userStatsData?.data?.data?.pagination
          ) {
            totalUsers = userStatsData.data.data.pagination.total || 0;
          } else if (
            userStatsData?.data?.statusCode === 200 &&
            userStatsData?.data?.data?.pagination
          ) {
            totalUsers = userStatsData.data.data.pagination.total || 0;
          } else if (userStatsData?.data?.pagination) {
            totalUsers = userStatsData.data.pagination.total || 0;
          }
          setUserStats({ total: totalUsers });
        } catch (err) {
          console.error("Error fetching user stats:", err);
        }
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data. Please try again.");
        setOrderStats({
          totalOrders: 0,
          totalSales: 0,
          statusCounts: {},
          topProducts: [],
          monthlySales: [],
          orderGrowth: 0,
          revenueGrowth: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-base text-muted-foreground">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-1.5">
          Something went wrong
        </h2>
        <p className="text-center text-muted-foreground mb-6">{error}</p>
        <Button
          variant="outline"
          className="border-primary text-primary hover:bg-accent"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">
              {t("dashboard.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-accent"
              asChild
            >
              <Link to="/orders">
                {t("dashboard.view_orders")}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="px-6 pt-5 pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            {t("dashboard.quick_actions.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.quick_actions.description")}
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto p-4 border-border hover:bg-muted text-left"
              asChild
            >
              <Link to="/product-sections" className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{t("dashboard.quick_actions.product_sections")}</div>
                  <div className="text-sm text-muted-foreground">{t("dashboard.quick_actions.product_sections_desc")}</div>
                </div>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 border-border hover:bg-muted text-left"
              asChild
            >
              <Link to="/banners" className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{t("dashboard.quick_actions.banners")}</div>
                  <div className="text-sm text-muted-foreground">{t("dashboard.quick_actions.banners_desc")}</div>
                </div>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 border-border hover:bg-muted text-left"
              asChild
            >
              <Link to="/flash-sales" className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{t("dashboard.quick_actions.flash_sales")}</div>
                  <div className="text-sm text-muted-foreground">{t("dashboard.quick_actions.flash_sales_desc")}</div>
                </div>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 border-border hover:bg-muted text-left"
              asChild
            >
              <Link to="/dashboard/analytics" className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{t("dashboard.quick_actions.analytics")}</div>
                  <div className="text-sm text-muted-foreground">{t("dashboard.quick_actions.analytics_desc")}</div>
                </div>
              </Link>
            </Button>

          </div>
        </CardContent>
      </Card>

      {/* Inventory Alerts Banner */}
      {inventoryAlerts && inventoryAlerts.count > 0 && (
        <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${inventoryAlerts.outOfStockCount > 0
                    ? "bg-destructive/10"
                    : "bg-amber-500/10"
                    }`}
                >
                  <AlertCircle
                    className={`h-5 w-5 ${inventoryAlerts.outOfStockCount > 0
                      ? "text-destructive"
                      : "text-amber-600 dark:text-amber-400"
                      }`}
                  />
                </div>
                <div>
                  <h3
                    className={`font-semibold text-sm ${inventoryAlerts.outOfStockCount > 0
                      ? "text-foreground"
                      : "text-foreground"
                      }`}
                  >
                    {t("dashboard.inventory_alert.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {inventoryAlerts.outOfStockCount > 0
                      ? `${t("dashboard.inventory_alert.out_of_stock", { count: inventoryAlerts.outOfStockCount })}, ${t("dashboard.inventory_alert.low_stock", { count: inventoryAlerts.lowStockCount })}`
                      : t("dashboard.inventory_alert.low_stock", { count: inventoryAlerts.lowStockCount })}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-border hover:bg-muted text-sm"
              >
                <Link to="/products">
                  {t("dashboard.inventory_alert.view_inventory")}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.stats.total_revenue")}
            </CardTitle>
            <IndianRupee className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-foreground">
              ₹
              {orderStats?.totalSales
                ? parseFloat(orderStats.totalSales.toString()).toLocaleString(
                  "en-IN"
                )
                : "0"}
            </div>
            <div className="flex items-center text-xs mt-3">
              {(orderStats?.revenueGrowth ?? 0) > 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {t("dashboard.stats.increase", { percent: orderStats?.revenueGrowth || 0 })}
                  </span>
                </>
              ) : (orderStats?.revenueGrowth ?? 0) < 0 ? (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-destructive" />
                  <span className="text-destructive font-medium">
                    {t("dashboard.stats.decrease", { percent: Math.abs(orderStats?.revenueGrowth || 0) })}
                  </span>
                </>
              ) : null}
              {orderStats?.revenueGrowth !== undefined && (
                <span className="ml-1.5 text-muted-foreground">{t("dashboard.stats.vs_last_month")}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#22C55E]" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.stats.total_orders")}
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-foreground">
              {orderStats?.totalOrders || 0}
            </div>
            <div className="flex items-center text-xs mt-3">
              {(orderStats?.orderGrowth ?? 0) > 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {t("dashboard.stats.increase", { percent: orderStats?.orderGrowth || 0 })}
                  </span>
                </>
              ) : (orderStats?.orderGrowth ?? 0) < 0 ? (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-destructive" />
                  <span className="text-destructive font-medium">
                    {t("dashboard.stats.decrease", { percent: Math.abs(orderStats?.orderGrowth || 0) })}
                  </span>
                </>
              ) : null}
              {orderStats?.orderGrowth !== undefined && (
                <span className="ml-1.5 text-muted-foreground">{t("dashboard.stats.vs_last_month")}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#2E7D32]" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.stats.total_users")}
            </CardTitle>
            <UsersIcon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-foreground">
              {userStats?.total || 0}
            </div>
            <div className="flex items-center text-xs mt-3">
              {userStats?.newThisMonth ? (
                <>
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {t("dashboard.stats.new_this_month", { count: userStats.newThisMonth })}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{t("dashboard.stats.no_new_users")}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Return Requests */}
        <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#F59E0B]" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.stats.return_requests")}
            </CardTitle>
            <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-foreground">
              {returnStats?.total || 0}
            </div>
            <div className="flex items-center text-xs mt-3">
              {returnStats?.pending ? (
                <>
                  <Clock className="mr-1 h-3 w-3 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {t("dashboard.stats.pending", { count: returnStats.pending })}
                  </span>
                </>
              ) : (
                <span className="text-green-600 dark:text-green-400 font-medium">{t("dashboard.stats.all_processed")}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Top Products / Sales Activity */}
        <div className="space-y-6">
          {orderStats?.topProducts && orderStats.topProducts.length > 0 ? (
            <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {t("dashboard.top_selling.title")}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("dashboard.top_selling.subtitle")}
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-4">
                  {orderStats.topProducts.slice(0, 5).map((product: any) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                    >
                      <div
                        className="h-14 w-14 rounded-lg bg-muted border border-border flex-shrink-0"
                        style={{
                          backgroundImage:
                            product.images && product.images[0]
                              ? `url(${getImageUrl(
                                product.images[0].url || product.images[0]
                              )})`
                              : "none",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm truncate">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                          <span>
                            <span className="font-semibold text-foreground">
                              {product.quantitySold || 0}
                            </span>{" "}
                            {t("dashboard.top_selling.sold")}
                          </span>
                          <span>
                            <span className="font-semibold text-foreground">
                              ₹
                              {typeof product.revenue === "string"
                                ? product.revenue
                                : parseFloat(
                                  product.revenue || 0
                                ).toLocaleString()}
                            </span>{" "}
                            {t("dashboard.top_selling.revenue")}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 border-border hover:bg-muted"
                        asChild
                      >
                        <Link to={`/products/${product.id}`}>{t("dashboard.top_selling.view")}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1.5">
                    {t("dashboard.top_selling.no_data")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    {t("dashboard.top_selling.no_data_desc")}
                  </p>
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-accent"
                    asChild
                  >
                    <Link to="/products">{t("dashboard.top_selling.view_products")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Items */}
          {inventoryAlerts && inventoryAlerts.count > 0 && (
            <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Package2 className="h-5 w-5 text-primary" />
                  {t("dashboard.low_stock.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {inventoryAlerts.alerts.slice(0, 5).map((alert: any) => (
                    <div
                      key={alert.id}
                      className="flex items-center gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
                    >
                      <div
                        className="h-12 w-12 rounded-lg bg-muted border border-border flex-shrink-0"
                        style={{
                          backgroundImage: alert.image
                            ? `url(${getImageUrl(alert.image)})`
                            : "none",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {alert.productName}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              alert.status === "OUT_OF_STOCK"
                                ? "bg-destructive/10 text-destructive border-destructive/30 text-xs"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs"
                            }
                          >
                            {alert.status === "OUT_OF_STOCK"
                              ? t("dashboard.low_stock.out_of_stock")
                              : t("dashboard.low_stock.left", { count: alert.stock })}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[alert.flavor, alert.weight]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {inventoryAlerts.count > 5 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-sm text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link to="/products">
                        {t("dashboard.low_stock.view_all", { count: inventoryAlerts.count })}
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Recent Returns / Orders */}
        <div className="space-y-6">
          {recentReturns.length > 0 ? (
            <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      {t("dashboard.recent_returns.title")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("dashboard.recent_returns.subtitle")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border hover:bg-muted text-xs"
                    asChild
                  >
                    <Link to="/return-requests">
                      {t("dashboard.recent_returns.view_all")}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  {recentReturns.map((returnReq: any) => {
                    const getStatusBadge = (status: string) => {
                      switch (status) {
                        case "PENDING":
                          return (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 text-xs">
                              <Clock className="mr-1 h-3 w-3" />
                              {t("dashboard.recent_returns.pending")}
                            </Badge>
                          );
                        case "APPROVED":
                          return (
                            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/10 text-xs">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Approved
                            </Badge>
                          );
                        case "REJECTED":
                          return (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/10 text-xs">
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejected
                            </Badge>
                          );
                        case "PROCESSING":
                          return (
                            <Badge className="bg-blue-500/10 text-[#3B82F6] border-blue-500/30 hover:bg-blue-500/10 text-xs">
                              Processing
                            </Badge>
                          );
                        case "COMPLETED":
                          return (
                            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/10 text-xs">
                              Completed
                            </Badge>
                          );
                        default:
                          return (
                            <Badge variant="outline" className="text-xs">
                              {status}
                            </Badge>
                          );
                      }
                    };

                    return (
                      <div
                        key={returnReq.id}
                        className="flex items-center gap-4 p-3 border border-border rounded-lg hover:bg-muted transition-colors"
                      >
                        <div
                          className="h-12 w-12 rounded-lg bg-muted border border-border flex-shrink-0"
                          style={{
                            backgroundImage: returnReq.orderItem?.product
                              ?.images?.[0]
                              ? `url(${getImageUrl(
                                returnReq.orderItem.product.images[0].url ||
                                returnReq.orderItem.product.images[0]
                              )})`
                              : returnReq.orderItem?.variant?.images?.[0]
                                ? `url(${getImageUrl(
                                  returnReq.orderItem.variant.images[0].url ||
                                  returnReq.orderItem.variant.images[0]
                                )})`
                                : "none",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-foreground truncate">
                              {returnReq.orderItem?.product?.name || "Product"}
                            </h4>
                            {getStatusBadge(returnReq.status)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              Order: {returnReq.order?.orderNumber || "N/A"}
                            </span>
                            <span>•</span>
                            <span>
                              {returnReq.user?.name ||
                                returnReq.user?.email ||
                                "User"}
                            </span>
                          </div>
                          {returnReq.reason && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {returnReq.reason}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 hover:bg-muted"
                          asChild
                        >
                          <Link to={`/return-requests`}>
                            View
                            <ArrowUpRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <RotateCcw className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1.5">
                    {t("dashboard.recent_returns.empty_title")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    {t("dashboard.recent_returns.empty_desc")}
                  </p>
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-accent"
                    asChild
                  >
                    <Link to="/return-requests">{t("dashboard.recent_returns.view_all_returns")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Status Distribution - Hidden on mobile */}
          {orderStats?.statusCounts &&
            Object.keys(orderStats.statusCounts).length > 0 && (
              <Card className="bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl hidden lg:block">
                <CardHeader className="px-6 pt-6 pb-4">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    {t("dashboard.order_stats.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("dashboard.order_stats.subtitle")}
                  </p>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(orderStats.statusCounts).map(
                            ([status, count]) => ({
                              name: status,
                              value: count as number,
                            })
                          )}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {Object.entries(orderStats.statusCounts).map(
                            ([_], index) => {
                              const COLORS = [
                                "#F59E0B", // PENDING - warning
                                "#3B82F6", // PROCESSING - blue
                                "#22C55E", // PAID - success
                                "#6366F1", // SHIPPED - indigo
                                "#4CAF50", // DELIVERED - primary
                                "#EF4444", // CANCELLED - danger
                                "#A855F7", // REFUNDED - purple
                                "#9CA3AF", // default - muted
                              ];
                              return (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              );
                            }
                          )}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
}
