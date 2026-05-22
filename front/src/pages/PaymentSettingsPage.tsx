import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  CreditCard,
  Wallet,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function PaymentSettingsPage() {
  const { admin } = useAuth();
  const { t } = useLanguage();
  const [cashEnabled, setCashEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [codCharge, setCodCharge] = useState<number>(0);
  const [hasRazorpayKeys, setHasRazorpayKeys] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPaymentSettings();
    fetchPaymentGatewaySettings();
  }, [admin]);

  // Listen for gateway settings updates
  useEffect(() => {
    const handleGatewayUpdate = () => {
      fetchPaymentGatewaySettings();
    };
    window.addEventListener("paymentGatewayUpdated", handleGatewayUpdate);
    return () => {
      window.removeEventListener("paymentGatewayUpdated", handleGatewayUpdate);
    };
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const response = await api.get("/api/admin/payment-settings");

      if (response.data.success) {
        setCashEnabled(response.data.data.cashEnabled ?? true);
        setRazorpayEnabled(response.data.data.razorpayEnabled ?? false);
        setCodCharge(response.data.data.codCharge ?? 0);
      }
    } catch (error: any) {
      console.error("Error fetching payment settings:", error);
    }
  };

  const fetchPaymentGatewaySettings = async () => {
    try {
      setIsLoading(true);
      // Check PaymentGatewaySettings (per-admin) first
      let hasRazorpay = false;
      if (admin) {
        const response = await api.get(`/api/admin/payment-gateway-settings/${admin.id}`);
        if (response.data.success) {
          const settings = response.data.data || [];
          const razorpaySetting = settings.find((s: any) => s.gateway === "RAZORPAY");
          hasRazorpay = !!(razorpaySetting && razorpaySetting.isActive && razorpaySetting.razorpayKeyId);
        }
      }
      // Also check SiteSettings (Razorpay can be configured there)
      if (!hasRazorpay) {
        const siteRes = await api.get("/api/admin/site-settings");
        if (siteRes.data.success && siteRes.data.data?.settings) {
          const s = siteRes.data.data.settings;
          hasRazorpay = !!(s.razorpayEnabled && s.razorpayKeyId);
        }
      }
      setHasRazorpayKeys(hasRazorpay);
    } catch (error: any) {
      console.error("Error fetching payment gateway settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate that at least one payment method is enabled
    if (!cashEnabled && !razorpayEnabled) {
      toast.error(t('payment_settings.messages.at_least_one'));
      return;
    }

    try {
      setIsSaving(true);
      const response = await api.patch("/api/admin/payment-settings", {
        cashEnabled,
        razorpayEnabled,
        codCharge: parseFloat(codCharge.toString()) || 0,
      });

      if (response.data.success) {
        toast.success(t('payment_settings.messages.save_success'));
        // Refresh gateway settings to update enabled status
        fetchPaymentGatewaySettings();
      } else {
        toast.error(
          response.data.message || t('payment_settings.messages.save_error')
        );
      }
    } catch (error: any) {
      console.error("Error updating payment settings:", error);
      const errorMessage =
        error.response?.data?.message || t('payment_settings.messages.save_error');
      toast.error(errorMessage);

      // If validation error, reset to previous values
      if (error.response?.status === 400) {
        fetchPaymentSettings();
        fetchPaymentGatewaySettings();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCashToggle = (checked: boolean) => {
    // If unchecking cash and no other payment method is enabled, prevent it
    if (!checked && !razorpayEnabled) {
      toast.error(t('payment_settings.messages.at_least_one'));
      return;
    }
    setCashEnabled(checked);
  };

  const handleRazorpayToggle = (checked: boolean) => {
    if (!hasRazorpayKeys) {
      toast.error(t('payment_settings.messages.razorpay_required'));
      return;
    }
    // If unchecking razorpay and cash is also disabled, prevent it
    if (!checked && !cashEnabled) {
      toast.error(t('payment_settings.messages.at_least_one'));
      return;
    }
    setRazorpayEnabled(checked);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="mt-4 text-base text-[var(--text-secondary)]">{t('payment_settings.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
            {t('payment_settings.title')}
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1.5">
            {t('payment_settings.description')}
          </p>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-[var(--accent)]" />
            {t('payment_settings.card_title')}
          </CardTitle>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('payment_settings.card_desc')}
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-6">
          <div className="space-y-4">
            {/* Cash on Delivery Option */}
            <div className="flex items-start justify-between p-5 border border-[var(--border-color)] rounded-xl hover:border-[var(--accent)] transition-colors">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex-shrink-0">
                  <Wallet className="h-6 w-6 text-[var(--accent)]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label
                      htmlFor="cash"
                      className="text-base font-semibold text-[var(--text-primary)] cursor-pointer"
                    >
                      {t('payment_settings.cod.title')}
                    </Label>
                    {cashEnabled && (
                      <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t('payment_settings.cod.description')}
                  </p>
                </div>
              </div>
              <Switch
                id="cash"
                checked={cashEnabled}
                onCheckedChange={handleCashToggle}
                disabled={isSaving}
              />
            </div>

            {/* COD Charge Input - Only show when COD is enabled */}
            {cashEnabled && (
              <div className="ml-16 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="codCharge" className="text-sm font-medium text-[var(--text-primary)] mb-1 block">
                      COD Surcharge (₹)
                    </Label>
                    <p className="text-xs text-[var(--text-secondary)] mb-2">
                      Extra charge added to orders when customer selects Cash on Delivery
                    </p>
                  </div>
                  <Input
                    id="codCharge"
                    type="number"
                    min="0"
                    step="1"
                    value={codCharge}
                    onChange={(e) => setCodCharge(parseFloat(e.target.value) || 0)}
                    className="w-32 text-right"
                    disabled={isSaving}
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            {/* Razorpay Option */}
            <div className="flex items-start justify-between p-5 border border-[var(--border-color)] rounded-xl hover:border-[var(--accent)] transition-colors">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex-shrink-0">
                  <CreditCard className="h-6 w-6 text-[var(--accent)]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label
                      htmlFor="razorpay"
                      className="text-base font-semibold text-[var(--text-primary)] cursor-pointer"
                    >
                      {t('payment_settings.razorpay.title')}
                    </Label>
                    {razorpayEnabled && (
                      <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t('payment_settings.razorpay.description')}
                  </p>
                  {hasRazorpayKeys ? (
                    razorpayEnabled && (
                      <p className="text-xs text-[var(--accent)] mt-1">
                        ✓ {t('payment_settings.razorpay.configured')}
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-[var(--text-primary)] mt-1">
                      ⚠ {t('payment_settings.razorpay.not_configured')}
                    </p>
                  )}
                </div>
              </div>
              <Switch
                id="razorpay"
                checked={razorpayEnabled}
                onCheckedChange={handleRazorpayToggle}
                disabled={isSaving || !hasRazorpayKeys}
              />
            </div>

          </div>

          {/* Info Alert */}
          <div className="flex items-start gap-3 p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl">
            <AlertCircle className="h-5 w-5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-[var(--accent)] font-medium mb-1">
                Important Note
              </p>
              <p className="text-sm text-[var(--text-primary)]">
                At least one payment method must be enabled. Configure Razorpay in{" "}
                <a href="/site-settings" className="underline font-medium">Site Settings</a>
                {" "}or{" "}
                <a href="/payment-gateway-settings" className="underline font-medium">Gateway Settings</a>.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
            <Button
              onClick={handleSave}
              disabled={isSaving || (!cashEnabled && !razorpayEnabled)}
              className=" min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('payment_settings.saving')}
                </>
              ) : (
                t('payment_settings.save_button')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
