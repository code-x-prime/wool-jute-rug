import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { orders } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Search,
  Eye,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

export default function OrdersPage() {
  const { t } = useLanguage();
  const [ordersList, setOrdersList] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState("");

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const params = {
          page: currentPage,
          limit: 10,
          ...(searchQuery && { search: searchQuery }),
          ...(selectedStatus && { status: selectedStatus }),
        };

        const response = await orders.getOrders(params);

        if (response && response.data && response.data.success) {
          setOrdersList(response.data.data?.orders || []);
          setTotalPages(response.data.data?.pagination?.pages || 1);
        } else {
          setError(response.data?.message || t('orders.actions.load_error'));
        }
      } catch (error: any) {
        console.error("Error fetching orders:", error);
        setError(t('orders.actions.load_error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [currentPage, searchQuery, selectedStatus, t]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-[var(--text-primary)]/10 text-[var(--text-primary)] border-[var(--text-primary)]/20";
      case "PROCESSING":
        return "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30";
      case "SHIPPED":
        return "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30";
      case "DELIVERED":
        return "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30";
      case "CANCELLED":
        return "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/30";
      case "REFUNDED":
        return "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30";
      case "RETURN_APPROVED":
        return "bg-[var(--text-primary)]/10 text-[var(--text-primary)] border-[var(--text-primary)]/20";
      case "RETURN_COMPLETED":
        return "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30";
      default:
        return "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return t('orders.status.pending');
      case "PROCESSING": return t('orders.status.processing');
      case "SHIPPED": return t('orders.status.shipped');
      case "DELIVERED": return t('orders.status.delivered');
      case "CANCELLED": return t('orders.status.cancelled');
      case "REFUNDED": return t('orders.status.refunded');
      case "PAID": return t('orders.status.paid');
      case "RETURN_APPROVED": return t('orders.status.return_approved') || "Return Approved";
      case "RETURN_COMPLETED": return t('orders.status.return_completed') || "Return Completed";
      default: return status;
    }
  };

  // Handle order status update
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await orders.updateOrderStatus(orderId, {
        status: newStatus,
      });

      if (response && response.data && response.data.success) {
        toast.success(t('orders.actions.status_update_success', { status: newStatus }));

        setOrdersList((prevOrders: any) =>
          prevOrders.map((order: any) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
      } else {
        toast.error(response.data?.message || t('orders.actions.status_update_error'));
      }
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast.error(
        error.message || t('orders.actions.status_update_error')
      );
    }
  };

  // Loading state
  if (isLoading && ordersList.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="mt-4 text-base text-[var(--text-secondary)]">{t('partners_tab.common.loading').replace('Partners', 'orders').replace('partners', 'orders').replace('Partner', 'Orders').replace('partner', 'orders')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && ordersList.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--destructive)]/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-[var(--destructive)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1.5">
          {t('reviews.messages.error_title')}
        </h2>
        <p className="text-center text-[var(--text-secondary)] mb-6">{error}</p>
        <Button
          variant="outline"
          className="border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--bg-secondary)]"
          onClick={() => {
            setError(null);
            setCurrentPage(1);
            setIsLoading(true);
          }}
        >
          {t('reviews.messages.try_again')}
        </Button>
      </div>
    );
  }

  const deliveredCount = ordersList.filter((o: any) => o.status === "DELIVERED").length;
  const pendingCount = ordersList.filter((o: any) => o.status === "PENDING").length;
  const processingCount = ordersList.filter((o: any) => o.status === "PROCESSING").length;
  const shippedCount = ordersList.filter((o: any) => o.status === "SHIPPED").length;

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              {t('orders.title')}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5">
              {t('orders.description')}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-2 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-[var(--text-primary)]" />
              <span className="font-semibold text-[var(--text-primary)]">{ordersList.length}</span>
              <span className="text-[var(--text-secondary)]">{t('orders.summary.total')}</span>
            </div>
            <div className="flex items-center gap-2 bg-[var(--accent)]/10 px-3 py-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-[var(--accent)]" />
              <span className="font-semibold text-[var(--accent)]">{deliveredCount}</span>
              <span className="text-[var(--accent)]">{t('orders.summary.delivered')}</span>
            </div>
          </div>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      {/* Filters Bar */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <Input
                type="search"
                placeholder={t('orders.filters.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[var(--border-color)] focus:border-primary"
              />
            </form>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] focus:border-primary focus:outline-none"
            >
              <option value="">{t('orders.filters.all_status')}</option>
              <option value="PENDING">{t('orders.status.pending')}</option>
              <option value="PROCESSING">{t('orders.status.processing')}</option>
              <option value="SHIPPED">{t('orders.status.shipped')}</option>
              <option value="DELIVERED">{t('orders.status.delivered')}</option>
              <option value="CANCELLED">{t('orders.status.cancelled')}</option>
              <option value="PAID">{t('orders.status.paid')}</option>
              <option value="REFUNDED">{t('orders.status.refunded')}</option>
              <option value="RETURN_APPROVED">{t('orders.status.return_approved') || "Return Approved"}</option>
              <option value="RETURN_COMPLETED">{t('orders.status.return_completed') || "Return Completed"}</option>
            </select>
            {(searchQuery || selectedStatus) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("");
                  setCurrentPage(1);
                }}
                className="text-[var(--text-primary)] hover:text-[var(--text-primary)]"
              >
                {t('orders.filters.clear')}
              </Button>
            )}
          </div>

          {/* Quick Status Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { status: "PENDING", count: pendingCount, label: t('orders.status.pending') },
              { status: "PROCESSING", count: processingCount, label: t('orders.status.processing') },
              { status: "SHIPPED", count: shippedCount, label: t('orders.status.shipped') },
              { status: "DELIVERED", count: deliveredCount, label: t('orders.status.delivered') },
            ].map(({ status, count, label }) => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 text-xs",
                  selectedStatus === status
                    ? ""
                    : "border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                )}
                onClick={() =>
                  setSelectedStatus(selectedStatus === status ? "" : status)
                }
              >
                {label} ({count})
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {ordersList.length === 0 ? (
        <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] mb-4">
              <ShoppingCart className="h-8 w-8 text-[var(--text-secondary)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">
              {t('orders.list.no_orders')}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
              {selectedStatus
                ? t('orders.list.no_orders_status', { status: getStatusLabel(selectedStatus).toLowerCase() })
                : searchQuery
                  ? t('orders.list.try_adjusting')
                  : t('orders.list.empty_desc')}
            </p>
            {(selectedStatus || searchQuery) && (
              <Button
                variant="outline"
                className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                onClick={() => {
                  setSelectedStatus("");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
              >
                {t('orders.filters.clear')}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordersList.map((order: any) => (
            <Card
              key={order.id}
              className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Top accent bar by status */}
              <div className={cn("h-1 w-full", order.status === "DELIVERED" ? "bg-[var(--accent)]" : order.status === "CANCELLED" ? "bg-[var(--destructive)]" : order.status === "SHIPPED" ? "bg-blue-500" : "bg-amber-400")} />
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                          <ShoppingCart className="h-6 w-6 text-[var(--accent)]" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[var(--text-primary)]">
                            #{order.orderNumber}
                          </h3>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {t('orders.list.items_count', { count: order.items?.length || 0 })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "text-sm font-semibold border px-3 py-1",
                          getStatusBadgeClass(order.status)
                        )}
                      >
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>

                    {/* Product thumbnails strip */}
                    {order.items && order.items.length > 0 && (
                      <div className="flex gap-2 mb-5 flex-wrap">
                        {order.items.slice(0, 5).map((item: any, idx: number) => (
                          <div key={idx} className="relative">
                            {item.image ? (
                              <img
                                src={item.image.startsWith("http") ? item.image : `https://desirediv-storage.blr1.digitaloceanspaces.com/${item.image}`}
                                alt={item.name || "Product"}
                                className="w-14 h-14 object-cover rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center">
                                <ShoppingCart className="h-5 w-5 text-[var(--text-secondary)]" />
                              </div>
                            )}
                            {idx === 4 && order.items.length > 5 && (
                              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">+{order.items.length - 5}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[var(--text-secondary)] mb-1">{t('orders.list.customer')}</p>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {order.user?.name || "Guest"}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {order.user?.email || "No email"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--text-secondary)] mb-1">{t('orders.list.order_date')}</p>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                          <span className="text-[var(--text-primary)]">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total & Actions */}
                  <div className="flex items-center justify-between lg:flex-col lg:items-end gap-4 lg:gap-2 lg:min-w-[140px]">
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wide">{t('orders.list.total_amount')}</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {formatCurrency(
                          order.total || order.totalAmount ||
                          (parseFloat(order.subTotal || 0) +
                            parseFloat(order.shippingCost || 0) -
                            parseFloat(order.discount || 0))
                        )}
                      </p>
                      {order.discount && parseFloat(order.discount) > 0 && (
                        <p className="text-xs text-[var(--accent)] mt-1">
                          {t('orders.list.discount', { amount: formatCurrency(parseFloat(order.discount)) })}
                        </p>
                      )}
                      {order.shippingCost && parseFloat(order.shippingCost) > 0 && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          Shipping: {formatCurrency(parseFloat(order.shippingCost))}
                        </p>
                      )}
                      {order.couponCode && (
                        <p className="text-xs text-[var(--accent)] mt-1">
                          Coupon: {order.couponCode}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-[var(--bg-secondary)]"
                        asChild
                        title={t('orders.actions.view_details')}
                      >
                        <Link to={`/orders/${order.id}`}>
                          <Eye className="h-4 w-4 text-[var(--text-primary)]" />
                        </Link>
                      </Button>
                      {order.status !== "DELIVERED" &&
                        order.status !== "CANCELLED" &&
                        order.status !== "REFUNDED" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 hover:bg-[var(--bg-secondary)]"
                                title={t('orders.actions.update_status')}
                              >
                                <MoreVertical className="h-4 w-4 text-[var(--text-primary)]" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-lg"
                            >
                              {order.status !== "PROCESSING" && (
                                <DropdownMenuItem
                                  className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                                  onClick={() =>
                                    handleStatusUpdate(order.id, "PROCESSING")
                                  }
                                >
                                  {t('orders.actions.mark_processing')}
                                </DropdownMenuItem>
                              )}
                              {order.status !== "SHIPPED" &&
                                order.status !== "PENDING" && (
                                  <DropdownMenuItem
                                    className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                                    onClick={() =>
                                      handleStatusUpdate(order.id, "SHIPPED")
                                    }
                                  >
                                    {t('orders.actions.mark_shipped')}
                                  </DropdownMenuItem>
                                )}
                              {order.status !== "DELIVERED" && (
                                <DropdownMenuItem
                                  className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                                  onClick={() =>
                                    handleStatusUpdate(order.id, "DELIVERED")
                                  }
                                >
                                  {t('orders.actions.mark_delivered')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-[var(--border-color)]" />
                              {order.status !== "CANCELLED" && (
                                <DropdownMenuItem
                                  className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                                  onClick={() =>
                                    handleStatusUpdate(order.id, "CANCELLED")
                                  }
                                >
                                  {t('orders.actions.cancel')}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
          <div className="text-sm text-[var(--text-secondary)]">
            {t("common.pagination", { current: currentPage, total: totalPages })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
