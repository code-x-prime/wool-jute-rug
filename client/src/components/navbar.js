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
  ArrowRight,
  Image as ImageIcon,
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
  const [menuItems, setMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [expandedMobileMenu, setExpandedMobileMenu] = useState(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState(null);
  const [expandedCategoryMobile, setExpandedCategoryMobile] = useState(null);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const navbarRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isTransparent = isHome && !scrolled && !activeMenu;

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
    setShowSearchDropdown(false);
  }, [pathname]);

  // Handle click outside navbar (for desktop dropdowns and search)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setActiveMenu(null);
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search fetching
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setShowSearchDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchDropdown(true);
      try {
        const response = await fetchApi(`/public/products?search=${encodeURIComponent(searchQuery)}&limit=6`);
        if (response?.data?.products) {
          setSearchResults(response.data.products);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching products:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fetch navigation menu from API
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await fetchApi("/public/menus");
        if (response?.data?.navbarItems && response.data.navbarItems.length > 0) {
          setMenuItems(response.data.navbarItems);

          // Initialize first category tab as active for SHOP_TABS layout
          const shopTab = response.data.navbarItems.find((item) => item.layout === "SHOP_TABS");
          if (shopTab && shopTab.categories && shopTab.categories.length > 0) {
            setActiveCategoryTab(shopTab.categories[0].id);
          }
        }
      } catch (error) {
        console.log("Menus API failed, using fallback:", error);
        setMenuItems([
          {
            id: "fallback-shop",
            label: "SHOP",
            layout: "SHOP_TABS",
            isActive: true,
            categories: [
              {
                id: "fb-rugs",
                name: "RUGS",
                slug: "rugs",
                columns: [
                  {
                    id: "fb-col-size",
                    title: "SIZE",
                    links: [
                      { id: "s1", label: "2x3 Ft", url: "/products?size=2x3" },
                      { id: "s2", label: "3x5 Ft", url: "/products?size=3x5" },
                    ],
                  },
                ],
              },
            ],
          },
        ]);
      }
    };
    fetchMenus();
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
      setShowSearchDropdown(false);
      setIsMenuOpen(false);
    }
  };

  const renderSearchDropdown = () => {
    if (!showSearchDropdown) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e0d5] rounded shadow-2xl z-[100] max-h-[420px] overflow-y-auto no-scrollbar font-roboto">
        {isSearching ? (
          <div className="flex items-center justify-center py-6 px-4 gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#3D1C02] border-t-transparent"></div>
            <span>Searching for &ldquo;{searchQuery}&rdquo;...</span>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="py-2">
            <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 tracking-wider border-b border-gray-100 uppercase">
              Products Found ({searchResults.length})
            </div>
            <div className="divide-y divide-gray-100">
              {searchResults.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  onClick={() => {
                    setShowSearchDropdown(false);
                    setSearchQuery("");
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5ECD7]/40 transition-colors group"
                >
                  <div className="relative h-12 w-12 rounded border border-gray-100 overflow-hidden bg-gray-50 shrink-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-100">
                        <ImageIcon className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="text-sm font-medium text-gray-800 truncate group-hover:text-[#3D1C02]">
                      {product.name}
                    </h4>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {product.category?.name || "Rugs"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {product.hasSale ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-xs text-gray-400 line-through">
                          ₹{product.regularPrice}
                        </span>
                        <span className="text-sm font-semibold text-[#CC0000]">
                          ₹{product.basePrice}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-gray-700">
                        ₹{product.basePrice}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50 flex justify-between items-center text-xs">
              <span className="text-gray-500">Showing top results</span>
              <button
                onClick={(e) => {
                  handleSearch(e);
                  setShowSearchDropdown(false);
                }}
                className="font-semibold text-[#3D1C02] hover:text-[#C9A84C] transition-colors flex items-center gap-0.5"
              >
                <span>View all results</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-500 font-roboto">
            No products found matching &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>
    );
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
            <div className="relative flex-1 max-w-[560px] w-full mx-auto">
              <form
                onSubmit={handleSearch}
                className="w-full flex items-center border rounded-sm overflow-hidden transition-all duration-300"
              >
                <input
                  type="text"
                  placeholder="Search rugs, carpets, styles..."
                  className={cn(
                    "flex-1 px-5 py-3 text-sm outline-none font-roboto",
                    !isTransparent
                      ? "placeholder:text-gray-400 text-gray-700 bg-white"
                      : "placeholder:text-white/70 text-white bg-transparent"
                  )}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowSearchDropdown(true);
                  }}
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
              {renderSearchDropdown()}
            </div>

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
          className="lg:hidden w-full px-3 py-2 border-b transition-all duration-300 relative"
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setShowSearchDropdown(true);
              }}
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
          {renderSearchDropdown()}
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
            <ul className="flex items-center justify-center gap-6">
              {menuItems.map((item) => {
                const hasMega = item.layout !== "SIMPLE" || (item.columns && item.columns.length > 0);
                const isItemActive = activeMenu === item.label;

                return (
                  <li
                    key={item.id}
                    className={cn(item.layout === "SIMPLE" ? "relative" : "static")}
                    onMouseEnter={() => hasMega && setActiveMenu(item.label)}
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    {item.slug ? (
                      <Link
                        href={item.slug}
                        className={cn(
                          "flex items-center gap-1 px-4 py-4 text-xs font-jost tracking-[0.2em] font-medium uppercase transition-all duration-300 border-b-2",
                          isItemActive ? "border-current" : "border-transparent"
                        )}
                        style={{
                          color: isTransparent ? "rgba(255,255,255,0.85)" : BRAND_BROWN,
                        }}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          "flex items-center gap-1 px-4 py-4 text-xs font-jost tracking-[0.2em] font-medium uppercase transition-all duration-300 border-b-2 cursor-pointer select-none",
                          isItemActive ? "border-current" : "border-transparent"
                        )}
                        style={{
                          color: isItemActive
                            ? (isTransparent ? "white" : BRAND_GOLD)
                            : (isTransparent ? "rgba(255,255,255,0.85)" : BRAND_BROWN),
                          borderColor: isItemActive
                            ? (isTransparent ? "white" : BRAND_GOLD)
                            : "transparent",
                        }}
                      >
                        {item.label}
                        {hasMega && (
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-300",
                              isItemActive && "rotate-180"
                            )}
                          />
                        )}
                      </span>
                    )}

                    {/* Mega Dropdown */}
                    {hasMega && (
                      <div
                        className={cn(
                          "bg-white shadow-2xl border-t transition-all duration-300 z-50 py-8 text-black left-0 right-0",
                          item.layout === "SIMPLE"
                            ? "absolute top-full w-56 px-0"
                            : "absolute top-full w-full px-6 border-b"
                        )}
                        style={{
                          opacity: isItemActive ? 1 : 0,
                          visibility: isItemActive ? "visible" : "hidden",
                          transform: isItemActive ? "translateY(0)" : "translateY(-4px)",
                          borderColor: "#e8e0d5"
                        }}
                      >
                        {/* 1. SHOP_TABS LAYOUT */}
                        {item.layout === "SHOP_TABS" && (
                          <div className="max-w-[1400px] mx-auto grid grid-cols-[260px_1fr] gap-8">
                            {/* Left Category Sidebar */}
                            <div className="border-r border-[#e8e0d5] pr-6 flex flex-col gap-1 max-h-[480px] overflow-y-auto no-scrollbar">
                              {item.categories?.map((cat) => (
                                <button
                                  key={cat.id}
                                  className={cn(
                                    "w-full text-left px-3 py-2 text-xs font-semibold tracking-widest font-jost transition-all duration-150 rounded-sm flex items-center justify-between border-l-2",
                                    activeCategoryTab === cat.id
                                      ? "bg-[#F5ECD7] text-[#3D1C02] border-[#C9A84C]"
                                      : "text-gray-700 hover:bg-gray-50 border-transparent"
                                  )}
                                  onMouseEnter={() => setActiveCategoryTab(cat.id)}
                                >
                                  {cat.name.toUpperCase()}
                                  <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                                </button>
                              ))}
                            </div>

                            {/* Right Columns Content */}
                            <div className="min-h-[350px] max-h-[480px] overflow-y-auto no-scrollbar flex-1">
                              {(() => {
                                const activeCat = item.categories?.find(c => c.id === activeCategoryTab);
                                if (!activeCat || !activeCat.columns || activeCat.columns.length === 0) {
                                  return (
                                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                      No columns configured.
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-wrap gap-8 justify-between w-full">
                                    {activeCat.columns.map((col) => (
                                      <div key={col.id} className="flex-1 min-w-[150px] max-w-[240px] flex flex-col gap-2">
                                        <h4 className="font-medium text-xs text-gray-400 uppercase tracking-widest border-b pb-2 mb-2">
                                          {col.title}
                                        </h4>
                                        <ul className="flex flex-col gap-2">
                                          {col.links?.map((lnk) => (
                                            <li key={lnk.id}>
                                              <Link
                                                href={lnk.url}
                                                className="text-sm text-gray-700 hover:text-amber-700 transition-colors inline-block font-roboto"
                                                onClick={() => setActiveMenu(null)}
                                              >
                                                {lnk.label}
                                                {lnk.badge && (
                                                  <span className="ml-1 text-[8px] bg-red-100 text-red-600 font-bold px-1 rounded">
                                                    {lnk.badge}
                                                  </span>
                                                )}
                                              </Link>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* 2. COLUMNS_WITH_BANNER LAYOUT */}
                        {item.layout === "COLUMNS_WITH_BANNER" && (
                          <div className="max-w-[1400px] mx-auto grid grid-cols-[1fr_320px] gap-8">
                            <div className="flex flex-wrap gap-8 justify-start flex-1">
                              {item.columns?.map((col) => (
                                <div key={col.id} className="flex-1 min-w-[150px] max-w-[240px] flex flex-col gap-2">
                                  <h4 className="font-medium text-xs text-gray-400 uppercase tracking-widest border-b pb-2 mb-2">
                                    {col.title}
                                  </h4>
                                  <ul className="flex flex-col gap-2">
                                    {col.links?.map((lnk) => (
                                      <li key={lnk.id}>
                                        <Link
                                          href={lnk.url}
                                          className="text-sm text-gray-700 hover:text-amber-700 transition-colors inline-block font-roboto"
                                          onClick={() => setActiveMenu(null)}
                                        >
                                          {lnk.label}
                                          {lnk.badge && (
                                            <span className="ml-1 text-[8px] bg-red-100 text-red-600 font-bold px-1 rounded">
                                              {lnk.badge}
                                            </span>
                                          )}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>

                            <div className="bg-[#F8F4EE] border border-[#e8e0d5] p-5 rounded flex flex-col justify-between items-center text-center shadow-inner relative overflow-hidden group min-h-[300px]">
                              {item.bannerImage ? (
                                <>
                                  <img
                                    src={item.bannerImage}
                                    alt={item.bannerTitle || "Banner"}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                  <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col items-center z-10">
                                    <p className="font-jost text-base font-bold tracking-widest uppercase mb-3 text-center">
                                      {item.bannerTitle}
                                    </p>
                                    <Link
                                      href={item.bannerLink || "/products"}
                                      className="px-6 py-2.5 bg-white text-black font-semibold text-[10px] tracking-widest uppercase rounded hover:bg-[#F5ECD7] hover:text-[#3D1C02] transition-colors"
                                      onClick={() => setActiveMenu(null)}
                                    >
                                      {item.bannerSubtitle || "SHOP NOW"}
                                    </Link>
                                  </div>
                                </>
                              ) : (
                                <div className="flex h-full flex-col justify-center items-center p-4">
                                  <ImageIcon className="h-10 w-10 text-gray-300 mb-2" />
                                  <p className="text-xs font-semibold text-gray-500">{item.bannerTitle || "Trending Bestsellers"}</p>
                                  <Link
                                    href={item.bannerLink || "/products"}
                                    className="mt-4 px-4 py-2 bg-[#3D1C02] text-white rounded text-[10px] uppercase tracking-widest font-semibold"
                                    onClick={() => setActiveMenu(null)}
                                  >
                                    {item.bannerSubtitle || "Shop Now"}
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 3. IMAGE_GRID LAYOUT */}
                        {item.layout === "IMAGE_GRID" && (
                          <div className="max-w-[1400px] mx-auto">
                            <div className="grid grid-cols-6 gap-6">
                              {item.columns?.[0]?.links?.map((lnk) => (
                                <Link
                                  key={lnk.id}
                                  href={lnk.url}
                                  className="relative block aspect-[4/5] rounded overflow-hidden shadow group"
                                  onClick={() => setActiveMenu(null)}
                                >
                                  {lnk.image ? (
                                    <img
                                      src={lnk.image}
                                      alt={lnk.label}
                                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                                      <ImageIcon className="h-8 w-8 text-gray-300" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-colors" />
                                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white z-10">
                                    <span className="font-jost text-xs tracking-widest font-semibold uppercase">{lnk.label}</span>
                                    <ArrowRight className="h-4 w-4 transform -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. SIMPLE / FALLBACK */}
                        {item.layout === "SIMPLE" && (
                          <ul className="py-2">
                            {item.columns?.[0]?.links?.map((lnk) => (
                              <li key={lnk.id}>
                                <Link
                                  href={lnk.url}
                                  className="block px-5 py-2.5 text-sm transition-colors hover:bg-[#F5ECD7] font-roboto text-gray-700"
                                  onClick={() => setActiveMenu(null)}
                                >
                                  {lnk.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
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
            {menuItems.map((item) => {
              const hasSubmenu = item.layout !== "SIMPLE" || (item.columns && item.columns.length > 0);
              const isExpanded = expandedMobileMenu === item.id;

              if (!hasSubmenu) {
                return (
                  <div key={item.id} className="border-b" style={{ borderColor: "#e8e0d5" }}>
                    <Link
                      href={item.slug || "/products"}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3.5 text-sm hover:bg-[#F5ECD7] transition-colors"
                      style={{ color: BRAND_BROWN }}
                    >
                      <span className="font-medium font-jost">{item.label}</span>
                      <ChevronRight className="h-4 w-4" style={{ color: BRAND_GOLD }} />
                    </Link>
                  </div>
                );
              }

              return (
                <div key={item.id} className="border-b" style={{ borderColor: "#e8e0d5" }}>
                  <button
                    onClick={() => setExpandedMobileMenu(isExpanded ? null : item.id)}
                    className="flex items-center justify-between w-full px-4 py-3.5 text-sm hover:bg-[#F5ECD7] transition-colors"
                    style={{ color: BRAND_BROWN }}
                  >
                    <span className="font-medium font-jost">{item.label}</span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}
                      style={{ color: BRAND_GOLD }}
                    />
                  </button>

                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300",
                      isExpanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
                    )}
                    style={{ backgroundColor: "#F8F4EE" }}
                  >
                    {item.layout === "SHOP_TABS" ? (
                      <div className="pl-4">
                        {item.categories?.map((cat) => {
                          const isCatExpanded = expandedCategoryMobile === cat.id;
                          return (
                            <div key={cat.id} className="border-b border-[#e8e0d5]/40">
                              <button
                                onClick={() => setExpandedCategoryMobile(isCatExpanded ? null : cat.id)}
                                className="flex items-center justify-between w-full py-2.5 pr-4 text-xs font-semibold text-gray-700 font-jost"
                              >
                                {cat.name.toUpperCase()}
                                <ChevronRight
                                  className={cn("h-3.5 w-3.5 transition-transform duration-200", isCatExpanded && "rotate-90")}
                                />
                              </button>

                              <div
                                className={cn(
                                  "overflow-hidden transition-all duration-200 pl-4 space-y-3 bg-white/40",
                                  isCatExpanded ? "max-h-[500px] py-2" : "max-h-0 opacity-0"
                                )}
                              >
                                {cat.columns?.map((col) => (
                                  <div key={col.id} className="py-1">
                                    <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{col.title}</div>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                      {col.links?.map((lnk) => (
                                        <Link
                                          key={lnk.id}
                                          href={lnk.url}
                                          onClick={() => setIsMenuOpen(false)}
                                          className="text-xs text-gray-600 hover:text-amber-700 px-2.5 py-1 bg-white border border-[#e8e0d5] rounded-full"
                                        >
                                          {lnk.label}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-3 px-4 space-y-4">
                        {item.columns?.map((col) => (
                          <div key={col.id}>
                            <h5 className="font-bold text-[10px] text-gray-400 tracking-widest uppercase border-b pb-1 mb-2">
                              {col.title}
                            </h5>
                            <div className="grid grid-cols-2 gap-2">
                              {col.links?.map((lnk) => (
                                <Link
                                  key={lnk.id}
                                  href={lnk.url}
                                  onClick={() => setIsMenuOpen(false)}
                                  className="text-xs text-gray-600 hover:text-amber-700 py-1.5 inline-block truncate"
                                >
                                  {lnk.label}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

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
