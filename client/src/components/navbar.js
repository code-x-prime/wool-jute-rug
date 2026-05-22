"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useState, useEffect, useRef } from "react";
import {
  ShoppingBag,
  User,
  Menu,
  X,
  Search,
  Heart,
  ChevronDown,
  ChevronRight,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { fetchApi } from "@/lib/utils";
import { ClientOnly } from "./client-only";
import { cn } from "@/lib/utils";
import { toast, Toaster } from "sonner";
import Image from "next/image";

const BRAND_BROWN = "#3D1C02";
const BRAND_GOLD = "#C9A84C";
const BRAND_CREAM = "#F5ECD7";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { getCartItemCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [expandedMobileMenu, setExpandedMobileMenu] = useState(null);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const navbarRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isTransparent = isHome && !scrolled;

  // Scroll detection for transparent → white navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setActiveMenu(null);
  }, [pathname]);

  // Handle click outside navbar (for desktop dropdowns)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetchApi("/public/categories-with-subcategories");
        if (response?.data?.categories && response.data.categories.length > 0) {
          setCategories(response.data.categories);

          const dynamicMenuItems = [
            {
              name: "NEW ARRIVALS",
              href: "/products?productType=new",
              highlight: "new",
            },
          ];

          response.data.categories.forEach((category) => {
            const menuItem = {
              name: category.name.toUpperCase(),
              href: `/products?category=${category.slug}`,
            };

            if (category.subCategories && category.subCategories.length > 0) {
              menuItem.megaMenu = {
                categories: [
                  {
                    name: `Shop All ${category.name}`,
                    href: `/products?category=${category.slug}`,
                    bold: true,
                  },
                  ...category.subCategories.map((subCat) => ({
                    name: subCat.name,
                    href: `/products?category=${category.slug}&subCategory=${subCat.slug}`,
                  })),
                ],
              };
            }

            dynamicMenuItems.push(menuItem);
          });

          dynamicMenuItems.push({
            name: "SALE",
            href: "/products?sale=true",
            highlight: "sale",
          });

          setMenuItems(dynamicMenuItems);
        }
      } catch (error) {
        console.log("Categories API failed, using fallback");
        setMenuItems([
          { name: "NEW ARRIVALS", href: "/products?productType=new", highlight: "new" },
          { name: "RUGS & CARPETS", href: "/products" },
          { name: "WOOL RUGS", href: "/products?category=wool" },
          { name: "JUTE RUGS", href: "/products?category=jute" },
          { name: "SALE", href: "/products?sale=true", highlight: "sale" },
        ]);
      }
    };
    fetchCategories();
  }, []);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setIsMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    window.location.href = "/";
  };

  return (
    <>
      <header
        ref={navbarRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "shadow-md" : ""
        )}
      >
        <Toaster position="top-center" richColors />

        {/* ── ANNOUNCEMENT BAR ── */}
        {announcementVisible && (
          <div
            className="py-2 text-xs relative transition-all duration-300 bg-[#c2a59e]"

          >
            <p className="text-center tracking-widest font-jost uppercase text-white">
              FREE SHIPPING ON ORDERS ABOVE ₹999 &nbsp;·&nbsp; HANDCRAFTED PREMIUM RUGS
            </p>
            <button
              onClick={() => setAnnouncementVisible(false)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white opacity-70 hover:opacity-100"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── TOP NAV: Logo | Search | Icons ── */}
        <div
          className="transition-all duration-300 border-b"
          style={{
            backgroundColor: isTransparent ? "transparent" : "white",
            borderColor: isTransparent ? "transparent" : "#e8e0d5",
          }}
        >
          {/* Desktop */}
          <div className="hidden lg:flex items-center justify-between h-20 max-w-[1400px] mx-auto px-6 gap-8">
            {/* Logo */}
            <div className="flex-1 flex justify-start">
              <Link href="/" className="shrink-0 flex items-center h-14 md:h-16">
                <img
                  src="/logo.jpeg"
                  alt="Wool Jute Rug Co"
                  className="h-full w-auto object-contain transition-all duration-300"

                />
              </Link>
            </div>

            {/* Search Bar — hidden on homepage top, visible when scrolled or on other pages */}
            <form
              onSubmit={handleSearch}
              className="flex-1 max-w-[560px] w-full flex items-center border rounded-sm overflow-hidden mx-auto transition-all duration-300"

            >
              <input
                type="text"
                placeholder="Search rugs, carpets, styles..."
                className={cn(
                  "flex-1 px-5 py-3 text-sm outline-none font-roboto bg-white",
                  scrolled
                    ? "placeholder:text-gray-400 text-gray-700"
                    : "placeholder:text-white/70 text-white bg-transparent"
                )}

                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="px-4 py-3 border-l transition-colors"
                style={{
                  borderColor: isTransparent ? "rgba(255,255,255,0.5)" : "#d0c8b8",
                  color: isTransparent ? "white" : BRAND_BROWN,
                }}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>

            {/* Right Icons */}
            <div className="flex-1 flex justify-end items-center gap-6">
              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="flex flex-col items-center gap-0.5 group transition-colors duration-300"
                style={{ color: isTransparent ? "white" : BRAND_BROWN }}
              >
                <Heart className="h-5 w-5 group-hover:fill-current transition-all" />
                <span className="text-[11px] font-jost tracking-wide">WISHLIST</span>
              </Link>

              {/* Account */}
              <ClientOnly>
                <div className="relative">
                  <button
                    className="flex flex-col items-center gap-0.5 group transition-colors duration-300"
                    style={{ color: isTransparent ? "white" : BRAND_BROWN }}
                    onClick={() =>
                      setActiveMenu(activeMenu === "account" ? null : "account")
                    }
                  >
                    <User className="h-5 w-5" />
                    <span className="text-[11px] font-jost tracking-wide">
                      {isAuthenticated ? (user?.name?.split(" ")[0] || "ACCOUNT") : "ACCOUNT"}
                    </span>
                  </button>

                  {/* Account Dropdown */}
                  <div
                    className={cn(
                      "absolute right-0 top-[calc(100%+12px)] w-56 bg-white rounded shadow-2xl border py-2 transition-all duration-200 z-50",
                      activeMenu === "account"
                        ? "opacity-100 visible translate-y-0"
                        : "opacity-0 invisible -translate-y-1 pointer-events-none"
                    )}
                    style={{ borderColor: "#e8e0d5" }}
                  >
                    {isAuthenticated ? (
                      <>
                        <div className="px-4 py-3 border-b" style={{ borderColor: "#e8e0d5" }}>
                          <p className="font-semibold text-sm font-jost" style={{ color: BRAND_BROWN }}>
                            {user?.name || "User"}
                          </p>
                          <p className="text-xs text-gray-400 truncate font-roboto mt-0.5">
                            {user?.email}
                          </p>
                        </div>
                        {[
                          { label: "My Account", href: "/account" },
                          { label: "My Orders", href: "/account/orders" },
                          { label: "My Wishlist", href: "/wishlist" },
                        ].map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="block px-4 py-2.5 text-sm font-roboto transition-colors hover:bg-[#F5ECD7]"
                            style={{ color: BRAND_BROWN }}
                            onClick={() => setActiveMenu(null)}
                          >
                            {link.label}
                          </Link>
                        ))}
                        <div className="border-t mt-1 pt-1" style={{ borderColor: "#e8e0d5" }}>
                          <button
                            onClick={() => { handleLogout(); setActiveMenu(null); }}
                            className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-roboto"
                          >
                            Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 space-y-2">
                        <Link
                          href="/auth"
                          onClick={() => setActiveMenu(null)}
                          className="block w-full text-center py-2.5 text-sm font-semibold font-jost rounded text-white transition-colors"
                          style={{ backgroundColor: BRAND_BROWN }}
                        >
                          Login
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setActiveMenu(null)}
                          className="block w-full text-center py-2.5 text-sm font-semibold font-jost rounded border transition-colors"
                          style={{ borderColor: BRAND_BROWN, color: BRAND_BROWN }}
                        >
                          Register
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </ClientOnly>

              {/* Cart */}
              <ClientOnly>
                <Link
                  href="/cart"
                  className="flex flex-col items-center gap-0.5 relative group transition-colors duration-300"
                  style={{ color: isTransparent ? "white" : BRAND_BROWN }}
                >
                  <div className="relative">
                    <ShoppingBag className="h-5 w-5" />
                    {getCartItemCount() > 0 && (
                      <span
                        className="absolute -top-2 -right-2 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                        style={{ backgroundColor: BRAND_GOLD }}
                      >
                        {getCartItemCount()}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-jost tracking-wide">CART</span>
                </Link>
              </ClientOnly>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="flex lg:hidden items-center h-16 px-3 gap-2">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 transition-colors duration-300"
              style={{ color: isTransparent ? "white" : BRAND_BROWN }}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link href="/" className="flex-1 flex justify-center items-center h-10 sm:h-12">
              <img
                src="/logo.jpeg"
                alt="Wool Jute Rug Co"
                className="h-full w-auto object-contain transition-all duration-300"

              />
            </Link>

            <div className="flex items-center gap-1">
              <ClientOnly>
                <Link href="/cart" className="p-2 relative transition-colors duration-300" style={{ color: isTransparent ? "white" : BRAND_BROWN }}>
                  <ShoppingBag className="h-5 w-5" />
                  {getCartItemCount() > 0 && (
                    <span
                      className="absolute top-0 right-0 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                      style={{ backgroundColor: BRAND_GOLD }}
                    >
                      {getCartItemCount()}
                    </span>
                  )}
                </Link>
              </ClientOnly>
            </div>
          </div>
        </div>

        {/* ── MOBILE SEARCH BAR ── */}
        <div
          className="lg:hidden w-full px-3 py-2 border-b transition-all duration-300"
          style={{
            backgroundColor: isTransparent ? "transparent" : "white",
            borderColor: isTransparent ? "transparent" : "#e8e0d5",
          }}
        >
          <form
            onSubmit={handleSearch}
            className="flex items-center border rounded-sm overflow-hidden"
            style={{ borderColor: isTransparent ? "rgba(255,255,255,0.5)" : "#d0c8b8" }}
          >
            <input
              type="text"
              placeholder="Search rugs..."
              className="flex-1 px-4 py-2 text-sm outline-none font-roboto bg-transparent"
              style={{ color: isTransparent ? "white" : BRAND_BROWN }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="px-3 py-2 border-l bg-transparent"
              style={{
                borderColor: isTransparent ? "rgba(255,255,255,0.5)" : "#d0c8b8",
                color: isTransparent ? "white" : BRAND_BROWN,
              }}
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* ── DESKTOP CATEGORY NAV ── */}
        <nav
          className="hidden lg:block border-b transition-all duration-300"
          style={{
            backgroundColor: isTransparent ? "transparent" : "white",
            borderColor: isTransparent ? "transparent" : "#e8e0d5",
          }}
        >
          <div className="max-w-[1400px] mx-auto px-6">
            <ul className="flex items-center">
              {menuItems.map((item) => (
                <li
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => item.megaMenu && setActiveMenu(item.name)}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  {item.highlight === "new" ? (
                    <Link
                      href={item.href}
                      className="block px-5 py-4 text-sm font-jost tracking-wider transition-colors duration-300"
                      style={{ color: isTransparent ? "rgba(255,255,255,0.9)" : BRAND_GOLD }}
                    >
                      {item.name}
                    </Link>
                  ) : item.highlight === "sale" ? (
                    <Link
                      href={item.href}
                      className="block px-5 py-4 text-sm font-jost tracking-wider transition-colors duration-300"
                      style={{ color: isTransparent ? "rgba(255,255,255,0.9)" : "#CC0000" }}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1 px-5 py-4 text-sm font-jost tracking-wide transition-all duration-300 border-b-2",
                        activeMenu === item.name ? "border-current" : "border-transparent"
                      )}
                      style={{
                        color: activeMenu === item.name
                          ? (isTransparent ? "white" : BRAND_GOLD)
                          : (isTransparent ? "rgba(255,255,255,0.85)" : BRAND_BROWN),
                        borderColor: activeMenu === item.name
                          ? (isTransparent ? "white" : BRAND_GOLD)
                          : "transparent",
                      }}
                    >
                      {item.name}
                      {item.megaMenu && (
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            activeMenu === item.name && "rotate-180"
                          )}
                        />
                      )}
                    </Link>
                  )}

                  {/* Mega Dropdown */}
                  {item.megaMenu && (
                    <div
                      className={cn(
                        "absolute left-0 top-full w-52 bg-white shadow-2xl border-t-2 transition-all duration-200 z-50",
                        activeMenu === item.name
                          ? "opacity-100 visible translate-y-0"
                          : "opacity-0 invisible -translate-y-1 pointer-events-none"
                      )}
                      style={{ borderTopColor: BRAND_GOLD }}
                    >
                      <ul className="py-2">
                        {item.megaMenu.categories.map((cat) => (
                          <li key={cat.href}>
                            <Link
                              href={cat.href}
                              className={cn(
                                "block px-5 py-2.5 text-sm transition-colors hover:bg-[#F5ECD7] font-roboto",
                                cat.bold && "font-semibold font-jost"
                              )}
                              style={{ color: BRAND_BROWN }}
                              onClick={() => setActiveMenu(null)}
                            >
                              {cat.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}

              {/* Extra links */}
              <li className="ml-auto flex items-center gap-0">
                {[
                  { label: "About", href: "/about" },
                  { label: "Custom Rugs", href: "/custom-rugs" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-4 py-4 text-sm font-jost tracking-wide transition-colors"
                    style={{ color: isTransparent ? "rgba(255,255,255,0.8)" : "#8a7a6a" }}
                  >
                    {link.label}
                  </Link>
                ))}
              </li>
            </ul>
          </div>
        </nav>
      </header>

      {/* ── MOBILE SIDE MENU ── */}
      <div
        className={cn(
          "fixed inset-0 z-[60] lg:hidden transition-opacity duration-300",
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />

        {/* Panel */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[85%] max-w-sm flex flex-col transition-transform duration-300",
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
          style={{ backgroundColor: "#fff" }}
        >
          {/* Panel Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ backgroundColor: BRAND_BROWN }}
          >
            <Image src="/logo.jpeg" alt="Wool Jute Rug Co" width={100} height={40} className="object-contain " />
            <button onClick={() => setIsMenuOpen(false)} className="p-1 text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User row */}
          <ClientOnly>
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "#e8e0d5" }}>
              {isAuthenticated ? (
                <div>
                  <p className="font-semibold font-jost text-sm" style={{ color: BRAND_BROWN }}>
                    Hi, {user?.name?.split(" ")[0] || "User"}
                  </p>
                  <p className="text-xs text-gray-400 font-roboto">{user?.email}</p>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="flex items-center gap-2 text-sm font-semibold font-jost"
                  style={{ color: BRAND_BROWN }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  Login / Register
                </Link>
              )}
              <Link href="/wishlist" onClick={() => setIsMenuOpen(false)} className="p-1" style={{ color: BRAND_GOLD }}>
                <Heart className="h-5 w-5" />
              </Link>
            </div>
          </ClientOnly>

          {/* Scrollable menu */}
          <div className="flex-1 overflow-y-auto">
            {/* NEW ARRIVALS highlight */}
            <Link
              href="/products?productType=new"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center justify-between px-4 py-3.5 text-sm font-bold font-jost border-b"
              style={{ color: BRAND_GOLD, borderColor: "#e8e0d5" }}
            >
              NEW ARRIVALS
              <ChevronRight className="h-4 w-4" />
            </Link>

            {/* Dynamic categories */}
            {menuItems
              .filter((item) => !item.highlight)
              .map((item) => (
                <div key={item.name} className="border-b" style={{ borderColor: "#e8e0d5" }}>
                  {item.megaMenu ? (
                    <>
                      <button
                        onClick={() =>
                          setExpandedMobileMenu(
                            expandedMobileMenu === item.name ? null : item.name
                          )
                        }
                        className="flex items-center justify-between w-full px-4 py-3.5 text-sm hover:bg-[#F5ECD7] transition-colors"
                        style={{ color: BRAND_BROWN }}
                      >
                        <span className="font-medium font-jost">{item.name}</span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            expandedMobileMenu === item.name && "rotate-90"
                          )}
                          style={{ color: BRAND_GOLD }}
                        />
                      </button>
                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-300",
                          expandedMobileMenu === item.name
                            ? "max-h-[500px] opacity-100"
                            : "max-h-0 opacity-0"
                        )}
                        style={{ backgroundColor: "#F8F4EE" }}
                      >
                        {item.megaMenu.categories.map((cat) => (
                          <Link
                            key={cat.href}
                            href={cat.href}
                            onClick={() => setIsMenuOpen(false)}
                            className={cn(
                              "block px-6 py-2.5 text-sm transition-colors hover:bg-[#F5ECD7]",
                              cat.bold ? "font-semibold font-jost" : "font-roboto"
                            )}
                            style={{ color: BRAND_BROWN }}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3.5 text-sm hover:bg-[#F5ECD7] transition-colors"
                      style={{ color: BRAND_BROWN }}
                    >
                      <span className="font-medium font-jost">{item.name}</span>
                      <ChevronRight className="h-4 w-4" style={{ color: BRAND_GOLD }} />
                    </Link>
                  )}
                </div>
              ))}

            {/* SALE */}
            <Link
              href="/products?sale=true"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center justify-between px-4 py-3.5 text-sm font-bold font-jost border-b"
              style={{ color: "#CC0000", borderColor: "#e8e0d5" }}
            >
              CLEARANCE SALE
              <ChevronRight className="h-4 w-4" />
            </Link>

            {/* Static extras */}
            <div className="py-3 border-t" style={{ borderColor: "#e8e0d5" }}>
              {[
                { label: "Track Order", href: "/account/orders", icon: <Truck className="h-4 w-4" /> },
                { label: "Contact Us", href: "/contact", icon: <Phone className="h-4 w-4" /> },
                { label: "About Us", href: "/about", icon: <MapPin className="h-4 w-4" /> },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-roboto hover:bg-[#F5ECD7] transition-colors"
                  style={{ color: BRAND_BROWN }}
                >
                  <span style={{ color: BRAND_GOLD }}>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Logout */}
            <ClientOnly>
              {isAuthenticated && (
                <div className="px-4 py-3 border-t" style={{ borderColor: "#e8e0d5" }}>
                  <button
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="w-full py-2.5 text-sm text-red-600 font-semibold hover:bg-red-50 rounded transition-colors font-jost"
                  >
                    Logout
                  </button>
                </div>
              )}
            </ClientOnly>
          </div>
        </div>
      </div>

      {/* ── BOTTOM MOBILE NAV ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-white"
        style={{ borderColor: "#e8e0d5" }}
      >
        <div className="grid grid-cols-4">
          {[
            {
              label: "Home",
              href: "/",
              icon: (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ),
              match: (p) => p === "/",
            },
            {
              label: "Shop",
              href: "/products",
              icon: <Search className="h-5 w-5" />,
              match: (p) => p.startsWith("/products"),
            },
            {
              label: "Wishlist",
              href: "/wishlist",
              icon: <Heart className="h-5 w-5" />,
              match: (p) => p === "/wishlist",
            },
            {
              label: "Cart",
              href: "/cart",
              icon: <ShoppingBag className="h-5 w-5" />,
              match: (p) => p === "/cart",
              cart: true,
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-2.5 transition-colors"
              style={{ color: item.match(pathname) ? BRAND_GOLD : BRAND_BROWN }}
            >
              <div className="relative">
                {item.icon}
                {item.cart && (
                  <ClientOnly>
                    {getCartItemCount() > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                        style={{ backgroundColor: BRAND_GOLD }}
                      >
                        {getCartItemCount()}
                      </span>
                    )}
                  </ClientOnly>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-jost">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Spacer — skip on homepage (hero is full bleed), show on all other pages */}
      {pathname !== "/" && (
        <div className="h-[calc(36px+64px+44px)] lg:h-[164px]" />
      )}
    </>
  );
}
