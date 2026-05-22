"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/client-only";
import { DynamicIcon } from "@/components/dynamic-icon";
import { fetchApi, formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";

export default function OrderDetailsPage({ params }) {
  const { orderId } = params;
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [returnReasons, setReturnReasons] = useState([]);
  const [returnSettings, setReturnSettings] = useState(null);
  const [returnForm, setReturnForm] = useState({
    reason: "",
    customReason: "",
    images: [],
  });
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, loading, router]);

  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!isAuthenticated || !orderId) return;

      setLoadingOrder(true);
      setError("");

      try {
        const response = await fetchApi(`/payment/orders/${orderId}`, {
          credentials: "include",
        });

        setOrder(response.data);
      } catch (error) {
        console.error("Failed to fetch order details:", error);
        setError("Failed to load order details. Please try again later.");
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrderDetails();
  }, [isAuthenticated, orderId]);

  // Fetch return settings and reasons
  useEffect(() => {
    const fetchReturnData = async () => {
      try {
        const [settingsRes, reasonsRes] = await Promise.all([
          fetchApi("/returns/settings", { credentials: "include" }),
          fetchApi("/returns/reasons", { credentials: "include" }),
        ]);
        setReturnSettings(settingsRes.data.settings);
        setReturnReasons(reasonsRes.data.reasons || []);
      } catch (error) {
        console.error("Failed to fetch return data:", error);
      }
    };
    fetchReturnData();
  }, []);

  // Handle return request
  const handleReturnRequest = async (e) => {
    e.preventDefault();
    if (!selectedItem || !returnForm.reason) return;

    if (returnForm.reason === "Other" && !returnForm.customReason.trim()) {
      alert("Please provide a custom reason");
      return;
    }

    setSubmittingReturn(true);
    try {
      await fetchApi("/returns", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          orderId: order.id,
          orderItemId: selectedItem.id,
          reason: returnForm.reason,
          customReason:
            returnForm.reason === "Other" ? returnForm.customReason : null,
          images: returnForm.images,
        }),
      });
      alert("Return request submitted successfully!");
      setShowReturnForm(false);
      setSelectedItem(null);
      setReturnForm({ reason: "", customReason: "", images: [] });
      // Refresh order details to get updated return request data
      setLoadingOrder(true);
      try {
        const response = await fetchApi(`/payment/orders/${orderId}`, {
          credentials: "include",
        });
        setOrder(response.data);
      } catch (error) {
        console.error("Failed to refresh order details:", error);
      } finally {
        setLoadingOrder(false);
      }
    } catch (error) {
      alert(error.message || "Failed to submit return request");
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Handle cancel order
  const handleCancelOrder = async (e) => {
    e.preventDefault();

    if (!cancelReason.trim()) {
      setError("Please provide a reason for cancellation");
      return;
    }

    setCancelling(true);
    setError("");

    try {
      await fetchApi(`/payment/orders/${orderId}/cancel`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ reason: cancelReason }),
      });

      // Refresh order data
      const response = await fetchApi(`/payment/orders/${orderId}`, {
        credentials: "include",
      });

      setOrder(response.data);
      setShowCancelForm(false);
      setCancelReason("");
    } catch (error) {
      console.error("Failed to cancel order:", error);
      setError(
        error.message || "Failed to cancel order. Please try again later."
      );
    } finally {
      setCancelling(false);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const statusColors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      PROCESSING: "bg-blue-100 text-blue-800",
      SHIPPED: "bg-indigo-100 text-indigo-800",
      DELIVERED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
      REFUNDED: "bg-purple-100 text-purple-800",
      RETURN_APPROVED: "bg-orange-100 text-orange-800",
      RETURN_COMPLETED: "bg-teal-100 text-teal-800",
      // Return request statuses
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  // Check if order can be cancelled (allow PAID before shipping)
  const canCancel =
    order && ["PENDING", "PROCESSING", "PAID"].includes(order.status);

  if (loading || !isAuthenticated) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/account/orders"
              className="inline-flex items-center text-sm text-gray-600 hover:text-primary mb-2"
            >
              <DynamicIcon name="ArrowLeft" className="mr-1 h-4 w-4" />
              Back to Orders
            </Link>
            <h1 className="text-3xl font-bold">Order Details</h1>
          </div>
          {canCancel && !showCancelForm && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowCancelForm(true)}
            >
              <DynamicIcon name="X" className="mr-2 h-4 w-4" />
              Cancel Order
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loadingOrder ? (
          <div className="bg-white rounded-lg shadow p-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : !order ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <DynamicIcon
              name="FileX"
              className="h-16 w-16 mx-auto text-gray-400 mb-4"
            />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">
              The order you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have permission to view it.
            </p>
            <Link href="/account/orders">
              <Button>View All Orders</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order details and status - Left column on desktop */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-1.5 w-full" style={{ background: order.status === "DELIVERED" ? "#136C5B" : order.status === "CANCELLED" ? "#ef4444" : order.status === "SHIPPED" ? "#3b82f6" : "#f59e0b" }} />
                <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Order #{order.orderNumber}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Placed on {formatDate(order.date || order.createdAt)}
                    </p>
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <span
                      className={`px-4 py-1.5 inline-flex text-sm font-bold rounded-full ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {order.status === "CANCELLED" && order.cancelReason && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-red-700">
                      <span className="font-semibold">
                        Cancellation reason:
                      </span>{" "}
                      {order.cancelReason}
                    </p>
                    {order.cancelledAt && (
                      <p className="text-sm text-red-700">
                        <span className="font-semibold">Cancelled on:</span>{" "}
                        {formatDate(order.cancelledAt)}
                      </p>
                    )}
                  </div>
                )}

                {/* Cancel form */}
                {showCancelForm && (
                  <div className="mt-4 border rounded-md p-4">
                    <h3 className="font-semibold mb-2">Cancel Order</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Please provide a reason for cancellation. This will help
                      us improve our service.
                    </p>
                    <form onSubmit={handleCancelOrder}>
                      <div className="mb-3">
                        <label
                          htmlFor="cancelReason"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Reason for cancellation
                        </label>
                        <textarea
                          id="cancelReason"
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          rows={3}
                          required
                        ></textarea>
                      </div>
                      <div className="flex space-x-3">
                        <Button
                          type="submit"
                          variant="destructive"
                          disabled={cancelling}
                        >
                          {cancelling ? "Cancelling..." : "Cancel Order"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCancelForm(false);
                            setCancelReason("");
                          }}
                        >
                          Never Mind
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tracking info - from Shiprocket or manual tracking */}
                {(order.tracking || order.trackingUrl || order.awbCode) && (
                  <div className="mt-4 border rounded-md p-4">
                    <h3 className="font-semibold mb-2">Tracking Information</h3>
                    <div className="space-y-2">
                      {(order.courierName || order.tracking?.carrier) && (
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <div className="text-sm">
                            <span className="text-gray-600">Carrier:</span>{" "}
                            {order.courierName || order.tracking?.carrier}
                          </div>
                          {order.tracking?.status && (
                            <div className="text-sm">
                              <span className="text-gray-600">Status:</span>{" "}
                              <span
                                className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${getStatusColor(
                                  order.tracking.status
                                )}`}
                              >
                                {order.tracking.status}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {(order.awbCode || order.tracking?.trackingNumber) && (
                        <span className="text-sm block">
                          <span className="text-gray-600">Tracking Number:</span>{" "}
                          <span className="font-mono">
                            {order.awbCode || order.tracking?.trackingNumber}
                          </span>
                        </span>
                      )}
                      {order.tracking?.estimatedDelivery && (
                        <span className="text-sm block">
                          <span className="text-gray-600">
                            Estimated Delivery:
                          </span>{" "}
                          {formatDate(order.tracking.estimatedDelivery)}
                        </span>
                      )}
                      {order.trackingUrl && (
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                        >
                          Track Shipment →
                        </a>
                      )}
                    </div>

                    {order.tracking?.updates &&
                      order.tracking.updates.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold mb-2">
                            Tracking Updates
                          </h4>
                          <div className="space-y-3">
                            {order.tracking.updates.map((update, index) => (
                              <div
                                key={index}
                                className="border-l-2 border-gray-200 pl-3 py-1"
                              >
                                <p className="text-sm font-medium">
                                  {update.status}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {formatDate(update.timestamp)}{" "}
                                  {update.location && `• ${update.location}`}
                                </p>
                                {update.description && (
                                  <p className="text-xs mt-1">
                                    {update.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
                </div>{/* close p-6 */}
              </div>

              {/* Order items */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Order Items ({order.items.length})</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-5 hover:bg-gray-50/50 transition-colors"
                    >
                      <Link
                        href={`/products/${item.slug}`}
                        className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden border border-gray-200"
                      >
                        {item.image ? (
                          <Image
                            width={96}
                            height={96}
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <DynamicIcon
                              name="Package"
                              className="h-8 w-8 text-gray-400"
                            />
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-1">
                          {item.name}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          {(item.color || item.size) && (
                            <p className="text-sm flex items-center gap-2">
                              {item.color && (
                                <span className="flex items-center gap-1">
                                  {item.colorHexCode && (
                                    <div
                                      className="w-3 h-3 rounded-full border"
                                      style={{
                                        backgroundColor: item.colorHexCode,
                                      }}
                                    />
                                  )}
                                  <span>Color: {item.color}</span>
                                </span>
                              )}
                              {item.color && item.size && <span> • </span>}
                              {item.size && <span>Size: {item.size}</span>}
                            </p>
                          )}
                          {item.variant?.attributes?.length > 0 ||
                            item.variant?.color ||
                            item.variant?.size ? (
                            <p className="text-sm flex items-center gap-2">
                              {item.variant?.attributes &&
                                item.variant.attributes.length > 0 ? (
                                <span>
                                  {item.variant.attributes.map((attr, idx) => (
                                    <span key={attr.attributeValueId}>
                                      {attr.attribute}: {attr.value}
                                      {idx <
                                        item.variant.attributes.length - 1 &&
                                        " • "}
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                <>
                                  {item.variant?.color && (
                                    <span className="flex items-center gap-1">
                                      {item.variant.color?.hexCode && (
                                        <div
                                          className="w-3 h-3 rounded-full border"
                                          style={{
                                            backgroundColor:
                                              item.variant.color.hexCode,
                                          }}
                                        />
                                      )}
                                      <span>
                                        Color:{" "}
                                        {item.variant.color?.name ||
                                          item.variant.color}
                                      </span>
                                    </span>
                                  )}
                                  {item.variant?.color &&
                                    item.variant?.size && <span> • </span>}
                                  {item.variant?.size && (
                                    <span>
                                      Size:{" "}
                                      {item.variant.size?.name ||
                                        item.variant.size}
                                    </span>
                                  )}
                                </>
                              )}
                            </p>
                          ) : null}
                          <p>
                            {formatCurrency(item.price)} × {item.quantity} ={" "}
                            {formatCurrency(item.subtotal)}
                          </p>
                        </div>
                        {order.status === "DELIVERED" && (
                          <div className="mt-3 space-y-2">
                            {/* Show return status if return request exists - Check if returnRequest exists and has status */}
                            {item.returnRequest && item.returnRequest.id ? (
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <DynamicIcon
                                      name="RotateCcw"
                                      className="h-4 w-4 text-gray-600"
                                    />
                                    <span className="text-sm font-semibold text-gray-900">
                                      Return Request
                                    </span>
                                  </div>
                                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${item.returnRequest.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                    item.returnRequest.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                      item.returnRequest.status === "PROCESSING" ? "bg-blue-100 text-blue-800" :
                                        item.returnRequest.status === "COMPLETED" ? "bg-purple-100 text-purple-800" :
                                          "bg-yellow-100 text-yellow-800"
                                    }`}>
                                    {item.returnRequest.status}
                                  </span>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  {item.returnRequest.reason && (
                                    <p>
                                      <span className="font-medium">Reason:</span>{" "}
                                      {item.returnRequest.reason}
                                      {item.returnRequest.customReason && (
                                        <span> - {item.returnRequest.customReason}</span>
                                      )}
                                    </p>
                                  )}
                                  <p>
                                    <span className="font-medium">Requested on:</span>{" "}
                                    {formatDate(item.returnRequest.createdAt)}
                                  </p>
                                  {item.returnRequest.processedAt && (
                                    <p>
                                      <span className="font-medium">Processed on:</span>{" "}
                                      {formatDate(item.returnRequest.processedAt)}
                                    </p>
                                  )}
                                </div>
                                <Link
                                  href="/account/returns"
                                  className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
                                >
                                  View Return Details
                                  <DynamicIcon
                                    name="ArrowRight"
                                    className="h-3 w-3 ml-1"
                                  />
                                </Link>
                              </div>
                            ) : returnSettings?.isEnabled && (() => {
                              // Calculate days left for return from ORDER DATE (not delivery date)
                              // Admin ne jo days diye hain (returnWindowDays), wo order date se calculate hoga
                              const orderDate = new Date(order.date || order.createdAt);
                              const today = new Date();
                              // Set time to midnight for accurate day calculation
                              const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
                              const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                              const daysSinceOrder = Math.floor(
                                (todayOnly - orderDateOnly) / (1000 * 60 * 60 * 24)
                              );
                              const daysLeft = returnSettings.returnWindowDays - daysSinceOrder;
                              const canReturn = daysLeft > 0 && daysLeft <= returnSettings.returnWindowDays;

                              // Only show button if no return request exists and days are left
                              if (!canReturn) {
                                return (
                                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                      <DynamicIcon
                                        name="XCircle"
                                        className="h-4 w-4"
                                      />
                                      Return period expired
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowReturnForm(true);
                                  }}
                                  className="w-full sm:w-auto"
                                >
                                  <DynamicIcon
                                    name="RotateCcw"
                                    className="h-4 w-4 mr-2"
                                  />
                                  Request Return ({daysLeft} {daysLeft === 1 ? 'day' : 'days'} left)
                                </Button>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order summary - Right column on desktop */}
            <div className="space-y-5">
              {/* Order summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Order Summary</h2>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">{formatCurrency(order.subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    {parseFloat(order.shippingCost) > 0 ? (
                      <span className="font-medium text-gray-900">{formatCurrency(order.shippingCost)}</span>
                    ) : (
                      <span className="text-green-600 font-semibold">FREE</span>
                    )}
                  </div>
                  {parseFloat(order.codCharge) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>COD Surcharge</span>
                      <span className="font-medium text-gray-900">{formatCurrency(order.codCharge)}</span>
                    </div>
                  )}
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Discount</span>
                      <span>-{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  {(order.couponCode || order.couponDetails) && (
                    <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                      <div className="flex items-center text-green-700 text-xs font-semibold mb-1">
                        <DynamicIcon name="Tag" className="h-3.5 w-3.5 mr-1" />
                        Coupon: {order.couponCode || order.couponDetails?.code}
                      </div>
                      {order.couponDetails && (
                        <p className="text-xs text-green-600">
                          {order.couponDetails.discountType === "PERCENTAGE"
                            ? `${order.couponDetails.discountValue}% off`
                            : `${formatCurrency(order.couponDetails.discountValue)} off`}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 mt-1 flex justify-between">
                    <span className="font-bold text-gray-900 text-base">Total</span>
                    <span className="font-bold text-[#136C5B] text-xl">{formatCurrency(order.total)}</span>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Method</span>
                      <span className="font-medium text-gray-900">{order.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Status</span>
                      <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full ${getStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                    {order.paymentId && (
                      <div>
                        <span className="text-gray-500 text-xs">Payment ID</span>
                        <p className="font-mono text-xs text-gray-700 break-all mt-0.5">{order.paymentId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Shipping Address</h2>
                </div>
                <div className="p-5">
                  {order.shippingAddress ? (
                    <div className="text-sm space-y-1 text-gray-700">
                      <p className="font-semibold text-gray-900 text-base">{order.shippingAddress.name || ""}</p>
                      <p>{order.shippingAddress.street}</p>
                      <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                      <p className="text-gray-500">{order.shippingAddress.country}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No shipping address available</p>
                  )}
                </div>
              </div>

              {/* Order notes */}
              {order.notes && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Notes</h2>
                  <p className="text-sm text-gray-700">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Return Request Modal */}
        {showReturnForm && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Request Return</h2>
                  <button
                    onClick={() => {
                      setShowReturnForm(false);
                      setSelectedItem(null);
                      setReturnForm({
                        reason: "",
                        customReason: "",
                        images: [],
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <DynamicIcon name="X" className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium">{selectedItem.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(selectedItem.price)} ×{" "}
                    {selectedItem.quantity}
                  </p>
                </div>

                <form onSubmit={handleReturnRequest}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Return *
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={returnForm.reason}
                      onChange={(e) =>
                        setReturnForm({ ...returnForm, reason: e.target.value })
                      }
                      required
                    >
                      <option value="">Select a reason</option>
                      {returnReasons.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </div>

                  {returnForm.reason === "Other" && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Please specify *
                      </label>
                      <textarea
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        rows={3}
                        value={returnForm.customReason}
                        onChange={(e) =>
                          setReturnForm({
                            ...returnForm,
                            customReason: e.target.value,
                          })
                        }
                        required
                        placeholder="Please describe the reason for return"
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={submittingReturn}
                      className="flex-1"
                    >
                      {submittingReturn ? "Submitting..." : "Submit Request"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowReturnForm(false);
                        setSelectedItem(null);
                        setReturnForm({
                          reason: "",
                          customReason: "",
                          images: [],
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientOnly>
  );
}
