import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Globe,
  CreditCard,
  Truck,
  ImageIcon,
  Eye,
  EyeOff,
  Info,
  Wallet,
  MapPin,
  Plus,
  Trash2,
  Cloud,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { Badge } from "@/components/ui/badge";

interface SiteSettings {
  id: string;
  siteName: string;
  siteDescription: string | null;
  siteEmail: string | null;
  sitePhone: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  siteState: string | null;
  sitePincode: string | null;
  siteCountry: string;
  siteGSTIN: string | null;
  sitePAN: string | null;
  siteLogo: string | null;
  siteFavicon: string | null;
  orderPrefix: string;
  orderEmailFooter: string | null;
  razorpayKeyId: string | null;
  razorpayKeySecret: string | null;
  razorpayEnabled: boolean;
  shiprocketEmail: string | null;
  shiprocketPassword: string | null;
  shiprocketEnabled: boolean;
  shiprocketToken: string | null;
  shiprocketTokenExpiry: string | null;
}

interface PickupAddress {
  id: string;
  nickname: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  address2: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  isDefault: boolean;
  shiprocketPickupId: number | null;
}

export default function SiteSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "general";
  const activeTab = ["general", "payment", "price", "oauth", "shipping", "branding", "media"].includes(tabParam) ? tabParam : "general";

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingRazorpay, setIsTestingRazorpay] = useState(false);
  const [isConnectingShiprocket, setIsConnectingShiprocket] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [showShiprocketPassword, setShowShiprocketPassword] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [_oauthProviders, setOauthProviders] = useState<{ provider: string; isEnabled: boolean; clientId: string; clientSecret: string; hasSecret: boolean }[]>([]);
  const [oauthForm, setOauthForm] = useState<Record<string, { isEnabled: boolean; clientId: string; clientSecret: string }>>({});

  // Payment settings (from PaymentSettings - controls checkout options)
  const [cashEnabled, setCashEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [codCharge, setCodCharge] = useState(0);
  // Price visibility
  const [hidePricesForGuests, setHidePricesForGuests] = useState(false);
  // Shiprocket extended (pickup, dimensions, shipping charge)
  const [pickupAddresses, setPickupAddresses] = useState<PickupAddress[]>([]);
  const [defaultLength, setDefaultLength] = useState(10);
  const [defaultBreadth, setDefaultBreadth] = useState(10);
  const [defaultHeight, setDefaultHeight] = useState(10);
  const [defaultWeight, setDefaultWeight] = useState(0.5);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<PickupAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    nickname: "Primary Warehouse",
    name: "",
    email: "",
    phone: "",
    address: "",
    address2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    isDefault: true,
  });

  const [form, setForm] = useState({
    siteName: "My Store",
    siteDescription: "",
    siteEmail: "",
    sitePhone: "",
    siteAddress: "",
    siteCity: "",
    siteState: "",
    sitePincode: "",
    siteCountry: "India",
    siteGSTIN: "",
    sitePAN: "",
    orderPrefix: "ORD",
    orderEmailFooter: "",
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayEnabled: false,
    shiprocketEmail: "",
    shiprocketPassword: "",
    shiprocketEnabled: false,
  });

  const [_storageConfig, setStorageConfig] = useState<{
    activeProvider: string | null;
    uploadFolder: string;
    spacesAccessKey?: string;
    spacesSecretKey?: string;
    spacesBucket?: string;
    spacesRegion?: string;
    spacesEndpoint?: string;
    spacesCdnUrl?: string;
    r2AccountId?: string;
    r2AccessKeyId?: string;
    r2SecretAccessKey?: string;
    r2BucketName?: string;
    r2PublicUrl?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    s3BucketName?: string;
    s3Region?: string;
    s3Endpoint?: string;
    s3PublicUrl?: string;
  } | null>(null);
  const [storageForm, setStorageForm] = useState({
    activeProvider: "",
    uploadFolder: "ecom-uploads",
    spacesAccessKey: "",
    spacesSecretKey: "",
    spacesBucket: "",
    spacesRegion: "blr1",
    spacesEndpoint: "",
    spacesCdnUrl: "",
    r2AccountId: "",
    r2AccessKeyId: "",
    r2SecretAccessKey: "",
    r2BucketName: "",
    r2PublicUrl: "",
    s3AccessKeyId: "",
    s3SecretAccessKey: "",
    s3BucketName: "",
    s3Region: "",
    s3Endpoint: "",
    s3PublicUrl: "",
  });

  useEffect(() => {
    fetchSettings();
    fetchPaymentSettings();
    fetchPriceVisibility();
    fetchShiprocketExtended();
    fetchStorageConfig();
    fetchOAuthSettings();
  }, []);

  const fetchOAuthSettings = async () => {
    try {
      const res = await api.get("/api/admin/oauth-settings");
      if (res.data?.success && res.data?.data?.providers) {
        const providers = res.data.data.providers;
        setOauthProviders(providers);
        const form: Record<string, { isEnabled: boolean; clientId: string; clientSecret: string }> = {};
        for (const p of ["google", "facebook", "twitter"]) {
          const prov = providers.find((x: { provider: string }) => x.provider === p);
          form[p] = {
            isEnabled: prov?.isEnabled ?? false,
            clientId: prov?.clientId || "",
            clientSecret: prov?.hasSecret ? "********" : "",
          };
        }
        setOauthForm(form);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveOAuth = async (provider: string) => {
    const data = oauthForm[provider];
    if (!data) return;
    try {
      setIsSaving(true);
      await api.put(`/api/admin/oauth-settings/${provider}`, {
        isEnabled: data.isEnabled,
        clientId: data.clientId || undefined,
        clientSecret: data.clientSecret !== "********" && data.clientSecret ? data.clientSecret : undefined,
      });
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth updated`);
      fetchOAuthSettings();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await api.get("/api/admin/payment-settings");
      if (res.data?.success && res.data?.data) {
        setCashEnabled(res.data.data.cashEnabled ?? true);
        setRazorpayEnabled(res.data.data.razorpayEnabled ?? false);
        setCodCharge(res.data.data.codCharge ?? 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPriceVisibility = async () => {
    try {
      const res = await api.get("/api/admin/price-visibility-settings");
      if (res.data?.success && res.data?.data) {
        setHidePricesForGuests(res.data.data.hidePricesForGuests ?? false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStorageConfig = async () => {
    try {
      const res = await api.get("/api/admin/site-settings/storage");
      if (res.data?.success && res.data?.data?.config) {
        const c = res.data.data.config;
        setStorageConfig(c);
        setStorageForm({
          activeProvider: c.activeProvider || "",
          uploadFolder: c.uploadFolder || "ecom-uploads",
          spacesAccessKey: c.spacesAccessKey || "",
          spacesSecretKey: c.spacesSecretKey ? "********" : "",
          spacesBucket: c.spacesBucket || "",
          spacesRegion: c.spacesRegion || "blr1",
          spacesEndpoint: c.spacesEndpoint || "",
          spacesCdnUrl: c.spacesCdnUrl || "",
          r2AccountId: c.r2AccountId || "",
          r2AccessKeyId: c.r2AccessKeyId || "",
          r2SecretAccessKey: c.r2SecretAccessKey ? "********" : "",
          r2BucketName: c.r2BucketName || "",
          r2PublicUrl: c.r2PublicUrl || "",
          s3AccessKeyId: c.s3AccessKeyId || "",
          s3SecretAccessKey: c.s3SecretAccessKey ? "********" : "",
          s3BucketName: c.s3BucketName || "",
          s3Region: c.s3Region || "",
          s3Endpoint: c.s3Endpoint || "",
          s3PublicUrl: c.s3PublicUrl || "",
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchShiprocketExtended = async () => {
    try {
      const [settingsRes, addressesRes] = await Promise.all([
        api.get("/api/admin/shiprocket/settings"),
        api.get("/api/admin/shiprocket/pickup-addresses"),
      ]);
      if (settingsRes.data?.success && settingsRes.data?.data?.settings) {
        const s = settingsRes.data.data.settings;
        setDefaultLength(s.defaultLength ?? 10);
        setDefaultBreadth(s.defaultBreadth ?? 10);
        setDefaultHeight(s.defaultHeight ?? 10);
        setDefaultWeight(s.defaultWeight ?? 0.5);
        setShippingCharge(parseFloat(s.shippingCharge) || 0);
        setFreeShippingThreshold(parseFloat(s.freeShippingThreshold) || 0);
      }
      if (addressesRes.data?.success && addressesRes.data?.data?.addresses) {
        setPickupAddresses(addressesRes.data.data.addresses);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/admin/site-settings");
      if (response.data?.success && response.data?.data?.settings) {
        const s = response.data.data.settings;
        setSettings(s);
        setForm({
          siteName: s.siteName || "My Store",
          siteDescription: s.siteDescription || "",
          siteEmail: s.siteEmail || "",
          sitePhone: s.sitePhone || "",
          siteAddress: s.siteAddress || "",
          siteCity: s.siteCity || "",
          siteState: s.siteState || "",
          sitePincode: s.sitePincode || "",
          siteCountry: s.siteCountry || "India",
          siteGSTIN: s.siteGSTIN || "",
          sitePAN: s.sitePAN || "",
          orderPrefix: s.orderPrefix || "ORD",
          orderEmailFooter: s.orderEmailFooter || "",
          razorpayKeyId: s.razorpayKeyId || "",
          razorpayKeySecret: s.razorpayKeySecret || "••••••••",
          razorpayEnabled: s.razorpayEnabled || false,
          shiprocketEmail: s.shiprocketEmail || "",
          shiprocketPassword: s.shiprocketPassword || "••••••••",
          shiprocketEnabled: s.shiprocketEnabled || false,
        });
      }
    } catch (err: unknown) {
      toast.error("Failed to load site settings");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    try {
      setIsSaving(true);
      await api.put("/api/admin/site-settings", {
        siteName: form.siteName,
        siteDescription: form.siteDescription || null,
        siteEmail: form.siteEmail || null,
        sitePhone: form.sitePhone || null,
        siteAddress: form.siteAddress || null,
        siteCity: form.siteCity || null,
        siteState: form.siteState || null,
        sitePincode: form.sitePincode || null,
        siteCountry: form.siteCountry,
        siteGSTIN: form.siteGSTIN || null,
        sitePAN: form.sitePAN || null,
        orderPrefix: form.orderPrefix,
        orderEmailFooter: form.orderEmailFooter || null,
      });
      toast.success("General settings saved");
      fetchSettings();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRazorpay = async () => {
    try {
      setIsSaving(true);
      await api.put("/api/admin/site-settings", {
        razorpayKeyId: form.razorpayKeyId || null,
        razorpayKeySecret: form.razorpayKeySecret !== "••••••••" ? form.razorpayKeySecret : undefined,
        razorpayEnabled: form.razorpayEnabled,
      });
      toast.success("Razorpay settings saved");
      fetchSettings();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestRazorpay = async () => {
    try {
      setIsTestingRazorpay(true);
      const response = await api.post("/api/admin/site-settings/test-razorpay");
      const connected = response.data?.data?.connected;
      toast.success(connected ? "Razorpay connected" : (response.data?.message || "Not connected"));
    } catch {
      toast.error("Test failed");
    } finally {
      setIsTestingRazorpay(false);
    }
  };

  const handleConnectShiprocket = async () => {
    if (!form.shiprocketEmail || !form.shiprocketPassword || form.shiprocketPassword === "••••••••") {
      toast.error("Enter email and password to connect");
      return;
    }
    try {
      setIsConnectingShiprocket(true);
      await api.post("/api/admin/site-settings/connect-shiprocket", {
        email: form.shiprocketEmail,
        password: form.shiprocketPassword,
      });
      toast.success("Shiprocket connected");
      fetchSettings();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Connection failed");
    } finally {
      setIsConnectingShiprocket(false);
    }
  };

  const handleSaveStorage = async () => {
    try {
      setIsSaving(true);
      const payload: Record<string, unknown> = {
        activeProvider: storageForm.activeProvider || null,
        uploadFolder: storageForm.uploadFolder,
        spacesAccessKey: storageForm.spacesAccessKey || null,
        spacesBucket: storageForm.spacesBucket || null,
        spacesRegion: storageForm.spacesRegion || null,
        spacesEndpoint: storageForm.spacesEndpoint || null,
        spacesCdnUrl: storageForm.spacesCdnUrl || null,
        r2AccountId: storageForm.r2AccountId || null,
        r2AccessKeyId: storageForm.r2AccessKeyId || null,
        r2BucketName: storageForm.r2BucketName || null,
        r2PublicUrl: storageForm.r2PublicUrl || null,
        s3AccessKeyId: storageForm.s3AccessKeyId || null,
        s3BucketName: storageForm.s3BucketName || null,
        s3Region: storageForm.s3Region || null,
        s3Endpoint: storageForm.s3Endpoint || null,
        s3PublicUrl: storageForm.s3PublicUrl || null,
      };
      if (storageForm.spacesSecretKey && storageForm.spacesSecretKey !== "********") payload.spacesSecretKey = storageForm.spacesSecretKey;
      if (storageForm.r2SecretAccessKey && storageForm.r2SecretAccessKey !== "********") payload.r2SecretAccessKey = storageForm.r2SecretAccessKey;
      if (storageForm.s3SecretAccessKey && storageForm.s3SecretAccessKey !== "********") payload.s3SecretAccessKey = storageForm.s3SecretAccessKey;
      await api.put("/api/admin/site-settings/storage", payload);
      toast.success("Media storage settings saved");
      fetchStorageConfig();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShiprocket = async () => {
    try {
      setIsSaving(true);
      await api.put("/api/admin/site-settings", {
        shiprocketEmail: form.shiprocketEmail || null,
        shiprocketPassword: form.shiprocketPassword !== "••••••••" ? form.shiprocketPassword : undefined,
        shiprocketEnabled: form.shiprocketEnabled,
      });
      toast.success("Shiprocket settings saved");
      fetchSettings();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePaymentMethods = async () => {
    if (!cashEnabled && !razorpayEnabled) {
      toast.error("At least one payment method must be enabled (COD or Razorpay)");
      return;
    }
    try {
      setIsSaving(true);
      await api.patch("/api/admin/payment-settings", {
        cashEnabled,
        razorpayEnabled,
        codCharge: parseFloat(String(codCharge)) || 0,
      });
      // Keep SiteSettings.razorpayEnabled in sync for key checks
      await api.put("/api/admin/site-settings", { razorpayEnabled });
      toast.success("Payment methods saved");
      fetchPaymentSettings();
      fetchSettings();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePriceVisibility = async () => {
    try {
      setIsSaving(true);
      await api.patch("/api/admin/price-visibility-settings", { hidePricesForGuests });
      toast.success("Price visibility saved");
      fetchPriceVisibility();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShiprocketExtended = async () => {
    try {
      setIsSaving(true);
      await api.put("/api/admin/shiprocket/settings", {
        defaultLength,
        defaultBreadth,
        defaultHeight,
        defaultWeight,
        shippingCharge,
        freeShippingThreshold,
      });
      toast.success("Shipping settings saved");
      fetchShiprocketExtended();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressForm.name || !addressForm.email || !addressForm.phone || !addressForm.address || !addressForm.city || !addressForm.state || !addressForm.pincode) {
      toast.error("Fill all required fields");
      return;
    }
    try {
      setIsSaving(true);
      if (editingAddress) {
        await api.put(`/api/admin/shiprocket/pickup-addresses/${editingAddress.id}`, addressForm);
        toast.success("Address updated");
      } else {
        await api.post("/api/admin/shiprocket/pickup-addresses", addressForm);
        toast.success("Address added");
      }
      fetchShiprocketExtended();
      setIsAddressDialogOpen(false);
      setEditingAddress(null);
      setAddressForm({ nickname: "Primary Warehouse", name: "", email: "", phone: "", address: "", address2: "", city: "", state: "", country: "India", pincode: "", isDefault: true });
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Delete this pickup address?")) return;
    try {
      await api.delete(`/api/admin/shiprocket/pickup-addresses/${id}`);
      toast.success("Address deleted");
      fetchShiprocketExtended();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(msg || "Failed to delete");
    }
  };

  const shiprocketConnected = settings?.shiprocketToken && settings?.shiprocketTokenExpiry &&
    new Date(settings.shiprocketTokenExpiry) > new Date();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Site Settings</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Company details, payment & shipping configuration</p>
      </div>
      <div className="h-px bg-[var(--border-color)]" />

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-6">
        <TabsList className="bg-[var(--bg-secondary)] flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-[var(--bg-card)]">
            <Globe className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="payment" className="data-[state=active]:bg-[var(--bg-card)]">
            <CreditCard className="h-4 w-4 mr-2" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="price" className="data-[state=active]:bg-[var(--bg-card)]">
            <Eye className="h-4 w-4 mr-2" />
            Price Visibility
          </TabsTrigger>
          <TabsTrigger value="oauth" className="data-[state=active]:bg-[var(--bg-card)]">
            <LogIn className="h-4 w-4 mr-2" />
            Login (OAuth)
          </TabsTrigger>
          <TabsTrigger value="shipping" className="data-[state=active]:bg-[var(--bg-card)]">
            <Truck className="h-4 w-4 mr-2" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-[var(--bg-card)]">
            <ImageIcon className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="media" className="data-[state=active]:bg-[var(--bg-card)]">
            <Cloud className="h-4 w-4 mr-2" />
            Media Storage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Store Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[var(--text-primary)]">Site Name *</Label>
                <Input
                  value={form.siteName}
                  onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[var(--text-primary)]">Site Description</Label>
                <Textarea
                  value={form.siteDescription}
                  onChange={(e) => setForm({ ...form, siteDescription: e.target.value })}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[var(--text-primary)]">Site Email</Label>
                  <Input
                    type="email"
                    value={form.siteEmail}
                    onChange={(e) => setForm({ ...form, siteEmail: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[var(--text-primary)]">Site Phone</Label>
                  <Input
                    type="tel"
                    value={form.sitePhone}
                    onChange={(e) => setForm({ ...form, sitePhone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[var(--text-primary)]">Order Prefix</Label>
                <Input
                  value={form.orderPrefix}
                  onChange={(e) => setForm({ ...form, orderPrefix: e.target.value })}
                  className="mt-1"
                  placeholder="ORD"
                />
                <p className="text-xs text-[var(--text-secondary)] mt-1">Used in order IDs e.g. ORD-001</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[var(--text-primary)]">Address</Label>
                <Textarea
                  value={form.siteAddress}
                  onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[var(--text-primary)]">City</Label>
                  <Input value={form.siteCity} onChange={(e) => setForm({ ...form, siteCity: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-[var(--text-primary)]">State</Label>
                  <Input value={form.siteState} onChange={(e) => setForm({ ...form, siteState: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-[var(--text-primary)]">Pincode</Label>
                  <Input value={form.sitePincode} onChange={(e) => setForm({ ...form, sitePincode: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-[var(--text-primary)]">Country</Label>
                  <Input value={form.siteCountry} onChange={(e) => setForm({ ...form, siteCountry: e.target.value })} className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Tax & Legal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[var(--text-primary)]">GSTIN</Label>
                <Input value={form.siteGSTIN} onChange={(e) => setForm({ ...form, siteGSTIN: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-[var(--text-primary)]">PAN Number</Label>
                <Input value={form.sitePAN} onChange={(e) => setForm({ ...form, sitePAN: e.target.value })} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Email Footer</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="text-[var(--text-primary)]">Order Email Footer</Label>
              <Textarea
                value={form.orderEmailFooter}
                onChange={(e) => setForm({ ...form, orderEmailFooter: e.target.value })}
                rows={4}
                className="mt-1"
                placeholder="Appears at bottom of all order emails"
              />
            </CardContent>
          </Card>

          <Button onClick={handleSaveGeneral} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save General Settings
          </Button>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">How Payment & Shipping Work</CardTitle>
              <div className="text-sm text-[var(--text-secondary)] space-y-2">
                <p><strong>Payment:</strong> COD (Cash on Delivery) or Razorpay (online). Enable at least one.</p>
                <p><strong>Shipping:</strong> Shiprocket handles delivery for all orders (COD & Razorpay). Configure in the Shipping tab.</p>
                <p>If Razorpay is OFF → only COD shows at checkout. Orders go to Shiprocket for delivery.</p>
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Payment Methods</CardTitle>
              <p className="text-sm text-[var(--text-secondary)]">
                Enable COD and/or Razorpay. At least one must be on. Shipping is handled by Shiprocket separately.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-[var(--accent)]" />
                  <div>
                    <Label className="text-[var(--text-primary)] font-medium">Cash on Delivery (COD)</Label>
                    <p className="text-xs text-[var(--text-secondary)]">Accept payment when order is delivered</p>
                  </div>
                </div>
                <Switch checked={cashEnabled} onCheckedChange={setCashEnabled} />
              </div>
              {cashEnabled && (
                <div className="ml-8 p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <Label className="text-[var(--text-primary)]">COD Surcharge (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={codCharge}
                    onChange={(e) => setCodCharge(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-32"
                  />
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Extra charge for COD orders</p>
                </div>
              )}
              <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-[var(--accent)]" />
                  <div>
                    <Label className="text-[var(--text-primary)] font-medium">Razorpay (Online)</Label>
                    <p className="text-xs text-[var(--text-secondary)]">Card, UPI, Net Banking. Enter keys below & save.</p>
                  </div>
                </div>
                <Switch
                  checked={razorpayEnabled}
                  onCheckedChange={setRazorpayEnabled}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                Razorpay API Keys
                <Badge variant={razorpayEnabled ? "default" : "secondary"}>
                  {razorpayEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardTitle>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Razorpay keys from Site Settings. Toggle above &quot;Save Payment Methods&quot; to show/hide at checkout.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[var(--text-primary)]">Razorpay Key ID</Label>
                <Input
                  value={form.razorpayKeyId}
                  onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })}
                  className="mt-1"
                  placeholder="rzp_test_xxxxx"
                />
              </div>
              <div>
                <Label className="text-[var(--text-primary)]">Razorpay Key Secret</Label>
                <div className="relative mt-1">
                  <Input
                    type={showRazorpaySecret ? "text" : "password"}
                    value={form.razorpayKeySecret}
                    onChange={(e) => setForm({ ...form, razorpayKeySecret: e.target.value })}
                    placeholder="••••••••"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}>
                    {showRazorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTestRazorpay} disabled={isTestingRazorpay}>
                  {isTestingRazorpay ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Test Connection
                </Button>
                <Button onClick={handleSaveRazorpay} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Razorpay
                </Button>
                <Button onClick={handleSavePaymentMethods} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Payment Methods
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="price" className="space-y-6">
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                <Eye className="h-5 w-5 text-[var(--accent)]" />
                Price Visibility
              </CardTitle>
              <p className="text-sm text-[var(--text-secondary)]">Control whether guests can see product prices</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                <div>
                  <Label className="text-[var(--text-primary)] font-medium">Hide prices from guests</Label>
                  <p className="text-xs text-[var(--text-secondary)]">When enabled, only logged-in users see prices</p>
                </div>
                <Switch checked={hidePricesForGuests} onCheckedChange={setHidePricesForGuests} />
              </div>
              <Button onClick={handleSavePriceVisibility} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oauth" className="space-y-6">
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                <LogIn className="h-5 w-5 text-[var(--accent)]" />
                Social Login (OAuth)
              </CardTitle>
              <p className="text-sm text-[var(--text-secondary)]">
                By default only email/password/OTP login works. Enable Google below and add valid credentials to show the button on the auth page. Credentials are stored encrypted.
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                <strong>Google:</strong> In Google Cloud Console → APIs & Services → Credentials → Your OAuth client → Authorized redirect URIs, add: <code className="bg-amber-100 px-1 rounded block mt-1">{(import.meta.env.VITE_API_URL || "http://localhost:4001").replace(/\/$/, "")}/api/auth/google/callback</code>
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {["google", "facebook", "twitter"].map((provider) => {
                const data = oauthForm[provider] ?? { isEnabled: false, clientId: "", clientSecret: "" };
                return (
                  <div key={provider} className="p-4 border border-[var(--border-color)] rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[var(--text-primary)] font-medium capitalize">{provider} Login</Label>
                      <Switch
                        checked={data.isEnabled}
                        onCheckedChange={(c) =>
                          setOauthForm((prev) => ({
                            ...prev,
                            [provider]: { ...(prev[provider] ?? { isEnabled: false, clientId: "", clientSecret: "" }), isEnabled: c },
                          }))
                        }
                      />
                    </div>
                    {data.isEnabled && (
                      <>
                        <div>
                          <Label className="text-[var(--text-primary)]">Client ID</Label>
                          <Input
                            value={data.clientId}
                            onChange={(e) =>
                              setOauthForm((prev) => ({
                                ...prev,
                                [provider]: { ...(prev[provider] ?? { isEnabled: false, clientId: "", clientSecret: "" }), clientId: e.target.value },
                              }))
                            }
                            className="mt-1"
                            placeholder={provider === "google" ? "xxx.apps.googleusercontent.com" : "App ID"}
                          />
                        </div>
                        <div>
                          <Label className="text-[var(--text-primary)]">Client Secret</Label>
                          <div className="relative mt-1">
                            <Input
                              type={showGoogleSecret ? "text" : "password"}
                              value={data.clientSecret}
                              onChange={(e) =>
                                setOauthForm((prev) => ({
                                  ...prev,
                                  [provider]: { ...(prev[provider] ?? { isEnabled: false, clientId: "", clientSecret: "" }), clientSecret: e.target.value },
                                }))
                              }
                              placeholder="Leave blank to keep existing"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              onClick={() => setShowGoogleSecret((s) => !s)}
                            >
                              {showGoogleSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            Stored securely encrypted. Only valid credentials are accepted.
                          </p>
                        </div>
                        <Button onClick={() => handleSaveOAuth(provider)} disabled={isSaving || !data.clientId}>
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save {provider.charAt(0).toUpperCase() + provider.slice(1)}
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6">
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                Shiprocket Configuration
                <Badge variant={shiprocketConnected ? "default" : "destructive"}>
                  {shiprocketConnected ? "Connected" : "Disconnected"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.shiprocketEnabled}
                  onCheckedChange={(c) => setForm({ ...form, shiprocketEnabled: c })}
                />
                <Label className="text-[var(--text-primary)]">Enable Shiprocket</Label>
              </div>
              <div>
                <Label className="text-[var(--text-primary)]">Email</Label>
                <Input
                  type="email"
                  value={form.shiprocketEmail}
                  onChange={(e) => setForm({ ...form, shiprocketEmail: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[var(--text-primary)]">Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showShiprocketPassword ? "text" : "password"}
                    value={form.shiprocketPassword}
                    onChange={(e) => setForm({ ...form, shiprocketPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowShiprocketPassword(!showShiprocketPassword)}>
                    {showShiprocketPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleConnectShiprocket} disabled={isConnectingShiprocket}>
                  {isConnectingShiprocket ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Connect
                </Button>
                <Button onClick={handleSaveShiprocket} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Credentials
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Shipping Charges & Dimensions</CardTitle>
              <p className="text-sm text-[var(--text-secondary)]">Default dimensions and shipping cost</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-[var(--text-primary)]">Length (cm)</Label>
                  <Input type="number" value={defaultLength} onChange={(e) => setDefaultLength(parseFloat(e.target.value) || 10)} />
                </div>
                <div>
                  <Label className="text-[var(--text-primary)]">Breadth (cm)</Label>
                  <Input type="number" value={defaultBreadth} onChange={(e) => setDefaultBreadth(parseFloat(e.target.value) || 10)} />
                </div>
                <div>
                  <Label className="text-[var(--text-primary)]">Height (cm)</Label>
                  <Input type="number" value={defaultHeight} onChange={(e) => setDefaultHeight(parseFloat(e.target.value) || 10)} />
                </div>
                <div>
                  <Label className="text-[var(--text-primary)]">Weight (kg)</Label>
                  <Input type="number" step="0.1" value={defaultWeight} onChange={(e) => setDefaultWeight(parseFloat(e.target.value) || 0.5)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[var(--text-primary)]">Shipping Charge (₹)</Label>
                  <Input type="number" min={0} value={shippingCharge} onChange={(e) => setShippingCharge(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-[var(--text-primary)]">Free Shipping Above (₹)</Label>
                  <Input type="number" min={0} value={freeShippingThreshold} onChange={(e) => setFreeShippingThreshold(parseFloat(e.target.value) || 0)} />
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Orders above this amount get free shipping</p>
                </div>
              </div>
              <Button onClick={handleSaveShiprocketExtended} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[var(--accent)]" />
                    Pickup Addresses
                  </CardTitle>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Warehouse addresses for Shiprocket</p>
                </div>
                <Dialog open={isAddressDialogOpen} onOpenChange={(o) => { setIsAddressDialogOpen(o); if (!o) { setEditingAddress(null); setAddressForm({ nickname: "Primary Warehouse", name: "", email: "", phone: "", address: "", address2: "", city: "", state: "", country: "India", pincode: "", isDefault: true }); } }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editingAddress ? "Edit" : "Add"} Pickup Address</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Nickname</Label><Input value={addressForm.nickname} onChange={(e) => setAddressForm({ ...addressForm, nickname: e.target.value })} /></div>
                        <div><Label>Contact Name *</Label><Input value={addressForm.name} onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Email *</Label><Input type="email" value={addressForm.email} onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })} /></div>
                        <div><Label>Phone *</Label><Input value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} /></div>
                      </div>
                      <div><Label>Address *</Label><Input value={addressForm.address} onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })} /></div>
                      <div className="grid grid-cols-3 gap-4">
                        <div><Label>City *</Label><Input value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} /></div>
                        <div><Label>State *</Label><Input value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} /></div>
                        <div><Label>Pincode *</Label><Input value={addressForm.pincode} onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })} /></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={addressForm.isDefault} onCheckedChange={(c) => setAddressForm({ ...addressForm, isDefault: c })} />
                        <Label>Set as default</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddressDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAddress} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {pickupAddresses.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pickup addresses. Add one to enable Shiprocket orders.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pickupAddresses.map((addr) => (
                    <div key={addr.id} className="flex items-start justify-between p-4 border border-[var(--border-color)] rounded-lg">
                      <div>
                        <span className="font-medium text-[var(--text-primary)]">{addr.nickname}</span>
                        {addr.isDefault && <Badge variant="secondary" className="ml-2">Default</Badge>}
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{addr.name} • {addr.phone}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{addr.address}, {addr.city}, {addr.state} - {addr.pincode}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingAddress(addr); setAddressForm({ nickname: addr.nickname, name: addr.name, email: addr.email, phone: addr.phone, address: addr.address, address2: addr.address2 || "", city: addr.city, state: addr.state, country: addr.country, pincode: addr.pincode, isDefault: addr.isDefault }); setIsAddressDialogOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteAddress(addr.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                <Info className="h-5 w-5" />
                How Shiprocket Works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--text-secondary)] space-y-2">
              <p>When enabled:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>New orders automatically create shipments on Shiprocket</li>
                <li>Cancelled orders automatically cancel the Shiprocket shipment</li>
                <li>Return requests automatically create return orders on Shiprocket</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Logo & Favicon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-secondary)]">
                Logo and favicon upload can be added. Use the General tab to set siteLogo and siteFavicon URLs if you have existing assets.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-6">
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Media Storage (Image Config)</CardTitle>
              <p className="text-sm text-[var(--text-secondary)]">
                All image uploads use this storage. Configure here once - products, variants, categories, attributes, banners, brands use it. Only one provider active at a time. Credentials stored securely in database.
              </p>
              <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-[var(--text-primary)]">
                <strong>Used in:</strong> Products, Variants, Categories, Subcategories, Attributes, Banners, Brands, User Profile, Blog Cover
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-[var(--text-primary)]">Active Provider</Label>
                <select
                  value={storageForm.activeProvider}
                  onChange={(e) => setStorageForm({ ...storageForm, activeProvider: e.target.value })}
                  className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
                >
                  <option value="">None (uploads disabled)</option>
                  <option value="DIGITAL_OCEAN">Digital Ocean Spaces</option>
                  <option value="CLOUDFLARE_R2">Cloudflare R2</option>
                  <option value="AWS_S3">AWS S3</option>
                </select>
              </div>
              <div>
                <Label className="text-[var(--text-primary)]">Upload Folder</Label>
                <Input
                  value={storageForm.uploadFolder}
                  onChange={(e) => setStorageForm({ ...storageForm, uploadFolder: e.target.value })}
                  placeholder="ecom-uploads"
                  className="mt-1"
                />
              </div>

              {/* Digital Ocean */}
              <div className="space-y-3 rounded-lg border border-[var(--border-color)] p-4">
                <h4 className="font-medium text-[var(--text-primary)]">Digital Ocean Spaces</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Access Key</Label>
                    <Input value={storageForm.spacesAccessKey} onChange={(e) => setStorageForm({ ...storageForm, spacesAccessKey: e.target.value })} className="mt-1" placeholder="DO00..." />
                  </div>
                  <div>
                    <Label className="text-xs">Secret Key</Label>
                    <Input type="password" value={storageForm.spacesSecretKey} onChange={(e) => setStorageForm({ ...storageForm, spacesSecretKey: e.target.value })} className="mt-1" placeholder="Leave blank to keep" />
                  </div>
                  <div>
                    <Label className="text-xs">Bucket</Label>
                    <Input value={storageForm.spacesBucket} onChange={(e) => setStorageForm({ ...storageForm, spacesBucket: e.target.value })} className="mt-1" placeholder="my-bucket" />
                  </div>
                  <div>
                    <Label className="text-xs">Region</Label>
                    <Input value={storageForm.spacesRegion} onChange={(e) => setStorageForm({ ...storageForm, spacesRegion: e.target.value })} className="mt-1" placeholder="blr1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Endpoint</Label>
                    <Input value={storageForm.spacesEndpoint} onChange={(e) => setStorageForm({ ...storageForm, spacesEndpoint: e.target.value })} className="mt-1" placeholder="https://blr1.digitaloceanspaces.com" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">CDN URL (optional)</Label>
                    <Input value={storageForm.spacesCdnUrl} onChange={(e) => setStorageForm({ ...storageForm, spacesCdnUrl: e.target.value })} className="mt-1" placeholder="https://cdn.example.com" />
                  </div>
                </div>
              </div>

              {/* Cloudflare R2 */}
              <div className="space-y-3 rounded-lg border border-[var(--border-color)] p-4">
                <h4 className="font-medium text-[var(--text-primary)]">Cloudflare R2</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Account ID</Label>
                    <Input value={storageForm.r2AccountId} onChange={(e) => setStorageForm({ ...storageForm, r2AccountId: e.target.value })} className="mt-1" placeholder="ab34b1de..." />
                  </div>
                  <div>
                    <Label className="text-xs">Access Key ID</Label>
                    <Input value={storageForm.r2AccessKeyId} onChange={(e) => setStorageForm({ ...storageForm, r2AccessKeyId: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Secret Access Key</Label>
                    <Input type="password" value={storageForm.r2SecretAccessKey} onChange={(e) => setStorageForm({ ...storageForm, r2SecretAccessKey: e.target.value })} className="mt-1" placeholder="Leave blank to keep" />
                  </div>
                  <div>
                    <Label className="text-xs">Bucket Name</Label>
                    <Input value={storageForm.r2BucketName} onChange={(e) => setStorageForm({ ...storageForm, r2BucketName: e.target.value })} className="mt-1" placeholder="shresthaacademy" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Public URL</Label>
                    <Input value={storageForm.r2PublicUrl} onChange={(e) => setStorageForm({ ...storageForm, r2PublicUrl: e.target.value })} className="mt-1" placeholder="https://pub-xxx.r2.dev" />
                  </div>
                </div>
              </div>

              {/* AWS S3 */}
              <div className="space-y-3 rounded-lg border border-[var(--border-color)] p-4">
                <h4 className="font-medium text-[var(--text-primary)]">AWS S3</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Access Key ID</Label>
                    <Input value={storageForm.s3AccessKeyId} onChange={(e) => setStorageForm({ ...storageForm, s3AccessKeyId: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Secret Access Key</Label>
                    <Input type="password" value={storageForm.s3SecretAccessKey} onChange={(e) => setStorageForm({ ...storageForm, s3SecretAccessKey: e.target.value })} className="mt-1" placeholder="Leave blank to keep" />
                  </div>
                  <div>
                    <Label className="text-xs">Bucket Name</Label>
                    <Input value={storageForm.s3BucketName} onChange={(e) => setStorageForm({ ...storageForm, s3BucketName: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Region</Label>
                    <Input value={storageForm.s3Region} onChange={(e) => setStorageForm({ ...storageForm, s3Region: e.target.value })} className="mt-1" placeholder="ap-south-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Custom Endpoint (optional)</Label>
                    <Input value={storageForm.s3Endpoint} onChange={(e) => setStorageForm({ ...storageForm, s3Endpoint: e.target.value })} className="mt-1" placeholder="https://s3.amazonaws.com" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Public URL (optional)</Label>
                    <Input value={storageForm.s3PublicUrl} onChange={(e) => setStorageForm({ ...storageForm, s3PublicUrl: e.target.value })} className="mt-1" placeholder="https://bucket.s3.region.amazonaws.com" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveStorage} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Media Storage
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
