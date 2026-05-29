import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { orders } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  Search,
  Eye,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

export default function OrdersPage() {
  const { t } = useLanguage();
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState("");

  const LIMIT = 20;

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const params = {
          page: currentPage,
          limit: LIMIT,
          ...(searchQuery && { search: searchQuery }),
          ...(selectedStatus && { status: selectedStatus }),
        };

        const response = await orders.getOrders(params);

        if (response && response.data && response.data.success) {
          setOrdersList(response.data.data?.orders || []);
          setTotalPages(response.data.data?.pagination?.pages || 1);
        } else {
          setError(response.data?.message || t("orders.actions.load_error"));
        }
      } catch {
        setError(t("orders.actions.load_error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [currentPage, searchQuery, selectedStatus, t]);

  // Handle search submit
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
    }).format(date);
  };

  // Status badge — differentiated colors per spec
  const StatusBadge = ({ status }: { status: string }) => {
    const label = getStatusLabel(status);
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
            {label}
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20">
            {label}
          </Badge>
        );
      case "SHIPPED":
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/20">
            {label}
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">
            {label}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20">
            {label}
          </Badge>
        );
      case "REFUNDED":
        return (
          <Badge className="bg-pink-500/15 text-pink-700 dark:text-pink-400 border border-pink-500/30 hover:bg-pink-500/20">
            {label}
          </Badge>
        );
      case "PAID":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20">
            {label}
          </Badge>
        );
      case "RETURN_APPROVED":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
            {label}
          </Badge>
        );
      case "RETURN_COMPLETED":
        return (
          <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30 hover:bg-teal-500/20">
            {label}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
            {status}
          </Badge>
        );
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return t("orders.status.pending");
      case "PROCESSING": return t("orders.status.processing");
      case "SHIPPED": return t("orders.status.shipped");
      case "DELIVERED": return t("orders.status.delivered");
      case "CANCELLED": return t("orders.status.cancelled");
      case "REFUNDED": return t("orders.status.refunded");
      case "PAID": return t("orders.status.paid");
      case "RETURN_APPROVED": return t("orders.status.return_approved") || "Return Approved";
      case "RETURN_COMPLETED": return t("orders.status.return_completed") || "Return Completed";
      default: return status;
    }
  };

  // Derived counts for quick filter badges
  const counts = ordersList.reduce(
    (acc: Record<string, number>, o: any) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {}
  );

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading && ordersList.length === 0) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="h-px bg-[var(--border-color)]" />
        </div>
        <Card className="rounded-xl border-[var(--border-color)]">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-40" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[var(--border-color)]">
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--border-color)]">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32 flex-1" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error && ordersList.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--destructive)]/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-[var(--destructive)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1.5">
          {t("reviews.messages.error_title")}
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
          {t("reviews.messages.try_again")}
        </Button>
      </div>
    );
  }

  const STATUS_OPTIONS = [
    { value: "PENDING",          label: t("orders.status.pending") },
    { value: "PROCESSING",       label: t("orders.status.processing") },
    { value: "PAID",             label: t("orders.status.paid") },
    { value: "SHIPPED",          label: t("orders.status.shipped") },
    { value: "DELIVERED",        label: t("orders.status.delivered") },
    { value: "CANCELLED",        label: t("orders.status.cancelled") },
    { value: "REFUNDED",         label: t("orders.status.refunded") },
    { value: "RETURN_APPROVED",  label: t("orders.status.return_approved") || "Return Approved" },
    { value: "RETURN_COMPLETED", label: t("orders.status.return_completed") || "Return Completed" },
  ];

  const QUICK_FILTERS = [
    { status: "PENDING",    label: t("orders.status.pending") },
    { status: "PROCESSING", label: t("orders.status.processing") },
    { status: "SHIPPED",    label: t("orders.status.shipped") },
    { status: "DELIVERED",  label: t("orders.status.delivered") },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              {t("orders.title")}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5">
              {t("orders.description")}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-2 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-[var(--text-primary)]" />
              <span className="font-semibold text-[var(--text-primary)]">{ordersList.length}</span>
              <span className="text-[var(--text-secondary)]">{t("orders.summary.total")}</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {counts["DELIVERED"] || 0}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">{t("orders.summary.delivered")}</span>
            </div>
          </div>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      {/* Filters Bar */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <Input
                id="orders-search"
                type="search"
                placeholder={t("orders.filters.search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[var(--border-color)] focus:border-primary"
              />
            </form>

            {/* Status Filter — Shadcn Select */}
            <Select
              value={selectedStatus || "__all__"}
              onValueChange={(val) => {
                setSelectedStatus(val === "__all__" ? "" : val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger
                id="orders-status-filter"
                className="w-full md:w-48 border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              >
                <SelectValue placeholder={t("orders.filters.all_status")} />
              </SelectTrigger>
              <SelectContent className="bg-[var(--bg-card)] border-[var(--border-color)]">
                <SelectItem value="__all__">{t("orders.filters.all_status")}</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear */}
            {(searchQuery || selectedStatus) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("");
                  setCurrentPage(1);
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {t("orders.filters.clear")}
              </Button>
            )}
          </div>

          {/* Quick status pills */}
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map(({ status, label }) => (
              <Button
                key={status}
                id={`orders-filter-${status.toLowerCase()}`}
                variant={selectedStatus === status ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-xs rounded-full",
                  selectedStatus !== status && "border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                )}
                onClick={() => {
                  setSelectedStatus(selectedStatus === status ? "" : status);
                  setCurrentPage(1);
                }}
              >
                {label}
                {counts[status] !== undefined && (
                  <span className="ml-1.5 opacity-70">({counts[status]})</span>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {ordersList.length === 0 ? (
        <Card className="bg-[var(--bg-card)] border-[var(--border-color)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] mb-4">
              <ShoppingCart className="h-8 w-8 text-[var(--text-secondary)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">
              {t("orders.list.no_orders")}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
              {selectedStatus
                ? t("orders.list.no_orders_status", { status: getStatusLabel(selectedStatus).toLowerCase() })
                : searchQuery
                  ? t("orders.list.try_adjusting")
                  : t("orders.list.empty_desc")}
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
                {t("orders.filters.clear")}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl overflow-hidden">
          {/* Horizontal scroll on small screens */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border-color)] hover:bg-transparent bg-[var(--bg-secondary)]/60">
                  <TableHead className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide pl-6 py-3 w-32">
                    Order ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide py-3">
                    Customer
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide py-3 text-center w-20">
                    Items
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide py-3 text-right w-28">
                    Total
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide py-3 w-36">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide py-3 w-32">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide py-3 pr-6 w-20 text-center">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Inline skeleton rows while refreshing
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i} className="border-[var(--border-color)]">
                      <TableCell className="pl-6"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="pr-6 text-center"><Skeleton className="h-8 w-14 mx-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  ordersList.map((order: any) => (
                    <TableRow
                      key={order.id}
                      id={`order-row-${order.id}`}
                      className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/50 transition-colors"
                    >
                      {/* Order ID */}
                      <TableCell className="pl-6 py-4">
                        <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                          #{order.orderNumber?.slice(-8) || order.id?.slice(-8)}
                        </span>
                      </TableCell>

                      {/* Customer */}
                      <TableCell className="py-4">
                        <div>
                          <p className="font-medium text-[var(--text-primary)] text-sm leading-tight">
                            {order.user?.name || "Guest"}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate max-w-[180px]">
                            {order.user?.email || "—"}
                          </p>
                        </div>
                      </TableCell>

                      {/* Items count */}
                      <TableCell className="py-4 text-center">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {order.items?.length ?? 0}
                        </span>
                      </TableCell>

                      {/* Total */}
                      <TableCell className="py-4 text-right">
                        <span className="font-semibold text-[var(--text-primary)] text-sm">
                          {formatCurrency(
                            order.total ||
                              order.totalAmount ||
                              (parseFloat(order.subTotal || 0) +
                                parseFloat(order.shippingCost || 0) -
                                parseFloat(order.discount || 0))
                          )}
                        </span>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="py-4">
                        <StatusBadge status={order.status} />
                      </TableCell>

                      {/* Date */}
                      <TableCell className="py-4">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {formatDate(order.createdAt)}
                        </span>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="py-4 pr-6 text-center">
                        <Button
                          id={`order-view-${order.id}`}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs border-[var(--border-color)] hover:bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                          asChild
                        >
                          <Link to={`/orders/${order.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
          <div className="text-sm text-[var(--text-secondary)]">
            {t("common.pagination", { current: currentPage, total: totalPages })}
          </div>
          <div className="flex gap-2">
            <Button
              id="orders-prev-page"
              variant="outline"
              size="sm"
              className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {/* Page number pills — show up to 5 around current */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const page = start + i;
              return (
                <Button
                  key={page}
                  id={`orders-page-${page}`}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "w-9 h-9",
                    page !== currentPage && "border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                  )}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              id="orders-next-page"
              variant="outline"
              size="sm"
              className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

