import { Jost, Roboto } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";
import { RouteGuard } from "@/components/route-guard";
import { ClientOnly } from "@/components/client-only";
import { ScrollToTop } from "@/components/ScrollToTop";
import TawkToWidget from "@/components/TawkToWidget";
import CurrencyInit from "@/components/CurrencyInit";
import { API_URL } from "@/lib/utils";

async function getStoreCurrencyCode() {
  try {
    const res = await fetch(`${API_URL}/public/settings`, { next: { revalidate: 60 } });
    const json = await res.json();
    return json?.data?.storeCurrency || "INR";
  } catch {
    return "INR";
  }
}

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jost",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata = {
  title: "Wool Jute Rug Co - Premium Handcrafted Rugs & Carpets",
  description:
    "Discover premium handcrafted wool and jute rugs at Wool Jute Rug Co. Shop Moroccan, Oriental, Vintage, and custom rugs.",
  keywords:
    "wool rugs, jute rugs, handcrafted carpets, moroccan rugs, oriental rugs, custom rugs, premium carpets",
};

export default async function RootLayout({ children }) {
  const storeCurrency = await getStoreCurrencyCode();
  return (
    <html lang="en">
      <body
        className={`${jost.variable} ${roboto.variable} font-roboto antialiased`}
      >
        <CurrencyInit currency={storeCurrency}>
        <AuthProvider>
          <CartProvider>
            <ScrollToTop />
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <ClientOnly>
                  <RouteGuard>{children}</RouteGuard>
                </ClientOnly>
              </main>
              <Footer />
            </div>
            <Toaster position="top-center" richColors closeButton />
            <TawkToWidget />
          </CartProvider>
        </AuthProvider>
        </CurrencyInit>
      </body>
    </html>
  );
}
