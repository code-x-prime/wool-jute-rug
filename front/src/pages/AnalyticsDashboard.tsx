import { useState, useEffect } from "react";
import api from "@/api/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Package,
  ShoppingCart,
  Eye,
  Weight,
  TrendingUp,
  Repeat,
  Users,
  Activity,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

export default function AnalyticsDashboard() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [mostViewedProducts, setMostViewedProducts] = useState([]);
  const [usersWithCarts, setUsersWithCarts] = useState([]);
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [repeatProducts, setRepeatProducts] = useState([]);
  const [repeatUsers, setRepeatUsers] = useState([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("products");

  // Fetch the active tab data on first load and when tab changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (activeTab === "products") {
          const response = await api.get("/admin/analytics/products");
          setMostViewedProducts(
            response.data?.data?.productViews || response.data?.productViews || []
          );
        } else if (activeTab === "carts") {
          const response = await api.get("/admin/analytics/carts");
          setUsersWithCarts(
            response.data?.data?.users || response.data?.users || []
          );
        } else if (activeTab === "top-selling") {
          const response = await api.get("/admin/analytics/products/top-selling");
          setTopSellingProducts(
            response.data?.data?.topSelling || response.data?.topSelling || []
          );
        } else if (activeTab === "repeat-products") {
          const response = await api.get("/admin/analytics/products/repeat");
          setRepeatProducts(
            response.data?.data?.repeatProducts ||
            response.data?.repeatProducts ||
            []
          );
        } else if (activeTab === "repeat-users") {
          const response = await api.get("/admin/analytics/users/repeat");
          setRepeatUsers(
            response.data?.data?.repeatUsers || response.data?.repeatUsers || []
          );
        } else if (activeTab === "user-stats") {
          const response = await api.get("/admin/analytics/users/stats");
          setUserStats(response.data?.data || response.data || null);
        }
      } catch (error) {
        console.error(`Error fetching analytics for ${activeTab}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6 pb-8">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              {t("analytics.title")}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5">
              {t("analytics.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <BarChart className="h-4 w-4 text-[#4CAF50]" />
              <span>
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      {/* Tabs / Pills - wrap on small screens, scroll on md+ */}
      <div className="flex flex-wrap items-center gap-2 pb-2 min-w-0">
        {[
          { id: "products", icon: Eye, label: t("analytics.tabs.popular_products") },
          { id: "top-selling", icon: TrendingUp, label: t("analytics.tabs.top_selling") },
          { id: "repeat-products", icon: Repeat, label: t("analytics.tabs.repeat_products") },
          { id: "repeat-users", icon: Users, label: t("analytics.tabs.repeat_users") },
          { id: "user-stats", icon: Activity, label: t("analytics.tabs.user_stats") },
          { id: "carts", icon: ShoppingCart, label: t("analytics.tabs.user_carts") },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0",
              activeTab === tab.id
                ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 shadow-sm"
                : "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
            )}
          >
            <div className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Popular Products Tab */}
      {activeTab === "products" && (
        <Card className="w-full min-w-0 bg-[var(--bg-card)] border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Eye className="h-5 w-5 text-[var(--accent)]" />
              {t("analytics.products.title")}
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              {t("analytics.products.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton count={5} />
            ) : mostViewedProducts.length > 0 ? (
              <ProductList
                products={mostViewedProducts}
                valueKey="views"
                labelKey={t("analytics.products.views")}
              />
            ) : (
              <EmptyState
                icon={Eye}
                title={t("analytics.products.no_views")}
                desc={t("analytics.products.no_views_desc")}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Selling Products Tab */}
      {activeTab === "top-selling" && (
        <Card className="w-full min-w-0 bg-[var(--bg-card)] border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
              {t("analytics.tabs.top_selling")}
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              {t("analytics.products.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton count={5} />
            ) : topSellingProducts.length > 0 ? (
              <ProductList
                products={topSellingProducts}
                valueKey="totalSold"
                labelKey={t("analytics.products.sold")}
                valueColor="text-[var(--accent)]"
              />
            ) : (
              <EmptyState
                icon={TrendingUp}
                title={t("analytics.empty.no_data")}
                desc={t("analytics.empty.no_sales_desc")}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Repeat Products Tab */}
      {activeTab === "repeat-products" && (
        <Card className="w-full min-w-0 bg-[var(--bg-card)] border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Repeat className="h-5 w-5 text-[var(--accent)]" />
              {t("analytics.tabs.repeat_products")}
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              {t("analytics.products.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton count={5} />
            ) : repeatProducts.length > 0 ? (
              <ProductList
                products={repeatProducts}
                valueKey="timesOrdered"
                labelKey={t("analytics.products.orders")}
                valueColor="text-[var(--accent)]"
              />
            ) : (
              <EmptyState
                icon={Repeat}
                title={t("analytics.empty.no_data")}
                desc={t("analytics.empty.no_repeat_desc")}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Repeat Users Tab */}
      {activeTab === "repeat-users" && (
        <Card className="w-full min-w-0 bg-[var(--bg-card)] border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--accent)]" />
              {t("analytics.tabs.repeat_users")}
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              {t("analytics.products.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton count={5} />
            ) : repeatUsers.length > 0 ? (
              <div className="space-y-3">
                {repeatUsers.map((user: any) => (
                  <div
                    key={user.userId}
                    className="flex justify-between items-center p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center font-bold text-lg border border-[var(--accent)]/20">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[var(--text-primary)] text-base mb-1 truncate">
                          {user.name}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] truncate">
                          {user.email} • {user.phone}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-[var(--accent)]">
                        {user.totalOrders}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">{t("analytics.products.orders")}</div>
                      <div className="text-sm font-medium text-[var(--accent)] mt-1">
                        {formatCurrency(user.totalSpent)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title={t("analytics.empty.no_data")}
                desc={t("analytics.empty.no_customer_desc")}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* User Stats Tab */}
      {activeTab === "user-stats" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
          {loading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : userStats ? (
            <>
              <StatCard
                title={t("analytics.stats.total_users")}
                value={userStats.totalUsers}
                icon={Users}
                color="text-blue-600"
                bg="bg-blue-50"
              />
              <StatCard
                title={t("analytics.stats.active_buyers")}
                value={userStats.totalActiveUsers}
                desc={`${userStats.conversionRate}% ${t("analytics.stats.conversion_rate")}`}
                icon={ShoppingCart}
                color="text-green-600"
                bg="bg-green-50"
              />
              <StatCard
                title={t("analytics.stats.inactive_users")}
                value={userStats.inactiveUsers}
                desc={t("analytics.stats.registered_no_order")}
                icon={Users}
                color="text-gray-600"
                bg="bg-gray-50"
              />
              <StatCard
                title={t("analytics.stats.users_with_cart")}
                value={userStats.usersWithCart}
                desc={t("analytics.stats.potential_customers")}
                icon={ShoppingCart}
                color="text-orange-600"
                bg="bg-orange-50"
              />
            </>
          ) : (
            <div className="col-span-full">
              <EmptyState
                icon={Activity}
                title={t("analytics.empty.no_data")}
                desc={t("analytics.empty.unavailable")}
              />
            </div>
          )}
        </div>
      )}

      {/* User Carts Tab */}
      {activeTab === "carts" && (
        <Card className="w-full min-w-0 bg-[var(--bg-card)] border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-[var(--accent)]" />
              {t("analytics.carts.title")}
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              {t("analytics.carts.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="space-y-6">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-card)]"
                  >
                    <div className="bg-[var(--bg-secondary)] p-4 flex justify-between items-center border-b border-[var(--border-color)]">
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <div className="p-4">
                      <Skeleton className="h-32 w-full rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : usersWithCarts.length > 0 ? (
              <div className="space-y-6">
                {usersWithCarts.map((user: any) => (
                  <div
                    key={user.id}
                    className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-card)] shadow-sm"
                  >
                    <div className="bg-[var(--bg-secondary)] p-4 flex justify-between items-center border-b border-[var(--border-color)]">
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)] text-base">
                          {user.name || t("analytics.carts.anonymous")}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-[var(--accent)]">
                          {formatCurrency(user.totalValue)}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {user.totalItems} {t("analytics.carts.items_in_cart")}
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-[var(--border-color)]">
                      {user.cartItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-4 hover:bg-[var(--bg-secondary)] transition-colors min-w-0"
                        >
                          <div className="flex items-center justify-between gap-4 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              {item.product.image ? (
                                <img
                                  src={item.product.image}
                                  alt={item.product.name}
                                  className="h-16 w-16 rounded-lg object-cover border border-[var(--border-color)] flex-shrink-0"
                                />
                              ) : (
                                <div className="h-16 w-16 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0 border border-[var(--border-color)]">
                                  <Package className="h-8 w-8 text-[var(--text-secondary)]" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[var(--text-primary)] text-base mb-1">
                                  {item.product.name}
                                </div>

                                {item.product.category && (
                                  <div className="text-sm text-[var(--text-secondary)] mb-2">
                                    {item.product.category.name}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                  {item.product.variant.flavor && (
                                    <Badge className="bg-[#F3F7F6] text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] flex items-center text-xs">
                                      {item.product.variant.flavorImage ? (
                                        <img
                                          src={item.product.variant.flavorImage}
                                          alt={item.product.variant.flavor}
                                          className="w-3 h-3 rounded-full mr-1"
                                        />
                                      ) : (
                                        <div className="w-2 h-2 mr-1 rounded-full bg-primary"></div>
                                      )}
                                      {item.product.variant.flavor}
                                    </Badge>
                                  )}
                                  {item.product.variant.weight && (
                                    <Badge className="bg-[#F3F7F6] text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] text-xs">
                                      <Weight className="h-3 w-3 mr-1" />
                                      {item.product.variant.weight}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                                <div className="text-right flex-shrink-0">
                              <div className="text-lg font-semibold text-[var(--text-primary)]">
                                {item.product.variant.salePrice ? (
                                  <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[var(--accent)] font-semibold">
                                        {formatCurrency(
                                          item.product.variant.salePrice
                                        )}
                                      </span>
                                      <span className="text-xs line-through text-[var(--text-secondary)]">
                                        {formatCurrency(
                                          item.product.variant.price
                                        )}
                                      </span>
                                    </div>
                                    {item.product.variant.discount > 0 && (
                                      <span className="text-xs bg-[var(--destructive)]/10 text-[var(--destructive)] px-2 py-0.5 rounded-lg font-medium mt-1">
                                        -{item.product.variant.discount}% OFF
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  formatCurrency(item.product.variant.price)
                                )}
                              </div>
                              <div className="mt-2 text-sm font-medium bg-[var(--accent)]/15 text-[var(--accent)] px-3 py-1 rounded-lg inline-block">
                                {t("analytics.carts.qty")}: {item.quantity}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title={t("analytics.carts.no_carts")}
                desc={t("analytics.carts.no_carts_desc")}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components
function LoadingSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="flex justify-between items-center p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductList({ products, valueKey, labelKey, valueColor = "text-[var(--accent)]" }: any) {
  return (
    <div className="space-y-3 max-h-[50vh] overflow-y-auto overflow-x-hidden pr-1 min-w-0">
      {products.map((item: any) => (
        <div
          key={item.productId}
          className="flex justify-between items-center p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {item.image || (item.product && item.product.image) ? (
              <img
                src={item.image || item.product.image}
                alt={item.name || item.product.name}
                className="h-14 w-14 rounded-lg object-cover border border-[var(--border-color)] flex-shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0 border border-[var(--border-color)]">
                <Package className="h-6 w-6 text-[var(--text-secondary)]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--text-primary)] text-base mb-1.5 truncate">
                {item.name || item.product.name}
              </div>
              {/* Variant badges logic if available */}
            </div>
          </div>
          <div className="text-right ml-4 flex-shrink-0">
            <div className={cn("text-2xl font-bold", valueColor)}>
              {item[valueKey]}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">{labelKey}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }: any) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] mb-4">
        <Icon className="h-8 w-8 text-[var(--text-secondary)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">{desc}</p>
    </div>
  );
}

function StatCard({ title, value, desc, icon: Icon, color, bg }: any) {
  return (
    <Card className="w-full min-w-0 bg-[var(--bg-card)] border-[var(--border-color)] rounded-lg shadow-sm overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", bg)}>
            <Icon className={cn("h-6 w-6", color)} />
          </div>
          {desc && (
            <span className="text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-1 rounded-lg">
              {desc}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            {title}
          </h3>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
