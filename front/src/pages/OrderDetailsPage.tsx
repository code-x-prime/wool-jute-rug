import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { orders } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Package,
  CreditCard,
  MapPin,
  Clock,
  User,
  Truck,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, debugData, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  interface OrderDetails {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    subTotal: string | number;
    shippingAmount: number;
    taxAmount: number;
    discount?: string | number;
    codCharge?: string | number;
    createdAt: string;
    updatedAt: string;
    cancelledAt?: string;
    cancelReason?: string;
    cancelledBy?: string;
    userId?: string;
    couponCode?: string;
    shippingAddress: {
      name?: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone?: string;
    };
    user: {
      name: string;
      email: string;
      phone?: string;
    };
    items: OrderItem[];
    updates?: OrderUpdate[];
    paymentGateway?: string;
    paymentMode?: string;
    paymentMethod?: string;
    razorpayPayment?: {
      paymentMethod: string;
      status: string;
      razorpayPaymentId?: string;
      razorpayOrderId?: string;
    };
    coupon?: {
      discountType: string;
      discountValue: number;
      description?: string;
    };
    tracking?: {
      carrier?: string;
      trackingNumber?: string;
      status?: string;
      estimatedDelivery?: string;
      updates?: OrderUpdate[];
    };
    shiprocket?: {
      orderId?: number;
      shipmentId?: number;
      awbCode?: string;
      courierName?: string;
      status?: string;
      trackingUrl?: string;
    };
    shippingCost?: string | number;
    total?: string | number;
  }

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    subtotal: number;
    imageUrl?: string;
    product?: {
      title: string;
      name: string;
      images: string[];
      imageUrl?: string;
    };
    variant?: {
      sku: string;
      flavor?: {
        name: string;
      };
      weight?: {
        value: number;
        unit: string;
      };
      attributes?: Array<{
        attributeValue?: {
          attribute?: { name?: string };
          value?: string;
        };
      }>;
      images?: Array<{
        url: string;
      }>;
    };
    returnRequest?: {
      id: string;
      status: string;
      reason: string;
      customReason?: string;
      createdAt: string;
      processedAt?: string;
    } | null;
  }

  interface OrderUpdate {
    id: string;
    status: string;
    timestamp: string;
    note?: string;
    location?: string;
    description?: string;
  }

  // Define fetchOrderDetails outside of useEffect so it can be reused
  const fetchOrderDetails = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const response = await orders.getOrderById(id);

      // Use the debug utility
      debugData("Order API Response", response, true);
      debugData("Order Data", response?.data?.data, true);

      if (response?.data?.success && response?.data?.data?.order) {
        // Fix: Access the order data correctly from response.data.data.order
        setOrderDetails(response.data.data.order);
      } else {
        setError(response?.data?.message || t('orders.actions.load_error'));
      }
    } catch (error: unknown) {
      console.error("Error fetching order details:", error);

      // Handle axios error properly
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number; data?: { message?: string } } };
        debugData("Error Response", axiosError.response, true);
        setError(
          `API Error (${axiosError.response.status}): ${axiosError.response.data?.message || "Unknown error"}`
        );
      } else if (error && typeof error === 'object' && 'request' in error) {
        const requestError = error as { request: unknown };
        debugData("Error Request", requestError.request, true);
        setError("Network error: No response received from server");
      } else if (error instanceof Error) {
        setError(`Error: ${error.message}`);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchOrderDetails();
  }, [id, fetchOrderDetails]);

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return t('orders.details.not_available');
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
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
      case "APPROVED": return "Approved";
      case "REJECTED": return "Rejected";
      default: return status;
    }
  };

  // Status timeline component
  const StatusTimeline = ({ currentStatus }: { currentStatus: string }) => {
    const steps = [
      { key: "PENDING", label: t('orders.status.placed'), icon: ShoppingCart },
      { key: "PROCESSING", label: t('orders.status.processing'), icon: Package },
      { key: "SHIPPED", label: t('orders.status.shipped'), icon: Truck },
      { key: "DELIVERED", label: t('orders.status.delivered'), icon: CheckCircle },
    ];

    // Handle cancelled or refunded orders
    if (currentStatus === "CANCELLED" || currentStatus === "REFUNDED") {
      return (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[var(--destructive)]/10 text-[var(--destructive)] rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-[var(--destructive)]">{getStatusLabel(currentStatus)}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {currentStatus === "CANCELLED" ? t('orders.status.cancelled') : t('orders.status.refunded')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    const currentStepIndex = steps.findIndex(step => step.key === currentStatus) >= 0
      ? steps.findIndex(step => step.key === currentStatus)
      : (currentStatus === "PAID" ? 1 : -1);

    return (
      <div className="w-full py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const IconComponent = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {index > 0 && (
                    <div className={cn(
                      "flex-1 h-0.5",
                      isCompleted ? 'bg-emerald-500' : 'bg-[var(--border-color)]'
                    )} />
                  )}

                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center mx-2",
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  )}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {index < steps.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5",
                      index < currentStepIndex ? 'bg-emerald-500' : 'bg-[var(--border-color)]'
                    )} />
                  )}
                </div>

                <div className="mt-3 text-center">
                  <p className={cn(
                    "text-xs font-medium",
                    isCompleted
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isCurrent
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--text-secondary)]'
                  )}>
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "CANCELLED":
        return "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/30";
      case "REFUNDED":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "RETURN_APPROVED":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "RETURN_COMPLETED":
        return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30";
      case "APPROVED":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "REJECTED":
        return "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/30";
      case "CREATED":
      case "PAID":
      case "CAPTURED":
        return "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30";
      default:
        return "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]";
    }
  };

  // Handle order status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;

    try {
      const response = await orders.updateOrderStatus(id, {
        status: newStatus,
      });

      if (response && response.data && response.data.success) {
        toast.success(t('orders.actions.status_update_success', { status: newStatus }));

        // Update the order status in the UI
        setOrderDetails((prev: OrderDetails | null) => ({
          ...prev!,
          status: newStatus,
        }));
      } else {
        toast.error(response.data?.message || t('orders.actions.status_update_error'));
      }
    } catch (error: unknown) {
      console.error("Error updating order status:", error);
      toast.error(t('orders.actions.status_update_error'));
    }
  };

  // Get image URL helper
  const getImageUrl = (image: string | string[] | undefined | null): string => {
    if (!image) return "/images/product-placeholder.png";

    // Handle array of images (take first one)
    if (Array.isArray(image)) {
      if (image.length === 0) return "/images/product-placeholder.png";
      const firstImage = image[0];
      if (typeof firstImage === "string") {
        return firstImage.startsWith("http")
          ? firstImage
          : `https://desirediv-storage.blr1.digitaloceanspaces.com/${firstImage}`;
      }
      return "/images/product-placeholder.png";
    }

    // Handle single image string
    if (typeof image === "string") {
      return image.startsWith("http")
        ? image
        : `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
    }

    return "/images/product-placeholder.png";
  };

  // Loading state
  if (isLoading && !orderDetails) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="mt-4 text-base text-[var(--text-secondary)]">
            {t('partners_tab.common.loading').replace('Partners', 'Order details').replace('partners', 'order details').replace('Partner', 'Order').replace('partner', 'order')}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !orderDetails) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FEF2F2] mb-4">
          <AlertTriangle className="h-8 w-8 text-[var(--destructive)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1.5">{t('reviews.messages.error_title')}</h2>
        <p className="text-center text-[var(--text-secondary)] mb-6">{error}</p>
        <Button
          variant="outline"
          className="border-[#4CAF50] text-[#2E7D32] hover:bg-[#E8F5E9]"
          onClick={() => {
            setError(null);
            setIsLoading(true);
            fetchOrderDetails();
          }}
        >
          {t('reviews.messages.try_again')}
        </Button>
      </div>
    );
  }

  // No order or empty order data, but not in error state
  if (
    !isLoading &&
    !error &&
    (!orderDetails || Object.keys(orderDetails).length === 0)
  ) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild className="mb-2">
          <Link to="/orders">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('orders.details.back_to_list')}
          </Link>
        </Button>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t('orders.details.not_found')}
            </h2>
            <p className="text-center text-[var(--text-secondary)] mb-4">
              {t('orders.details.not_found_desc')}
            </p>
            <Button
              onClick={() => {
                setIsLoading(true);
                fetchOrderDetails();
              }}
            >
              {t('reviews.messages.try_again')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fix access to order items (may need to adjust based on actual API response structure)
  // Early return if orderDetails is null
  if (!orderDetails) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <>
            <AlertTriangle className="h-16 w-16 text-[var(--text-secondary)]" />
            <h2 className="mt-4 text-xl font-semibold">{t('orders.details.not_found')}</h2>
            <p className="text-center text-[var(--text-secondary)]">
              {t('orders.details.not_found_desc')}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              asChild
            >
              <Link to="/orders">{t('orders.details.back_to_list')}</Link>
            </Button>
          </>
        </div>
      </div>
    );
  }

  const orderItems = orderDetails.items || [];

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="mb-3 border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
            >
              <Link to="/orders">
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('orders.details.back_to_list')}
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              {t('orders.details.title', { number: orderDetails.orderNumber })}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5">
              {t('orders.details.placed_on', { date: formatDate(orderDetails.createdAt) })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge
              className={cn(
                "text-xs font-medium border px-3 py-1",
                getStatusBadgeClass(orderDetails.status)
              )}
            >
              {getStatusLabel(orderDetails.status)}
            </Badge>

            {/* Status update buttons */}
            {orderDetails.status !== "DELIVERED" &&
              orderDetails.status !== "CANCELLED" &&
              orderDetails.status !== "REFUNDED" && (
                <div className="flex flex-wrap gap-2">
                  {orderDetails.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                      onClick={() => handleStatusUpdate("PROCESSING")}
                    >
                      {t('orders.actions.mark_processing')}
                    </Button>
                  )}

                  {(orderDetails.status === "PROCESSING" ||
                    orderDetails.status === "PAID") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                        onClick={() => handleStatusUpdate("SHIPPED")}
                      >
                        {t('orders.actions.mark_shipped')}
                      </Button>
                    )}

                  {orderDetails.status === "SHIPPED" && (
                    <Button
                      size="sm"
                      className=""
                      onClick={() => handleStatusUpdate("DELIVERED")}
                    >
                      {t('orders.actions.mark_delivered')}
                    </Button>
                  )}

                  {(orderDetails.status === "PENDING" ||
                    orderDetails.status === "PROCESSING") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                        onClick={() => handleStatusUpdate("PAID")}
                      >
                        {t('orders.actions.mark_paid')}
                      </Button>
                    )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[var(--destructive)] text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                    onClick={() => handleStatusUpdate("CANCELLED")}
                  >
                    {t('orders.actions.cancel')}
                  </Button>
                </div>
              )}
          </div>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Status Timeline */}
        <div className="lg:col-span-3">
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
                <Truck className="mr-2 h-5 w-5 text-[var(--accent)]" />
                {t('orders.details.status_timeline')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <StatusTimeline currentStatus={orderDetails.status} />
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
                <Package className="mr-2 h-5 w-5 text-[var(--accent)]" />
                {t('orders.details.items')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="divide-y divide-[var(--border-color)]">
                {orderItems.map((item: OrderItem) => (
                  <div key={item.id} className="py-4 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden flex-shrink-0">
                      <img
                        src={getImageUrl(
                          item.imageUrl ||
                          item.product?.imageUrl ||
                          (Array.isArray(item.product?.images) ? item.product.images[0] : null) ||
                          (item.variant?.images?.[0]?.url) ||
                          null
                        )}
                        alt={item.product?.name || "Product"}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src =
                            "/images/product-placeholder.png";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--text-primary)] mb-1">
                        {item.product?.name || item.product?.title || "Product"}
                      </p>
                      {(item.variant?.sku || (item.variant?.attributes && (item.variant?.attributes?.length ?? 0) > 0)) && (
                        <p className="text-xs text-[var(--text-secondary)] mb-2">
                          {t('orders.details.sku')}: {item.variant?.sku || t('orders.details.not_available')}
                        </p>
                      )}
                      {(item.variant?.flavor || (item.variant?.attributes && (item.variant?.attributes?.length ?? 0) > 0)) && (
                        <div className="text-sm text-[var(--text-primary)]">
                          {item.variant?.flavor && (
                            <>
                              <span className="text-[var(--text-secondary)]">{t('orders.details.flavor')}: </span>
                              {item.variant.flavor.name}
                            </>
                          )}
                          {item.variant?.weight && (
                            <>
                              {item.variant?.flavor && <span className="text-[var(--text-secondary)] ml-2">|</span>}
                              <span className="text-[var(--text-secondary)] ml-2">{t('orders.details.weight')}: </span>
                              {`${item.variant.weight.value}${item.variant.weight.unit}`}
                            </>
                          )}
                          {!item.variant?.flavor && (item.variant?.attributes?.length ?? 0) > 0 && (
                            <span className="text-[var(--text-secondary)]">
                              {(item.variant?.attributes ?? [])
                                .map((a: { attributeValue?: { attribute?: { name?: string }; value?: string } }) =>
                                  a.attributeValue?.attribute?.name && a.attributeValue?.value
                                    ? `${a.attributeValue.attribute.name}: ${a.attributeValue.value}`
                                    : null
                                )
                                .filter(Boolean)
                                .join(" • ")}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Return Request Badge */}
                      {item.returnRequest && (
                        <div className="mt-2">
                          <Badge
                            className={cn(
                              "text-xs font-medium border",
                              getStatusBadgeClass(item.returnRequest.status)
                            )}
                          >
                            Return: {getStatusLabel(item.returnRequest.status)}
                          </Badge>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            Reason: {item.returnRequest.reason}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-[var(--text-secondary)] mb-1">{t('orders.details.price')}</p>
                      <p className="font-semibold text-[var(--text-primary)] mb-3">
                        {formatCurrency(item.price)}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] mb-1">{t('orders.details.qty')}</p>
                      <p className="font-semibold text-[var(--text-primary)] mb-3">
                        {item.quantity}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] mb-1">{t('orders.details.total')}</p>
                      <p className="font-bold text-lg text-[var(--text-primary)]">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
                <User className="mr-2 h-5 w-5 text-[var(--accent)]" />
                {t('orders.details.customer_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{t('return_requests.common.name')}</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {orderDetails.user?.name || "Guest"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{t('return_requests.common.email')}</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {orderDetails.user?.email || t('orders.details.not_available')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{t('partners_tab.common.number')}</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {orderDetails.user?.phone || t('orders.details.not_available')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Information (if order is cancelled) */}
          {orderDetails.status === "CANCELLED" && (
            <Card className="bg-[#FEF2F2] border-2 border-[#FEE2E2] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-[var(--destructive)] flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  {t('orders.details.cancellation_info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">{t('orders.details.cancelled_at')}</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {orderDetails.cancelledAt && formatDate(orderDetails.cancelledAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">{t('orders.details.reason')}</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {orderDetails.cancelReason || t('orders.details.no_reason')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">{t('orders.details.cancelled_by')}</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {orderDetails.cancelledBy === orderDetails.userId
                        ? t('orders.details.by_customer')
                        : t('orders.details.by_admin')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shiprocket Shipping */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
                <Truck className="mr-2 h-5 w-5 text-[var(--accent)]" />
                Shipping (Shiprocket)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {orderDetails.shiprocket?.orderId || orderDetails.shiprocket?.awbCode ? (
                <div className="space-y-3">
                  {orderDetails.shiprocket.orderId && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Shiprocket Order ID</p>
                      <p className="font-mono text-sm text-[var(--text-primary)]">{orderDetails.shiprocket.orderId}</p>
                    </div>
                  )}
                  {orderDetails.shiprocket.shipmentId && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Shipment ID</p>
                      <p className="font-mono text-sm text-[var(--text-primary)]">{orderDetails.shiprocket.shipmentId}</p>
                    </div>
                  )}
                  {orderDetails.shiprocket.awbCode && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">AWB Number</p>
                      <p className="font-mono text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-color)]">
                        {orderDetails.shiprocket.awbCode}
                      </p>
                    </div>
                  )}
                  {orderDetails.shiprocket.courierName && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Courier</p>
                      <p className="font-medium text-[var(--text-primary)]">{orderDetails.shiprocket.courierName}</p>
                    </div>
                  )}
                  {orderDetails.shiprocket.status && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Status</p>
                      <Badge className={cn("text-xs font-medium border", getStatusBadgeClass(orderDetails.shiprocket.status))}>
                        {orderDetails.shiprocket.status}
                      </Badge>
                    </div>
                  )}
                  {orderDetails.shiprocket.trackingUrl && (
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => window.open(orderDetails.shiprocket!.trackingUrl!, "_blank")}
                      >
                        Open Tracking
                      </Button>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={async () => {
                      try {
                        const res = await orders.syncOrderToShiprocket(id!);
                        if (res?.data?.success) {
                          toast.success("Synced with Shiprocket");
                          fetchOrderDetails();
                        } else {
                          toast.error(res?.data?.message || "Sync failed");
                        }
                      } catch (err: unknown) {
                        toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Sync failed");
                      }
                    }}
                  >
                    Sync with Shiprocket
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  Enable Shiprocket in Site Settings to auto-create shipments for new orders.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
                <CreditCard className="mr-2 h-5 w-5 text-[var(--accent)]" />
                {t('orders.details.payment_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{t('orders.details.method')}</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {orderDetails.paymentMethod || orderDetails.razorpayPayment?.paymentMethod || "ONLINE"}
                  </p>
                </div>
                {orderDetails.paymentGateway && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">{t('orders.details.gateway')}</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {orderDetails.paymentGateway}
                      {orderDetails.paymentMode && (
                        <span className="ml-2 text-xs text-[var(--text-secondary)]">
                          ({orderDetails.paymentMode})
                        </span>
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{t('partners_tab.common.status')}</p>
                  <Badge
                    className={cn(
                      "text-xs font-medium border",
                      orderDetails.razorpayPayment?.status === "CAPTURED" ||
                        orderDetails.razorpayPayment?.status === "PAID" ||
                        orderDetails.status === "PAID"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    )}
                  >
                    {orderDetails.razorpayPayment?.status || getStatusLabel(orderDetails.status) || t('orders.details.not_available')}
                  </Badge>
                </div>
                {orderDetails.razorpayPayment?.razorpayPaymentId && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">{t('orders.details.transaction_id')}</p>
                    <p className="font-mono text-xs text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-color)]">
                      {orderDetails.razorpayPayment.razorpayPaymentId}
                    </p>
                  </div>
                )}
                {orderDetails.razorpayPayment?.razorpayOrderId && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">{t('orders.details.order_id')}</p>
                    <p className="font-mono text-xs text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-color)]">
                      {orderDetails.razorpayPayment.razorpayOrderId}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-[var(--accent)]" />
                {t('orders.details.shipping_address')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {orderDetails.shippingAddress ? (
                <div className="space-y-2">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {orderDetails.shippingAddress.name}
                  </p>
                  <p className="text-[var(--text-primary)]">{orderDetails.shippingAddress.street}</p>
                  <p className="text-[var(--text-primary)]">
                    {orderDetails.shippingAddress.city},{" "}
                    {orderDetails.shippingAddress.state}{" "}
                    {orderDetails.shippingAddress.postalCode}
                  </p>
                  <p className="text-[var(--text-primary)]">{orderDetails.shippingAddress.country}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Phone: {orderDetails.shippingAddress.phone || t('orders.details.not_available')}
                  </p>
                </div>
              ) : (
                <p className="text-[var(--text-secondary)]">No shipping address found</p>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5 text-[var(--accent)]" />
                {t('orders.details.total')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{t('orders.details.subtotal')}:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(orderDetails.subTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{t('orders.details.tax')} (0%):</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{t('orders.details.shipping')}:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(
                      typeof orderDetails.shippingCost === 'string'
                        ? parseFloat(orderDetails.shippingCost)
                        : (orderDetails.shippingCost || 0)
                    )}
                  </span>
                </div>
                {(typeof orderDetails.codCharge === 'string' ? parseFloat(orderDetails.codCharge) : (orderDetails.codCharge || 0)) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">COD Surcharge:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(
                        typeof orderDetails.codCharge === 'string'
                          ? parseFloat(orderDetails.codCharge)
                          : (orderDetails.codCharge || 0)
                      )}
                    </span>
                  </div>
                )}
                {(typeof orderDetails.discount === 'string' ? parseFloat(orderDetails.discount) : (orderDetails.discount || 0)) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">Discount:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      -{formatCurrency(
                        typeof orderDetails.discount === 'string'
                          ? parseFloat(orderDetails.discount)
                          : (orderDetails.discount || 0)
                      )}
                    </span>
                  </div>
                )}
                {orderDetails.couponCode && (
                  <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium mb-1 text-sm">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Coupon applied: {orderDetails.couponCode}
                    </div>
                    {orderDetails.coupon && (
                      <div className="text-sm text-emerald-600 dark:text-emerald-400">
                        {orderDetails.coupon.discountType === "PERCENTAGE" ? (
                          <span>
                            {orderDetails.coupon.discountValue}% off the order total
                          </span>
                        ) : (
                          <span>
                            {formatCurrency(orderDetails.coupon.discountValue)} off the order total
                          </span>
                        )}
                        {orderDetails.coupon.description && (
                          <p className="text-xs mt-1 text-[var(--text-secondary)]">
                            {orderDetails.coupon.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between border-t border-[var(--border-color)] pt-3 font-bold text-lg">
                  <span className="text-[var(--text-primary)]">{t('orders.details.grand_total')}:</span>
                  <span className="text-[var(--text-primary)]">
                    {formatCurrency(
                      orderDetails.total ||
                      ((typeof orderDetails.subTotal === 'string' ? parseFloat(orderDetails.subTotal) : orderDetails.subTotal) +
                        (typeof orderDetails.shippingCost === 'string' ? parseFloat(orderDetails.shippingCost) : (orderDetails.shippingCost || 0)) +
                        (typeof orderDetails.codCharge === 'string' ? parseFloat(orderDetails.codCharge) : (orderDetails.codCharge || 0)) -
                        (typeof orderDetails.discount === 'string' ? parseFloat(orderDetails.discount) : (orderDetails.discount || 0)))
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Info */}
          {orderDetails.status === "SHIPPED" ||
            orderDetails.status === "DELIVERED" ? (
            <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
                  <Truck className="mr-2 h-5 w-5 text-[var(--accent)]" />
                  Tracking Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {orderDetails.tracking ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Carrier</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {orderDetails.tracking.carrier || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Tracking Number</p>
                      <p className="font-mono text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-color)]">
                        {orderDetails.tracking.trackingNumber || t('orders.details.not_available')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{t('partners_tab.common.status')}</p>
                      <Badge
                        className={cn(
                          "text-xs font-medium border",
                          getStatusBadgeClass(
                            orderDetails.tracking?.status || orderDetails.status
                          )
                        )}
                      >
                        {getStatusLabel(orderDetails.tracking?.status || orderDetails.status)}
                      </Badge>
                    </div>
                    {orderDetails.tracking.estimatedDelivery && (
                      <div>
                        <p className="text-xs text-[var(--text-secondary)] mb-1">Estimated Delivery</p>
                        <p className="font-medium text-[var(--text-primary)]">
                          {formatDate(orderDetails.tracking.estimatedDelivery)}
                        </p>
                      </div>
                    )}

                    {/* Tracking Updates */}
                    {orderDetails.tracking.updates &&
                      orderDetails.tracking.updates.length > 0 && (
                        <div className="mt-6">
                          <h4 className="mb-3 font-semibold text-[var(--text-primary)]">Tracking Updates</h4>
                          <div className="space-y-3">
                            {orderDetails.tracking.updates.map(
                              (update: OrderUpdate, index: number) => (
                                <div
                                  key={index}
                                  className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
                                    <span className="text-sm text-[var(--text-secondary)]">
                                      {formatDate(update.timestamp)}
                                    </span>
                                  </div>
                                  <p className="font-medium text-[var(--text-primary)] mb-1">
                                    {update.status}
                                  </p>
                                  {update.location && (
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      {update.location}
                                    </p>
                                  )}
                                  {update.description && (
                                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                                      {update.description}
                                    </p>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] mb-4">
                      <Truck className="h-8 w-8 text-[var(--text-secondary)]" />
                    </div>
                    <p className="font-semibold text-[var(--text-primary)] mb-1.5">Shipping in progress</p>
                    <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-sm mx-auto">
                      {orderDetails.status === "DELIVERED"
                        ? "This order has been marked as delivered, but no detailed tracking information is available."
                        : "This order has been shipped, but detailed tracking information is not yet available."}
                    </p>
                    <Badge
                      className={cn(
                        "text-xs font-medium border",
                        getStatusBadgeClass(orderDetails.status)
                      )}
                    >
                      {getStatusLabel(orderDetails.status)}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Shiprocket Information */}
          {orderDetails.shiprocket && (
            <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
                  <Truck className="mr-2 h-5 w-5 text-[var(--accent)]" />
                  Shiprocket Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  {orderDetails.shiprocket.orderId && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Shiprocket Order ID</p>
                      <p className="font-mono text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-color)]">
                        {orderDetails.shiprocket.orderId}
                      </p>
                    </div>
                  )}
                  {orderDetails.shiprocket.shipmentId && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Shipment ID</p>
                      <p className="font-mono text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-color)]">
                        {orderDetails.shiprocket.shipmentId}
                      </p>
                    </div>
                  )}
                  {orderDetails.shiprocket.awbCode && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">AWB Code</p>
                      <p className="font-mono text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-color)]">
                        {orderDetails.shiprocket.awbCode}
                      </p>
                    </div>
                  )}
                  {orderDetails.shiprocket.courierName && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Courier</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {orderDetails.shiprocket.courierName}
                      </p>
                    </div>
                  )}
                  {orderDetails.shiprocket.status && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Shiprocket Status</p>
                      <Badge
                        className={cn(
                          "text-xs font-medium border",
                          getStatusBadgeClass(orderDetails.shiprocket.status)
                        )}
                      >
                        {orderDetails.shiprocket.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
