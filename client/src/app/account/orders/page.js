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
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Highlighted Order Card */}
      {orders.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 shadow-sm p-5 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <div className="text-lg font-medium text-blue-800 mb-1">
                Recent Order: #{orders[0].orderNumber}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Placed on {formatDate(orders[0].date)} •{" "}
                {orders[0].items.length}{" "}
                {orders[0].items.length === 1 ? "item" : "items"} •{" "}
                {formatCurrency(orders[0].total)}
              </p>
              <span
                className={`px-2.5 py-1 ${getStatusColor(
                  orders[0].status
                )} text-xs font-medium rounded-full inline-block`}
              >
                {orders[0].status}
              </span>
            </div>
            <Button
              className="mt-4 md:mt-0"
              onClick={() => router.push(`/account/orders/${orders[0].id}`)}
            >
              <DynamicIcon name="Eye" className="mr-2 h-4 w-4" />
              View Order Details
            </Button>
          </div>
        </div>
      )}

      {loadingOrders ? (
        <div className="bg-white rounded-lg shadow p-8 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <DynamicIcon
            name="ShoppingBag"
            className="h-16 w-16 mx-auto text-gray-400 mb-4"
          />
          <h2 className="text-xl font-semibold mb-2">No Orders Found</h2>
          <p className="text-gray-600 mb-6">
            You haven&apos;t placed any orders yet.
          </p>
          <Link href="/products">
            <Button>Start Shopping</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Order
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Payment
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 cursor-pointer transition-all"
                      onClick={() => router.push(`/account/orders/${order.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{order.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items.length}{" "}
                          {order.items.length === 1 ? "item" : "items"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(order.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                          {/* Show return status if any item has return request */}
                          {order.items.some(item => item.returnRequest) && (
                            <div className="flex flex-wrap gap-1">
                              {order.items
                                .filter(item => item.returnRequest)
                                .map((item) => (
                                  <span
                                    key={item.returnRequest.id}
                                    className={`px-2 py-0.5 text-xs font-medium rounded ${item.returnRequest.status === "APPROVED" ? "bg-brand-gold/20 text-brand-brown" :
                                      item.returnRequest.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                        item.returnRequest.status === "PROCESSING" ? "bg-blue-100 text-blue-800" :
                                          item.returnRequest.status === "COMPLETED" ? "bg-purple-100 text-purple-800" :
                                            "bg-yellow-100 text-yellow-800"
                                      }`}
                                  >
                                    Return: {item.returnRequest.status}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {formatCurrency(order.total)}
                        </div>
                        {order.discount > 0 && (
                          <div className="text-xs text-brand-brown">
                            {order.couponCode ? (
                              <span>
                                Saved {formatCurrency(order.discount)} with{" "}
                                {order.couponCode}
                              </span>
                            ) : (
                              <span>
                                Saved {formatCurrency(order.discount)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <DynamicIcon
                            name={getPaymentIcon(order.paymentMethod)}
                            className="h-4 w-4 mr-1 text-gray-500"
                          />
                          {order.paymentMethod}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/account/orders/${order.id}`}
                          className="text-primary hover:text-primary/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    variant="outline"
                    onClick={() => changePage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => changePage(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page{" "}
                      <span className="font-medium">{pagination.page}</span> of{" "}
                      <span className="font-medium">{pagination.pages}</span>
                    </p>
                  </div>
                  <div>
                    <nav
                      className="inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <Button
                        variant="outline"
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        onClick={() => changePage(1)}
                        disabled={pagination.page === 1}
                      >
                        <span className="sr-only">First Page</span>
                        <DynamicIcon name="ChevronsLeft" className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        onClick={() => changePage(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        <span className="sr-only">Previous</span>
                        <DynamicIcon name="ChevronLeft" className="h-5 w-5" />
                      </Button>

                      {/* Page numbers */}
                      {[...Array(pagination.pages).keys()].map((i) => {
                        const pageNumber = i + 1;
                        // Only show 5 page numbers centered around current page
                        if (
                          pageNumber === 1 ||
                          pageNumber === pagination.pages ||
                          Math.abs(pageNumber - pagination.page) <= 1 ||
                          (pagination.page <= 2 && pageNumber <= 3) ||
                          (pagination.page >= pagination.pages - 1 &&
                            pageNumber >= pagination.pages - 2)
                        ) {
                          return (
                            <Button
                              key={pageNumber}
                              variant={
                                pagination.page === pageNumber
                                  ? "default"
                                  : "outline"
                              }
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pagination.page === pageNumber
                                ? "z-10 border-primary bg-primary text-white"
                                : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                                }`}
                              onClick={() => changePage(pageNumber)}
                            >
                              {pageNumber}
                            </Button>
                          );
                        } else if (
                          (pageNumber === 2 && pagination.page > 3) ||
                          (pageNumber === pagination.pages - 1 &&
                            pagination.page < pagination.pages - 2)
                        ) {
                          return (
                            <span
                              key={pageNumber}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}

                      <Button
                        variant="outline"
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        onClick={() => changePage(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                      >
                        <span className="sr-only">Next</span>
                        <DynamicIcon name="ChevronRight" className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        onClick={() => changePage(pagination.pages)}
                        disabled={pagination.page === pagination.pages}
                      >
                        <span className="sr-only">Last Page</span>
                        <DynamicIcon name="ChevronsRight" className="h-5 w-5" />
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
