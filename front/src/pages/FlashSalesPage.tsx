import { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { flashSales, products } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import MultiSelectCombo from "@/components/MultiSelectCombo";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Zap,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit,
  AlertTriangle,
  CalendarIcon,
  Percent,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context";
import { cn } from "@/lib/utils";

interface FlashSaleItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  discountPercentage: number;
  maxQuantity?: number;
  soldCount: number;
  isActive: boolean;
  productCount: number;
  products?: Array<{
    id: string;
    productId: string;
    product: {
      id: string;
      name: string;
      slug: string;
      image: string | null;
    };
  }>;
}

export default function FlashSalesPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewFlashSale = location.pathname.includes("/new");
  const isEditFlashSale = !!id;

  return (
    <>
      {isNewFlashSale && <FlashSaleForm mode="create" />}
      {isEditFlashSale && <FlashSaleForm mode="edit" flashSaleId={id} />}
      {!isNewFlashSale && !isEditFlashSale && <FlashSalesList />}
    </>
  );
}

function FlashSalesList() {
  const { t } = useLanguage();
  const [flashSalesList, setFlashSalesList] = useState<FlashSaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await flashSales.getFlashSales();
        if (response.data.success) {
          setFlashSalesList(response.data.data?.flashSales || []);
        } else {
          const errorMsg =
            response.data.message || "Failed to fetch flash sales";
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } catch (error: any) {
        console.error("Error fetching flash sales:", error);
        const errorMsg =
          error.response?.data?.message || t("flash_sales.messages.load_error");
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFlashSales();
  }, []);

  const handleDelete = async (flashSaleId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }
    try {
      const response = await flashSales.deleteFlashSale(flashSaleId);
      if (response.data.success) {
        toast.success(t("flash_sales.messages.delete_success"));
        setFlashSalesList(
          flashSalesList.filter((sale) => sale.id !== flashSaleId)
        );
      } else {
        toast.error(response.data.message || t("flash_sales.messages.delete_error"));
      }
    } catch (error: any) {
      console.error("Error deleting flash sale:", error);
      toast.error(t("flash_sales.messages.delete_error_generic"));
    }
  };

  const handleToggleStatus = async (
    flashSaleId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await flashSales.toggleFlashSaleStatus(flashSaleId);
      if (response.data.success) {
        toast.success(
          !currentStatus ? t("flash_sales.messages.toggle_success_activated") : t("flash_sales.messages.toggle_success_deactivated")
        );
        setFlashSalesList(
          flashSalesList.map((sale) =>
            sale.id === flashSaleId
              ? { ...sale, isActive: !currentStatus }
              : sale
          )
        );
      } else {
        toast.error(response.data.message || t("flash_sales.messages.toggle_error"));
      }
    } catch (error: any) {
      console.error("Error toggling status:", error);
      toast.error(t("flash_sales.messages.toggle_error_generic"));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatus = (sale: FlashSaleItem) => {
    const now = new Date();
    const start = new Date(sale.startTime);
    const end = new Date(sale.endTime);

    if (!sale.isActive) return { text: t("flash_sales.status.inactive"), color: "text-gray-500" };
    if (now < start) return { text: t("flash_sales.status.upcoming"), color: "text-blue-600" };
    if (now >= start && now <= end)
      return { text: t("flash_sales.status.active"), color: "text-green-600" };
    return { text: t("flash_sales.status.ended"), color: "text-red-600" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="mt-4 text-base text-[var(--text-secondary)]">{t("flash_sales.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-[var(--destructive)]/10 border-[var(--destructive)]/30 shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[var(--destructive)] flex-shrink-0" />
          <p className="text-[var(--destructive)]">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              {t("flash_sales.title")}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5">
              {t("flash_sales.subtitle")}
            </p>
          </div>
          <Button
            asChild

          >
            <Link to="/flash-sales/new">
              <Plus className="h-4 w-4 mr-2" />
              {t("flash_sales.create_button")}
            </Link>
          </Button>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      {flashSalesList.length === 0 ? (
        <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] mb-4">
              <Zap className="h-8 w-8 text-[var(--text-secondary)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">
              {t("flash_sales.empty.title")}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
              {t("flash_sales.empty.description")}
            </p>
            <Button
              asChild

            >
              <Link to="/flash-sales/new">
                <Plus className="h-4 w-4 mr-2" />
                {t("flash_sales.create_button")}
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {flashSalesList.map((sale) => {
            const status = getStatus(sale);
            const statusBadgeClass =
              status.text === "Active"
                ? "bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/30"
                : status.text === "Upcoming"
                  ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)]"
                  : status.text === "Ended"
                    ? "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/30"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]";
            return (
              <Card
                key={sale.id}
                className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/20">
                          <Zap className="h-5 w-5 text-[var(--accent)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                            {sale.name}
                          </h3>
                        </div>
                      </div>
                      <div className="mb-3">
                        <Badge className={`${statusBadgeClass} text-xs font-medium`}>
                          {status.text}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{t("flash_sales.card.discount")}</p>
                      <p className="font-bold text-[var(--destructive)] text-lg">
                        {sale.discountPercentage}% OFF
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{t("flash_sales.card.products")}</p>
                      <p className="font-bold text-[var(--text-primary)] text-lg">
                        {sale.productCount}
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{t("flash_sales.card.sold")}</p>
                      <p className="font-bold text-[var(--text-primary)] text-lg">
                        {sale.soldCount}
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{t("flash_sales.card.max_quantity")}</p>
                      <p className="font-bold text-[var(--text-primary)] text-lg">
                        {sale.maxQuantity || "∞"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{t("flash_sales.card.start")} {formatDate(sale.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Clock className="h-4 w-4" />
                      <span>{t("flash_sales.card.end")} {formatDate(sale.endTime)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-[var(--bg-secondary)]"
                      asChild
                    >
                      <Link to={`/flash-sales/${sale.id}`}>
                        <Edit className="h-4 w-4 text-[var(--text-primary)]" />
                      </Link>
                    </Button>
                    <Switch
                      checked={sale.isActive}
                      onCheckedChange={() =>
                        handleToggleStatus(sale.id, sale.isActive)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-[var(--destructive)]/10"
                      onClick={() => handleDelete(sale.id, sale.name)}
                    >
                      <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FlashSaleForm({
  mode,
  flashSaleId,
}: {
  mode: "create" | "edit";
  flashSaleId?: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(mode === "edit");
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    endTime: "",
    discountPercentage: "",
    maxQuantity: "",
    isActive: true,
    productIds: [] as string[],
  });
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await products.getProducts({ limit: 1000 });
        if (response.data.success) {
          const productsList = response.data.data?.products || [];
          setAvailableProducts(productsList);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (mode === "edit" && flashSaleId) {
      const fetchFlashSale = async () => {
        try {
          setIsFetching(true);
          const response = await flashSales.getFlashSaleById(flashSaleId);
          if (response.data.success) {
            const sale = response.data.data.flashSale;
            setFormData({
              name: sale.name,
              startTime: new Date(sale.startTime).toISOString().slice(0, 16),
              endTime: new Date(sale.endTime).toISOString().slice(0, 16),
              discountPercentage: sale.discountPercentage.toString(),
              maxQuantity: sale.maxQuantity?.toString() || "",
              isActive: sale.isActive,
              productIds: sale.products?.map((p: any) => p.productId) || [],
            });
          }
        } catch (error: any) {
          toast.error(
            error.response?.data?.message || t("flash_sales.messages.load_sale_error")
          );
        } finally {
          setIsFetching(false);
        }
      };
      fetchFlashSale();
    }
  }, [mode, flashSaleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startTime || !formData.endTime) {
      toast.error(t("flash_sales.messages.fill_dates"));
      return;
    }
    setIsLoading(true);

    try {
      const data = {
        name: formData.name,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        discountPercentage: parseFloat(formData.discountPercentage),
        maxQuantity: formData.maxQuantity
          ? parseInt(formData.maxQuantity)
          : undefined,
        isActive: formData.isActive,
        productIds: formData.productIds,
      };

      let response;
      if (mode === "create") {
        response = await flashSales.createFlashSale(data);
      } else {
        response = await flashSales.updateFlashSale(flashSaleId!, data);
      }

      if (response.data.success) {
        toast.success(
          mode === "create" ? t("flash_sales.messages.create_success") : t("flash_sales.messages.update_success")
        );
        navigate("/flash-sales");
      } else {
        toast.error(response.data.message || (mode === "create" ? t("flash_sales.messages.create_error") : t("flash_sales.messages.update_error")));
      }
    } catch (error: any) {
      console.error(`Error ${mode}ing flash sale:`, error);
      toast.error(
        error.response?.data?.message || t("flash_sales.messages.save_error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="mt-4 text-base text-[var(--text-secondary)]">{t("flash_sales.loading_sale")}</p>
        </div>
      </div>
    );
  }

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
              <Link to="/flash-sales">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("flash_sales.back")}
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              {mode === "create" ? t("flash_sales.create_title") : t("flash_sales.edit_title")}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5">
              {mode === "create"
                ? t("flash_sales.create_description")
                : t("flash_sales.edit_description")}
            </p>
          </div>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
            {t("flash_sales.form.info_title")}
          </CardTitle>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t("flash_sales.form.info_description")}
          </p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="px-6 pb-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-[var(--text-primary)]">
                  {t("flash_sales.form.name_label")} <span className="text-[var(--destructive)]">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("flash_sales.form.name_placeholder")}
                  required
                  className="border-[var(--border-color)] focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="discountPercentage"
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  {t("flash_sales.form.discount_label")} <span className="text-[var(--destructive)]">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="discountPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discountPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountPercentage: e.target.value,
                      })
                    }
                    placeholder={t("flash_sales.form.discount_placeholder")}
                    required
                    className="border-[var(--border-color)] focus:border-primary pr-10"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--text-primary)]">
                  {t("flash_sales.form.start_time_label")} <span className="text-[var(--destructive)]">*</span>
                </Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal border-[var(--border-color)] hover:bg-[var(--bg-secondary)]",
                          !formData.startTime && "text-[var(--text-secondary)]"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-[var(--text-secondary)]" />
                        {formData.startTime
                          ? format(new Date(formData.startTime), "PPP p")
                          : t("flash_sales.form.select_start")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[var(--bg-card)] border-[var(--border-color)]" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.startTime ? new Date(formData.startTime) : undefined}
                        onSelect={(d) => {
                          if (d) {
                            const t = formData.startTime ? new Date(formData.startTime) : new Date();
                            d.setHours(t.getHours(), t.getMinutes(), 0, 0);
                            const pad = (n: number) => String(n).padStart(2, "0");
                            const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                            setFormData({ ...formData, startTime: local });
                          }
                        }}
                        initialFocus
                      />
                      <div className="p-3 border-t border-[var(--border-color)]">
                        <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">{t("flash_sales.form.time")}</Label>
                        <Input
                          type="time"
                          value={formData.startTime ? formData.startTime.slice(11, 16) : "00:00"}
                          onChange={(e) => {
                            const pad = (n: number) => String(n).padStart(2, "0");
                            const now = new Date();
                            const datePart = formData.startTime ? formData.startTime.slice(0, 11) : `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T`;
                            setFormData({ ...formData, startTime: datePart + e.target.value });
                          }}
                          className="border-[var(--border-color)]"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--text-primary)]">
                  {t("flash_sales.form.end_time_label")} <span className="text-[var(--destructive)]">*</span>
                </Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal border-[var(--border-color)] hover:bg-[var(--bg-secondary)]",
                          !formData.endTime && "text-[var(--text-secondary)]"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-[var(--text-secondary)]" />
                        {formData.endTime
                          ? format(new Date(formData.endTime), "PPP p")
                          : t("flash_sales.form.select_end")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[var(--bg-card)] border-[var(--border-color)]" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.endTime ? new Date(formData.endTime) : undefined}
                        onSelect={(d) => {
                          if (d) {
                            const t = formData.endTime ? new Date(formData.endTime) : new Date();
                            d.setHours(t.getHours(), t.getMinutes(), 0, 0);
                            const pad = (n: number) => String(n).padStart(2, "0");
                            const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                            setFormData({ ...formData, endTime: local });
                          }
                        }}
                        disabled={(d) => formData.startTime ? d < new Date(formData.startTime) : false}
                        initialFocus
                      />
                      <div className="p-3 border-t border-[var(--border-color)]">
                        <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">{t("flash_sales.form.time")}</Label>
                        <Input
                          type="time"
                          value={formData.endTime ? formData.endTime.slice(11, 16) : "23:59"}
                          onChange={(e) => {
                            const pad = (n: number) => String(n).padStart(2, "0");
                            const now = new Date();
                            const datePart = formData.endTime ? formData.endTime.slice(0, 11) : `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T`;
                            setFormData({ ...formData, endTime: datePart + e.target.value });
                          }}
                          className="border-[var(--border-color)]"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="maxQuantity"
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  {t("flash_sales.form.max_quantity_label")}
                </Label>
                <Input
                  id="maxQuantity"
                  type="number"
                  min="1"
                  value={formData.maxQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, maxQuantity: e.target.value })
                  }
                  placeholder={t("flash_sales.form.max_quantity_placeholder")}
                  className="border-[var(--border-color)] focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="isActive"
                    className="text-sm font-medium text-[var(--text-primary)]"
                  >
                    {t("flash_sales.form.active_status_label")}
                  </Label>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t("flash_sales.form.active_status_hint")}
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[var(--text-primary)]">
                {t("flash_sales.form.products_label")} <span className="text-[var(--destructive)]">*</span>
              </Label>
              <MultiSelectCombo
                items={availableProducts.map((p) => ({
                  id: p.id,
                  name: p.name,
                }))}
                selectedIds={formData.productIds}
                onChange={(ids: string[]) => {
                  setFormData({
                    ...formData,
                    productIds: ids,
                  });
                }}
                placeholder={t("flash_sales.form.products_placeholder")}
              />
              <p className="text-xs text-[var(--text-secondary)]">
                <span>
                  {formData.productIds.length > 0
                    ? t("flash_sales.form.products_selected").replace("{count}", String(formData.productIds.length))
                    : t("flash_sales.form.products_placeholder")}
                </span>
              </p>
            </div>
          </CardContent>
          <CardFooter className="px-6 pb-6 pt-0 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
              onClick={() => navigate("/flash-sales")}
            >
              {t("flash_sales.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? t("flash_sales.creating") : t("flash_sales.updating")}
                </>
              ) : mode === "create" ? (
                t("flash_sales.create_sale")
              ) : (
                t("flash_sales.update_sale")
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
