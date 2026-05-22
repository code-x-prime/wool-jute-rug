import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Save, ExternalLink, Info, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface TawkToConfig {
    propertyId: string;
    widgetId: string;
    isEnabled: boolean;
}

const TawkToSettingsPage = () => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<TawkToConfig>({
        propertyId: "",
        widgetId: "",
        isEnabled: false,
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/admin/tawkto-settings");
            if (response.data.success) {
                setConfig(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching Tawk.to config:", error);
            toast.error(t("tawkto.messages.fetch_error"));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Validate if trying to enable without keys
            if (config.isEnabled && (!config.propertyId || !config.widgetId)) {
                toast.error(t("tawkto.messages.keys_required"));
                return;
            }

            const response = await axios.patch("/admin/tawkto-settings", config);
            if (response.data.success) {
                toast.success(t("tawkto.messages.save_success"));
                setConfig(response.data.data);
            }
        } catch (error: any) {
            console.error("Error saving Tawk.to config:", error);
            toast.error(error.response?.data?.message || t("tawkto.messages.save_error"));
        } finally {
            setSaving(false);
        }
    };

    const canEnable = config.propertyId?.trim() && config.widgetId?.trim();

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F2937] flex items-center gap-2">
                        <MessageCircle className="h-6 w-6 text-[#4CAF50]" />
                        {t("tawkto.title")}
                    </h1>
                    <p className="text-[#6B7280] mt-1">{t("tawkto.description")}</p>
                </div>
            </div>

            {/* Info Card */}
            <Card className="bg-[#E8F5E9] border-[#C8E6C9]">
                <CardContent className="p-4">
                    <div className="flex gap-3">
                        <Info className="h-5 w-5 text-[#2E7D32] flex-shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <p className="text-sm text-[#1F2937] font-medium">{t("tawkto.info.title")}</p>
                            <ol className="text-sm text-[#4B5563] list-decimal list-inside space-y-1">
                                <li>{t("tawkto.info.step1")}</li>
                                <li>{t("tawkto.info.step2")}</li>
                                <li>{t("tawkto.info.step3")}</li>
                                <li>{t("tawkto.info.step4")}</li>
                            </ol>
                            <a
                                href="https://www.tawk.to/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-[#2E7D32] hover:underline font-medium mt-2"
                            >
                                {t("tawkto.info.visit_tawkto")}
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Configuration Card */}
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-[#1F2937]">
                        {t("tawkto.config.title")}
                    </CardTitle>
                    <CardDescription className="text-[#6B7280]">
                        {t("tawkto.config.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Property ID */}
                    <div className="space-y-2">
                        <Label htmlFor="propertyId" className="text-sm font-medium text-[#374151]">
                            {t("tawkto.config.property_id")}
                        </Label>
                        <Input
                            id="propertyId"
                            placeholder={t("tawkto.config.property_id_placeholder")}
                            value={config.propertyId}
                            onChange={(e) => setConfig({ ...config, propertyId: e.target.value })}
                            className="bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#4CAF50] focus:ring-[#4CAF50]"
                        />
                        <p className="text-xs text-[#9CA3AF]">{t("tawkto.config.property_id_hint")}</p>
                    </div>

                    {/* Widget ID */}
                    <div className="space-y-2">
                        <Label htmlFor="widgetId" className="text-sm font-medium text-[#374151]">
                            {t("tawkto.config.widget_id")}
                        </Label>
                        <Input
                            id="widgetId"
                            placeholder={t("tawkto.config.widget_id_placeholder")}
                            value={config.widgetId}
                            onChange={(e) => setConfig({ ...config, widgetId: e.target.value })}
                            className="bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#4CAF50] focus:ring-[#4CAF50]"
                        />
                        <p className="text-xs text-[#9CA3AF]">{t("tawkto.config.widget_id_hint")}</p>
                    </div>

                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-[#374151]">
                                {t("tawkto.config.enable_widget")}
                            </Label>
                            <p className="text-xs text-[#9CA3AF]">
                                {t("tawkto.config.enable_widget_hint")}
                            </p>
                        </div>
                        <Switch
                            checked={config.isEnabled}
                            onCheckedChange={(checked) => {
                                if (checked && !canEnable) {
                                    toast.error(t("tawkto.messages.keys_required"));
                                    return;
                                }
                                setConfig({ ...config, isEnabled: checked });
                            }}
                            disabled={!canEnable && !config.isEnabled}
                        />
                    </div>

                    {/* Status Indicator */}
                    {config.isEnabled && canEnable && (
                        <div className="flex items-center gap-2 p-3 bg-[#E8F5E9] rounded-lg border border-[#C8E6C9]">
                            <CheckCircle className="h-4 w-4 text-[#2E7D32]" />
                            <span className="text-sm text-[#2E7D32] font-medium">
                                {t("tawkto.status.active")}
                            </span>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="pt-4 border-t border-[#E5E7EB]">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#4CAF50] hover:bg-[#43A047] text-white"
                        >
                            {saving ? (
                                <>
                                    <span className="animate-spin mr-2">⏳</span>
                                    {t("tawkto.buttons.saving")}
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    {t("tawkto.buttons.save")}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TawkToSettingsPage;
