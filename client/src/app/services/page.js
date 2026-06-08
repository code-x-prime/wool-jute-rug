"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ServicesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/rug-services");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3D1C02] border-t-transparent mx-auto mb-4" />
        <p className="text-[#3D1C02] font-jost text-sm tracking-wider">Loading Services...</p>
      </div>
    </div>
  );
}
