"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/dynamic-icon";
import { fetchApi, formatCurrency, formatDate } from "@/lib/utils";

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");

  // Handle page from URL
  const page = searchParams.get("page")
    ? parseInt(searchParams.get("page"))
    : 1;

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAuthenticated) return;

      setLoadingOrders(true);
      setError("");

      try {
        const response = await fetchApi(
          `/payment/orders?page=${page}&limit=10`,
          {
            credentials: "include",
          }
        );

        setOrders(response.data.orders || []);
        setPagination(
          response.data.pagination || {
            total: 0,
            page: 1,
            limit: 10,
            pages: 0,
          }
        );
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        setError("Failed to load your orders. Please try again later.");
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, page]);

  // Get status badge color
  const getStatusColor = (status) => {
    const statusColors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      PROCESSING: "bg-blue-100 text-blue-800",
      SHIPPED: "bg-indigo-100 text-indigo-800",
      DELIVERED: "bg-brand-gold/20 text-brand-brown",
      CANCELLED: "bg-red-100 text-red-800",
      REFUNDED: "bg-purple-100 text-purple-800",
      RETURN_APPROVED: "bg-orange-100 text-orange-800",
      RETURN_COMPLETED: "bg-teal-100 text-teal-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  // Get payment method icon
  const getPaymentIcon = (method) => {
    const methodIcons = {
      CASH: "Banknote",
      CARD: "CreditCard",
      NETBANKING: "Building",
      WALLET: "Wallet",
      UPI: "Smartphone",
      EMI: "Calendar",
      ONLINE: "CreditCard",
      OTHER: "IndianRupee",
    };
    return methodIcons[method] || "IndianRupee";
  };

  // Handle pagination
  const changePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    router.push(`/account/orders?page=${newPage}`);
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D1C02] tracking-tight">My Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage your purchases</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {loadingOrders ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#C9A84C] border-t-transparent"></div>
          <p className="text-sm text-gray-400">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#3D1C02]/5 flex items-center justify-center mx-auto mb-4">
            <DynamicIcon name="ShoppingBag" className="h-8 w-8 text-[#3D1C02]/40" />
          </div>
          <h2 className="text-lg font-semibold text-[#3D1C02] mb-2">No Orders Yet</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
            You haven&apos;t placed any orders yet. Explore our curated rug collection.
          </p>
          <Link href="/products">
            <Button className="bg-[#3D1C02] hover:bg-[#3D1C02]/90 text-white px-6">
              Browse Collection
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/account/orders/${order.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  {/* Left: order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-[#3D1C02]">
                        #{order.orderNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
                      <span>{formatDate(order.date)}</span>
                      <span className="text-gray-300">•</span>
                      <span>
                        {order.items.length}{" "}
                        {order.items.length === 1 ? "item" : "items"}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="flex items-center gap-1">
                        <DynamicIcon
                          name={getPaymentIcon(order.paymentMethod)}
                          className="h-3.5 w-3.5"
                        />
                        {order.paymentMethod}
                      </span>
                    </div>

                    {/* Return tags if any */}
                    {order.items.some((item) => item.returnRequest) && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {order.items
                          .filter((item) => item.returnRequest)
                          .map((item) => (
                            <span
                              key={item.returnRequest.id}
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                item.returnRequest.status === "APPROVED"
                                  ? "bg-brand-gold/20 text-brand-brown"
                                  : item.returnRequest.status === "REJECTED"
                                  ? "bg-red-100 text-red-800"
                                  : item.returnRequest.status === "PROCESSING"
                                  ? "bg-blue-100 text-blue-800"
                                  : item.returnRequest.status === "COMPLETED"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              Return: {item.returnRequest.status}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Right: total + action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-2 shrink-0">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 text-base">
                        {formatCurrency(order.total)}
                      </div>
                      {order.discount > 0 && (
                        <div className="text-xs text-[#C9A84C] font-medium">
                          {order.couponCode
                            ? `Saved ${formatCurrency(order.discount)} · ${order.couponCode}`
                            : `Saved ${formatCurrency(order.discount)}`}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3D1C02] border border-[#3D1C02] rounded-lg hover:bg-[#3D1C02] hover:text-white transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DynamicIcon name="Eye" className="h-3.5 w-3.5" />
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:border-[#3D1C02] hover:text-[#3D1C02] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                onClick={() => changePage(1)}
                disabled={pagination.page === 1}
                aria-label="First page"
              >
                <DynamicIcon name="ChevronsLeft" className="h-4 w-4" />
              </button>
              <button
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:border-[#3D1C02] hover:text-[#3D1C02] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                onClick={() => changePage(pagination.page - 1)}
                disabled={pagination.page === 1}
                aria-label="Previous page"
              >
                <DynamicIcon name="ChevronLeft" className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {[...Array(pagination.pages).keys()].map((i) => {
                  const pageNumber = i + 1;
                  if (
                    pageNumber === 1 ||
                    pageNumber === pagination.pages ||
                    Math.abs(pageNumber - pagination.page) <= 1 ||
                    (pagination.page <= 2 && pageNumber <= 3) ||
                    (pagination.page >= pagination.pages - 1 &&
                      pageNumber >= pagination.pages - 2)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          pagination.page === pageNumber
                            ? "bg-[#3D1C02] text-white"
                            : "border border-gray-200 text-gray-600 hover:border-[#3D1C02] hover:text-[#3D1C02]"
                        }`}
                        onClick={() => changePage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    (pageNumber === 2 && pagination.page > 3) ||
                    (pageNumber === pagination.pages - 1 &&
                      pagination.page < pagination.pages - 2)
                  ) {
                    return (
                      <span
                        key={pageNumber}
                        className="inline-flex items-center justify-center w-9 h-9 text-sm text-gray-400"
                      >
                        &hellip;
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:border-[#3D1C02] hover:text-[#3D1C02] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                onClick={() => changePage(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                aria-label="Next page"
              >
                <DynamicIcon name="ChevronRight" className="h-4 w-4" />
              </button>
              <button
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:border-[#3D1C02] hover:text-[#3D1C02] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                onClick={() => changePage(pagination.pages)}
                disabled={pagination.page === pagination.pages}
                aria-label="Last page"
              >
                <DynamicIcon name="ChevronsRight" className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
