import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { useLanguage } from "@/context/LanguageContext";

export default function MarketingSettingsPage() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [form, setForm] = useState({
        emailEnabled: false,
        smtpHost: "",
        smtpPort: "587",
        smtpUser: "",
        smtpPassword: "",
        fromEmail: "",
        fromName: "",
    });
    const [hadPasswordOnLoad, setHadPasswordOnLoad] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get("/api/admin/marketing/config");
                const c = res.data?.data?.config || {};
                setHadPasswordOnLoad(!!c.smtpPassword);
                setForm({
                    emailEnabled: c.emailEnabled ?? false,
                    smtpHost: c.smtpHost || "",
                    smtpPort: String(c.smtpPort || 587),
                    smtpUser: c.smtpUser || "",
                    smtpPassword: "",
                    fromEmail: c.fromEmail || "",
                    fromName: c.fromName || "",
                });
            } catch {
                toast.error("Failed to load config");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    };

    const handleSave = async () => {
        if (!form.smtpHost || !form.smtpUser) {
            toast.error(t("email_delivery.fill_required"));
            return;
        }
        if (!hadPasswordOnLoad && !form.smtpPassword) {
            toast.error(t("email_delivery.fill_required"));
            return;
        }
        try {
            setSaving(true);
            const payload = {
                emailEnabled: form.emailEnabled,
                smtpHost: form.smtpHost,
                smtpPort: parseInt(form.smtpPort) || 587,
                smtpUser: form.smtpUser,
                fromEmail: form.fromEmail,
                fromName: form.fromName,
            };
            if (form.smtpPassword) (payload as Record<string, unknown>).smtpPassword = form.smtpPassword;
            await api.put("/api/admin/marketing/config", payload);
            toast.success(t("email_delivery.saved"));
            setForm((p) => ({ ...p, smtpPassword: "" }));
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
            toast.error(msg || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail) {
            toast.error(t("marketing.messages.enter_test_email"));
            return;
        }
        try {
            setIsTesting(true);
            const response = await api.post("/api/admin/marketing/test-email", { testEmail });
            if (response.data.success) {
                toast.success(t("marketing.messages.test_email_sent"));
            }
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
            toast.error(msg || t("marketing.messages.test_failed"));
        } finally {
            setIsTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
                        {t("email_delivery.title")}
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-1.5">
                        {t("email_delivery.description")}
                    </p>
                </div>
                <div className="h-px bg-[var(--border-color)]" />
            </div>

            <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-sm rounded-xl">
                <CardHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-[var(--accent)]" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
                                {t("email_delivery.smtp_title")}
                            </CardTitle>
                            <CardDescription className="text-sm text-[var(--text-secondary)]">
                                {t("email_delivery.smtp_desc")}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-[var(--text-primary)] space-y-1">
                                <p className="font-medium">{t("email_delivery.warning_title")}</p>
                                <p>{t("email_delivery.warning_desc")}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 border border-[var(--border-color)] rounded-lg">
                        <div>
                            <Label className="text-base font-medium">{t("email_delivery.enable")}</Label>
                            <p className="text-sm text-[var(--text-secondary)]">{t("email_delivery.enable_hint")}</p>
                        </div>
                        <Switch
                            checked={form.emailEnabled}
                            onCheckedChange={(v) => setForm((p) => ({ ...p, emailEnabled: v }))}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="smtpHost">{t("marketing.smtp_host")}</Label>
                            <Input
                                id="smtpHost"
                                name="smtpHost"
                                value={form.smtpHost}
                                onChange={handleChange}
                                placeholder="smtp-relay.brevo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtpPort">{t("marketing.smtp_port")}</Label>
                            <Input
                                id="smtpPort"
                                name="smtpPort"
                                value={form.smtpPort}
                                onChange={handleChange}
                                placeholder="587"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="smtpUser">{t("marketing.smtp_user")}</Label>
                            <Input
                                id="smtpUser"
                                name="smtpUser"
                                type="email"
                                value={form.smtpUser}
                                onChange={handleChange}
                                placeholder="your-brevo@domain.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtpPassword">{t("marketing.smtp_password")}</Label>
                            <Input
                                id="smtpPassword"
                                name="smtpPassword"
                                type="password"
                                value={form.smtpPassword}
                                onChange={handleChange}
                                placeholder={t("email_delivery.password_placeholder")}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fromEmail">{t("marketing.from_email")}</Label>
                            <Input
                                id="fromEmail"
                                name="fromEmail"
                                type="email"
                                value={form.fromEmail}
                                onChange={handleChange}
                                placeholder="noreply@yourstore.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fromName">{t("marketing.from_name")}</Label>
                            <Input
                                id="fromName"
                                name="fromName"
                                value={form.fromName}
                                onChange={handleChange}
                                placeholder="Your Store Name"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4 border-t border-[var(--border-color)]">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {t("marketing.save_config")}
                        </Button>
                        <div className="flex items-center gap-2 flex-1">
                            <Input
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                placeholder={t("marketing.test_email_address")}
                                className="max-w-[240px]"
                            />
                            <Button variant="outline" onClick={handleTestEmail} disabled={isTesting}>
                                {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {t("marketing.test_connection")}
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 border border-[var(--border-color)] rounded-lg">
                        <CheckCircle className="h-4 w-4 text-[var(--accent)]" />
                        <span className="text-sm text-[var(--text-primary)]">
                            {t("email_delivery.secure_note")}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
