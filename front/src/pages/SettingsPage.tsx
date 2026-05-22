import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Monitor, Smartphone, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";
import api from "@/api/api";

// Language Management Component
function LanguageManagement() {
    const { language, setLanguage, t } = useLanguage();
    // Local state for admin language selection
    const [selectedAdminLanguage, setSelectedAdminLanguage] = useState(language);
    // For client languages, we'll keep local state for now as placeholder for DB integration
    const [clientLanguages, setClientLanguages] = useState(["en"]);

    // Update local state when global state changes (e.g. initial load)
    // but only if user hasn't interacted yet (or we can just respect global always on load)
    useEffect(() => {
        setSelectedAdminLanguage(language);
    }, [language]);

    const languages = [
        { code: "en", name: "English", flag: "🇺🇸" },
        { code: "hi", name: "Hindi", flag: "🇮🇳" },
        { code: "es", name: "Spanish", flag: "🇪🇸" },
        { code: "fr", name: "French", flag: "🇫🇷" },
        { code: "de", name: "German", flag: "🇩🇪" },
        { code: "zh", name: "Chinese", flag: "🇨🇳" },
        { code: "ja", name: "Japanese", flag: "🇯🇵" },
        { code: "ar", name: "Arabic", flag: "🇸🇦" },
    ];

    const handleClientLanguageChange = (languageCode: string, checked: boolean | string): void => {
        if (checked) {
            setClientLanguages((prev: string[]) => [...prev, languageCode]);
        } else {
            setClientLanguages((prev: string[]) => prev.filter((code: string) => code !== languageCode));
        }
    };

    const handleSave = async () => {


        // This will trigger the global update and persistence
        await setLanguage(selectedAdminLanguage as any);

        toast(t("settings.alert_saved"));
    };




    // Helper to get current language object
    const currentLang = languages.find(l => l.code === selectedAdminLanguage);

    return (
        <div className="space-y-6">
            {/* Admin Panel Language */}
            <Card className="bg-[#F9FAFB] border-[#E5E7EB]">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-[#4CAF50]" />
                        {t("settings.admin_panel_language")}
                    </CardTitle>
                    <p className="text-sm text-[#6B7280] mt-1">
                        {t("settings.admin_panel_desc")}
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-[#374151] min-w-[120px]">
                                {t("settings.select_language")}:
                            </label>
                            <Select value={selectedAdminLanguage} onValueChange={(val: any) => setSelectedAdminLanguage(val)}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder={t("settings.choose_language")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {languages.map((lang) => (
                                        <SelectItem key={`admin-${lang.code}`} value={lang.code}>
                                            <div className="flex items-center gap-2">
                                                <span>{lang.flag}</span>
                                                <span>{lang.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-[#4CAF50] text-white">
                                {t("settings.current")}: {currentLang?.flag} {currentLang?.name}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Client Website Language */}
            <Card className="bg-[#F9FAFB] border-[#E5E7EB]">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-[#2196F3]" />
                        {t("settings.client_website_language")}
                    </CardTitle>
                    <p className="text-sm text-[#6B7280] mt-1">
                        {t("settings.client_website_desc")}
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-[#374151] mb-3 block">
                                {t("settings.select_languages_multi")}:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {languages.map((lang) => (
                                    <div key={`client-${lang.code}`} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`client-${lang.code}`}
                                            checked={clientLanguages.includes(lang.code)}
                                            onCheckedChange={(checked) => handleClientLanguageChange(lang.code, checked)}
                                        />
                                        <label
                                            htmlFor={`client-${lang.code}`}
                                            className="text-sm font-medium text-[#374151] flex items-center gap-2 cursor-pointer"
                                        >
                                            <span>{lang.flag}</span>
                                            <span>{lang.name}</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#374151]"> {t("settings.selected")}:</span>
                            {clientLanguages.map(code => {
                                const lang = languages.find(l => l.code === code);
                                return (
                                    <Badge key={code} variant="secondary" className="bg-[#2196F3] text-white">
                                        {lang?.flag} {lang?.name}
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    className="bg-[#4CAF50] hover:bg-[#45a049] text-white px-6"
                    onClick={handleSave}
                >
                    {t("settings.save_button")}
                </Button>
            </div>
        </div>
    );
}

// Change Password Component
function ChangePasswordSection() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswords, setShowPasswords] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("All fields are required");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("New password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        try {
            setIsSubmitting(true);
            await api.post("/admin/change-password", {
                currentPassword,
                newPassword,
            });
            toast.success("Password changed successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to change password";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="bg-[#F9FAFB] border-[#E5E7EB]">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
                    <Lock className="h-5 w-5 text-[#4CAF50]" />
                    Change Password
                </CardTitle>
                <p className="text-sm text-[#6B7280] mt-1">
                    Update your admin password. Use a strong password.
                </p>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label>Current password</Label>
                        <div className="relative">
                            <Input
                                type={showPasswords ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                disabled={isSubmitting}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                            >
                                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>New password</Label>
                        <Input
                            type={showPasswords ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={isSubmitting}
                            minLength={8}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Confirm new password</Label>
                        <Input
                            type={showPasswords ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={isSubmitting}
                        />
                    </div>
                    <Button
                        onClick={handleChangePassword}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Updating...
                            </>
                        ) : (
                            "Change Password"
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function SettingsPage() {
    const { t } = useLanguage();
    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
                            {/* Getting title from internal component - ideally should pass t prop or move this up */}
                            {t("settings.title")}
                        </h1>
                        <p className="text-[#9CA3AF] text-sm mt-1.5">
                            {t("settings.description")}
                        </p>
                    </div>
                </div>
                <div className="h-px bg-[#E5E7EB]" />
            </div>

            {/* Change Password */}
            <ChangePasswordSection />

            {/* Language Management */}
            <LanguageManagement />
        </div>
    );
}