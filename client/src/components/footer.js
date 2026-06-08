"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Send,
} from "lucide-react";

// Light theme — Jaipur Rugs style
const TEXT_DARK = "#1a1a1a";
const TEXT_MED = "#444444";
const TEXT_MUTED = "#888888";
const ACCENT = "#C9A84C";
const BG_WHITE = "#ffffff";
const BG_LIGHT = "#f7f4f0";
const BORDER = "#e5e0da";
const BRAND_BROWN = "#3D1C02";

const FooterLink = ({ href, children }) => (
  <li>
    <Link
      href={href}
      className="text-sm block py-[3px] transition-colors duration-150 hover:text-[#C9A84C] font-roboto"
      style={{ color: TEXT_MED }}
    >
      {children}
    </Link>
  </li>
);

const FooterHeading = ({ children }) => (
  <h3
    className="text-xs font-bold uppercase tracking-[0.16em] mb-4 font-jost"
    style={{ color: TEXT_DARK }}
  >
    {children}
  </h3>
);

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const pathname = usePathname();

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  // Render simplified checkout footer to avoid distractions and spacing clutter
  if (pathname === "/checkout") {
    return (
      <footer className="py-8 border-t font-jost" style={{ backgroundColor: BG_WHITE, borderColor: BORDER }}>
        <div className="max-w-[1400px] mx-auto px-6 text-center space-y-4">
          <p className="text-xs tracking-wide leading-relaxed text-gray-500 max-w-3xl mx-auto font-roboto">
            Your privacy matters to us. Wool Jute Rug Co. collects only the information necessary to process orders, improve customer experience, and comply with legal requirements. We never sell customer data and take reasonable measures to protect your information in accordance with international privacy standards.
          </p>
          <p className="text-xs tracking-widest leading-relaxed uppercase" style={{ color: TEXT_MED }}>
            By using this website, you agree to our{" "}
            <Link href="/terms-conditions" className="underline hover:text-[#C9A84C] transition-colors">Terms</Link>,{" "}
            <Link href="/privacy-policy" className="underline hover:text-[#C9A84C] transition-colors">Privacy Policy</Link>, and{" "}
            <Link href="/refund-policy" className="underline hover:text-[#C9A84C] transition-colors">Return Policy</Link>.
          </p>
          <p className="text-[10px] mt-2 tracking-wider" style={{ color: TEXT_MUTED }}>
            &copy; {new Date().getFullYear()} Wool Jute Rug Co. All Rights Reserved. | Designed &amp; Developed by{" "}
            <a href="https://groxmedia.in/" target="_blank" rel="noopener noreferrer" className="hover:text-[#C9A84C] font-semibold transition-colors">
              Grox Media LLP
            </a>
          </p>
        </div>
      </footer>
    );
  }



  const shopLinks = [
    { label: "All Rugs", href: "/products" },
    { label: "Wool Rugs", href: "/products?category=wool" },
    { label: "Jute Rugs", href: "/products?category=jute" },
    { label: "Moroccan Rugs", href: "/products?category=moroccan" },
    { label: "Oriental Rugs", href: "/products?category=oriental" },
    { label: "Vintage Rugs", href: "/products?category=vintage" },
    { label: "New Arrivals", href: "/products?productType=new" },
    { label: "Sale", href: "/products?sale=true" },
  ];

  const policyLinks = [
    { label: "FAQs", href: "/faqs" },
    { label: "Shipping & Delivery", href: "/shipping-policy" },
    { label: "Return Policy", href: "/refund-policy" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms-conditions" },
  ];

  const serviceLinks = [
    { label: "Rug Washing & Repair", href: "/rug-services" },
    { label: "AMC Plans", href: "/rug-services#amc" },
    { label: "Custom Rug Orders", href: "/custom-rugs" },
    { label: "Track Order", href: "/account/orders" },
    { label: "Contact Support", href: "/contact" },
    { label: "About Us", href: "/about" },
  ];

  const socials = [
    { icon: <Twitter size={15} />, href: "https://twitter.com/wooljuterugco", label: "Twitter" },
    { icon: <Facebook size={15} />, href: "https://www.facebook.com/wooljuterugco", label: "Facebook" },
    { icon: <Linkedin size={15} />, href: "https://linkedin.com/company/wooljuterugco", label: "LinkedIn" },
    { icon: <Instagram size={15} />, href: "https://www.instagram.com/wooljuterugco", label: "Instagram" },
    { icon: <Youtube size={15} />, href: "https://youtube.com/@wooljuterugco", label: "YouTube" },
  ];

  return (
    <footer style={{ backgroundColor: BG_WHITE }}>



      {/* ── MAIN FOOTER BODY ── */}
      <div style={{ backgroundColor: BG_WHITE }} className="pt-12 pb-6">
        <div className="max-w-[1400px] mx-auto px-6">

          {/* 5-column grid */}
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6 pb-10 border-b"
            style={{ borderColor: BORDER }}
          >

            {/* ── COL 1: About ── */}
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <FooterHeading>About Us</FooterHeading>
              <ul className="space-y-1">
                {[
                  { label: "Our Story", href: "/about" },
                  { label: "Handcrafted Process", href: "/about" },
                  { label: "Sustainability", href: "/about" },
                  { label: "Careers", href: "/contact" },
                ].map((l) => (
                  <FooterLink key={l.label} href={l.href}>{l.label}</FooterLink>
                ))}
              </ul>

              <div className="mt-6">
                <FooterHeading>Blog</FooterHeading>
                <ul className="space-y-1">
                  {[
                    { label: "Rug Care Guide", href: "/faqs" },
                    { label: "How to Choose a Rug", href: "/faqs" },
                  ].map((l) => (
                    <FooterLink key={l.label} href={l.href}>{l.label}</FooterLink>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── COL 2: Guides & Policies ── */}
            <div>
              <FooterHeading>Guides &amp; Policies</FooterHeading>
              <ul className="space-y-1">
                {policyLinks.map((l) => (
                  <FooterLink key={l.label} href={l.href}>{l.label}</FooterLink>
                ))}
              </ul>

              <div className="mt-6">
                <FooterHeading>Services</FooterHeading>
                <ul className="space-y-1">
                  {serviceLinks.map((l) => (
                    <FooterLink key={l.label} href={l.href}>{l.label}</FooterLink>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── COL 3: Shop ── */}
            <div>
              <FooterHeading>Shop</FooterHeading>
              <ul className="space-y-1">
                {shopLinks.map((l) => (
                  <FooterLink key={l.label} href={l.href}>{l.label}</FooterLink>
                ))}
              </ul>
            </div>

            {/* ── COL 4: Our Stores / Contact ── */}
            <div>
              <FooterHeading>Contact Us</FooterHeading>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: ACCENT }} />
                  <p className="text-sm font-roboto leading-snug" style={{ color: TEXT_MED }}>
                    89/2 Sector 39,<br />Gurugram, Haryana
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="shrink-0" style={{ color: ACCENT }} />
                  <a href="tel:+919999900000" className="text-sm font-roboto hover:text-[#C9A84C] transition-colors" style={{ color: TEXT_MED }}>
                    +91 99999 00000
                  </a>
                </div>
                <div className="flex items-start gap-2.5">
                  <Mail size={14} className="mt-0.5 shrink-0" style={{ color: ACCENT }} />
                  <a href="mailto:connect.wooljuterugco@gmail.com" className="text-sm font-roboto break-all hover:text-[#C9A84C] transition-colors" style={{ color: TEXT_MED }}>
                    connect.wooljuterugco@gmail.com
                  </a>
                </div>
                <p className="text-xs font-roboto pl-0" style={{ color: TEXT_MUTED }}>
                  Mon–Sat / 10AM–7PM (IST)
                </p>
              </div>

              {/* Book Consultation */}
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 mt-5 text-xs font-bold font-jost uppercase tracking-wider transition-all duration-200 hover:underline"
                style={{ color: BRAND_BROWN }}
              >
                Book a Consultation <ArrowRight size={12} />
              </Link>

              {/* Social Icons */}
              <div className="mt-5 flex gap-2 flex-wrap">
                {socials.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200 hover:border-[#C9A84C] hover:text-[#C9A84C]"
                    style={{ borderColor: BORDER, color: TEXT_MED }}
                  >
                    {s.icon}
                  </Link>
                ))}
              </div>
            </div>

            {/* ── COL 5: Newsletter ── */}
            <div>
              <FooterHeading>Subscribe to Newsletter</FooterHeading>
              <p className="text-sm font-roboto mb-4" style={{ color: TEXT_MUTED }}>
                Get exclusive offers, new arrivals &amp; rug care tips in your inbox.
              </p>

              {subscribed ? (
                <div
                  className="text-sm font-roboto px-4 py-3 rounded"
                  style={{ backgroundColor: "rgba(201,168,76,0.1)", color: BRAND_BROWN, border: `1px solid rgba(201,168,76,0.4)` }}
                >
                  ✓ Thank you for subscribing!
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex border rounded overflow-hidden" style={{ borderColor: BORDER }}>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-3 py-2.5 text-sm font-roboto outline-none bg-white"
                    style={{ color: TEXT_DARK }}
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2.5 shrink-0 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: BRAND_BROWN, color: "#fff" }}
                    aria-label="Subscribe"
                  >
                    <Send size={14} />
                  </button>
                </form>
              )}
              {/* Payment badges */}
              <div className="mt-8">
                <p
                  className="text-[10px] uppercase tracking-widest font-jost mb-3"
                  style={{ color: TEXT_MUTED }}
                >
                  Secure Payments
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  {[
                    { name: "Visa", src: "/visa.svg", height: "h-4.5" },
                    { name: "Mastercard", src: "/mastercard.svg", height: "h-6.5" },
                    { name: "G Pay", src: "/gpay.png", height: "h-5" },
                    { name: "PhonePe", src: "/phonepe.svg", height: "h-5" },
                    { name: "Paytm", src: "/paytm.svg", height: "h-4.5" },
                    { name: "PayPal", src: "/paypal.svg", height: "h-4.5" },
                    { name: "Payoneer", src: "/payoneer.svg", height: "h-3.5" }
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="px-3 py-2 rounded flex items-center justify-center bg-white border border-[#e5e0da] h-10 min-w-[56px]"
                      title={p.name}
                    >
                      <img
                        src={p.src}
                        alt={p.name}
                        className={`${p.height} w-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-200`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── COPYRIGHT BAR ── */}
          <div
            className="pt-5 flex flex-col md:flex-row items-center justify-between gap-3"
          >
            <p className="text-xs font-roboto text-center md:text-left" style={{ color: TEXT_MUTED }}>
              &copy; {new Date().getFullYear()}{" "}
              <span className="font-semibold" style={{ color: TEXT_DARK }}>Wool Jute Rug Co</span>
              . All Rights Reserved. Handcrafted with ❤️ | Designed &amp; Developed by{" "}
              <a href="https://groxmedia.in/" target="_blank" rel="noopener noreferrer" className="hover:text-[#C9A84C] font-semibold transition-colors" style={{ color: TEXT_DARK }}>
                Grox Media LLP
              </a>
            </p>
            <div className="flex items-center gap-5">
              {[
                { label: "Privacy Policy", href: "/privacy-policy" },
                { label: "Terms", href: "/terms-conditions" },
                { label: "Sitemap", href: "/" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs font-roboto transition-colors hover:text-[#C9A84C]"
                  style={{ color: TEXT_MUTED }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Mobile spacer for bottom nav bar */}
      <div className="lg:hidden h-14 bg-white" />
    </footer>
  );
}
