"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/dynamic-icon";
import { fetchApi, formatCurrency, formatDate } from "@/lib/utils";
import { ClientOnly } from "@/components/client-only";
import { ProtectedRoute } from "@/components/protected-route";

export default function ReturnsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [returnRequests, setReturnRequests] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [loadingReturns, setLoadingReturns] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Handle page from URL
  const page = searchParams.get("page")
    ? parseInt(searchParams.get("page"))
    : 1;

  // Fetch return requests
  useEffect(() => {
    const fetchReturns = async () => {
      if (!isAuthenticated) return;

      setLoadingReturns(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        });
        if (statusFilter) params.append("status", statusFilter);

        const response = await fetchApi(
          `/returns/my-returns?${params.toString()}`,
          {
            credentials: "include",
          }
        );

        setReturnRequests(response.data.returnRequests || []);
        setPagination(
          response.data.pagination || {
            total: 0,
            page: 1,
            limit: 10,
            pages: 0,
          }
        );
      } catch (error) {
        console.error("Failed to fetch return requests:", error);
        setError("Failed to load return requests. Please try again later.");
      } finally {
        setLoadingReturns(false);
      }
    };

    fetchReturns();
  }, [isAuthenticated, page, statusFilter]);

  // Get status badge color
  const getStatusColor = (status) => {
    const statusColors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-brand-gold/20 text-brand-brown",
      REJECTED: "bg-red-100 text-red-800",
      PROCESSING: "bg-blue-100 text-blue-800",
      COMPLETED: "bg-purple-100 text-purple-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  // Get left accent border color based on status
  const getAccentColor = (status) => {
    const accentColors = {
      APPROVED: "border-[#C9A84C]",
      REJECTED: "border-red-500",
      PROCESSING: "border-blue-500",
      COMPLETED: "border-purple-500",
      PENDING: "border-yellow-400",
    };
    return accentColors[status] || "border-gray-300";
  };

  // Handle pagination
  const changePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/account/returns?${params.toString()}`);
  };

  return (
    <ProtectedRoute>
      <ClientOnly>
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#3D1C02] tracking-tight">My Return Requests</h1>
            <p className="text-sm text-gray-500 mt-1">Track the status of your return submissions</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Filter */}
          <div className="mb-6">
            <div className="relative inline-flex items-center">
              <DynamicIcon
                name="Filter"
                className="absolute left-3 h-4 w-4 text-[#3D1C02]/50 pointer-events-none"
              />
              <select
                className="appearance-none pl-9 pr-8 py-2.5 text-sm border border-[#3D1C02]/30 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-[#3D1C02] focus:ring-1 focus:ring-[#3D1C02]/20 transition-colors cursor-pointer"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  const params = new URLSearchParams();
                  params.set("page", "1");
                  router.push(`/account/returns?${params.toString()}`);
                }}
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <DynamicIcon
                name="ChevronDown"
                className="absolute right-2.5 h-4 w-4 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {loadingReturns ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#C9A84C] border-t-transparent"></div>
              <p className="text-sm text-gray-400">Loading your returns...</p>
            </div>
          ) : returnRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#3D1C02]/5 flex items-center justify-center mx-auto mb-4">
                <DynamicIcon name="RotateCcw" className="h-8 w-8 text-[#3D1C02]/40" />
              </div>
              <h2 className="text-lg font-semibold text-[#3D1C02] mb-2">No Return Requests</h2>
              <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                You haven&apos;t submitted any return requests yet.
              </p>
              <Link href="/account/orders">
                <Button className="bg-[#3D1C02] hover:bg-[#3D1C02]/90 text-white px-6">
                  View My Orders
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {returnRequests.map((returnReq) => (
                <div
                  key={returnReq.id}
                  className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4 border-l-4 ${getAccentColor(returnReq.status)}`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-gray-400 mb-0.5">Order</p>
                          <p className="text-sm font-semibold text-[#3D1C02]">
                            #{returnReq.order.orderNumber}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(returnReq.status)}`}
                        >
                          {returnReq.status}
                        </span>
                      </div>

                      {/* Product */}
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Product</p>
                        <p className="font-semibold text-[#3D1C02]">
                          {returnReq.orderItem.product.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Qty {returnReq.orderItem.quantity} &times;{" "}
                          {formatCurrency(returnReq.orderItem.price)}
                        </p>
                      </div>

                      {/* Return reason */}
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Return Reason</p>
                        <p className="text-sm font-medium text-gray-800">{returnReq.reason}</p>
                        {returnReq.customReason && (
                          <p className="text-sm text-gray-500 mt-1">{returnReq.customReason}</p>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                        <span>
                          <span className="uppercase tracking-widest text-gray-400 mr-1">Requested</span>
                          {formatDate(returnReq.createdAt)}
                        </span>
                        {returnReq.processedAt && (
                          <span>
                            <span className="uppercase tracking-widest text-gray-400 mr-1">Processed</span>
                            {formatDate(returnReq.processedAt)}
                          </span>
                        )}
                      </div>

                      {/* Admin notes */}
                      {returnReq.adminNotes && (
                        <div className="mt-4 p-3.5 bg-[#C9A84C]/10 rounded-lg border border-[#C9A84C]/30">
                          <p className="text-xs uppercase tracking-widest text-[#C9A84C] font-semibold mb-1.5">
                            Note from our team
                          </p>
                          <p className="text-sm text-[#3D1C02]/80 leading-relaxed">
                            {returnReq.adminNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0">
                      <Link href={`/account/orders/${returnReq.order.id}`}>
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3D1C02] border border-[#3D1C02] rounded-lg hover:bg-[#3D1C02] hover:text-white transition-colors whitespace-nowrap">
                          <DynamicIcon name="Eye" className="h-3.5 w-3.5" />
                          View Order
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#3D1C02] border border-[#3D1C02]/30 rounded-lg hover:bg-[#3D1C02] hover:text-white hover:border-[#3D1C02] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    onClick={() => changePage(page - 1)}
                    disabled={page === 1}
                  >
                    <DynamicIcon name="ChevronLeft" className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page <span className="font-semibold text-[#3D1C02]">{page}</span> of{" "}
                    <span className="font-semibold text-[#3D1C02]">{pagination.pages}</span>
                  </span>
                  <button
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#3D1C02] border border-[#3D1C02]/30 rounded-lg hover:bg-[#3D1C02] hover:text-white hover:border-[#3D1C02] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    onClick={() => changePage(page + 1)}
                    disabled={page === pagination.pages}
                  >
                    Next
                    <DynamicIcon name="ChevronRight" className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </ClientOnly>
    </ProtectedRoute>
  );
}
