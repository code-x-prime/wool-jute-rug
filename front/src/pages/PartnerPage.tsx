import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApprovedPartnersTab from "../components/ApprovedPartnersTab";
import NonApprovedPartnersTab from "../components/NonApprovedPartnersTab";
import { useLanguage } from "@/context/LanguageContext";

export default function PartnerPage() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState("approved");

    return (
        <div className="space-y-8">
            {/* Premium Page Header */}
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
                        {t('partner_management.title')}
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-1.5">
                        {t('partner_management.description')}
                    </p>
                </div>
                <div className="h-px bg-[var(--border-color)]" />
            </div>

            <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-[var(--bg-secondary)] p-1 rounded-lg">
                            <TabsTrigger
                                value="approved"
                                className="data-[state=active]:bg-[var(--accent)]/10 data-[state=active]:text-[var(--accent)] text-[var(--text-primary)]"
                            >
                                {t('partner_management.tabs.approved')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="non-approved"
                                className="data-[state=active]:bg-[var(--accent)]/10 data-[state=active]:text-[var(--accent)] text-[var(--text-primary)]"
                            >
                                {t('partner_management.tabs.non_approved')}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="approved" className="mt-6">
                            <ApprovedPartnersTab />
                        </TabsContent>

                        <TabsContent value="non-approved" className="mt-6">
                            <NonApprovedPartnersTab />
                        </TabsContent>
                    </Tabs>
                </div>
            </Card>
        </div>
    );
}
