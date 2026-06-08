import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, Navigate, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Resource, Action } from "@/types/admin";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  LogOut,
  Menu,
  X,
  Tag,
  Mail,
  MessageSquare,
  Headphones,
  HelpCircle,
  RotateCcw,
  ChevronDown,
  Settings2,
  Moon,
  Sun,
  Image as ImageIcon,
  Zap,
  LayoutGrid,
  Globe,
  Cloud,
  Layers,
} from "lucide-react";
import { HiVideoCamera } from "react-icons/hi";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { SafeRender } from "@/components/SafeRender";
import InventoryAlertNotification from "@/components/ui/InventoryAlertNotification";
import { useLanguage } from "@/context/LanguageContext";

interface NavItemProps {
  href: string;
  icon: ReactNode;
  title: string;
  onClick?: () => void;
  hasPermission: boolean;
}

const NavItem = ({
  href,
  icon,
  title,
  onClick,
  hasPermission = true,
}: NavItemProps) => {
  const location = useLocation();
  const isActive =
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  if (!hasPermission) return null;

  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        "h-10 flex items-center gap-3 rounded-lg px-3 mx-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-[var(--bg-sidebar-active)] border-l-2 border-[var(--sidebar-active-border)] text-[var(--text-primary)] font-semibold"
          : "text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)]"
      )}
    >
      <span className="flex shrink-0 text-[var(--text-sidebar-icon)]" style={{ width: 18, height: 18 }}>
        {icon}
      </span>
      <span>{title}</span>
    </Link>
  );
};

interface CollapsibleNavItemProps {
  title: string;
  icon: ReactNode;
  children: Array<{
    href: string;
    title: string;
    icon?: ReactNode;
    hasPermission: boolean;
  }>;
  isOpen: boolean;
  onToggle: () => void;
  onClick?: () => void;
}

const CollapsibleNavItem = ({
  title,
  icon,
  children,
  isOpen,
  onToggle,
  onClick,
}: CollapsibleNavItemProps) => {
  const location = useLocation();
  const hasActiveChild = children.some(
    (child) =>
      child.hasPermission &&
      (location.pathname === child.href ||
        location.pathname.startsWith(`${child.href}/`))
  );

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    onToggle();
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={handleToggle}
        className={cn(
          "h-10 flex items-center justify-between gap-3 rounded-lg px-3 mx-2 text-sm font-medium transition-colors w-full text-left",
          hasActiveChild
            ? "bg-[var(--bg-sidebar-active)] text-[var(--text-primary)] font-semibold"
            : "text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)]"
        )}
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="flex shrink-0 text-[var(--text-sidebar-icon)]" style={{ width: 18, height: 18 }}>
            {icon}
          </span>
          <span>{title}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-300 flex-shrink-0",
            isOpen ? "rotate-180" : "rotate-0"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col py-1">
          {children.map((child) => {
            if (!child.hasPermission) return null;
            const isActive =
              location.pathname === child.href ||
              location.pathname.startsWith(`${child.href}/`);

            return (
              <Link
                key={child.href}
                to={child.href}
                onClick={onClick}
                className={cn(
                  "h-9 flex items-center gap-2 pl-9 pr-3 mx-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "text-[var(--text-primary)] font-medium"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <span className={cn(
                  "text-[10px]",
                  isActive ? "opacity-100" : "opacity-60"
                )}>·</span>
                <span>{child.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const hasPermissionFor = (
  admin: { role?: string; permissions?: string[] } | null,
  resource: Resource,
  action?: Action
): boolean => {
  if (admin?.role === "SUPER_ADMIN") return true;

  if (!admin?.permissions || !Array.isArray(admin.permissions)) return false;

  const resourcePrefix = `${resource}:`;

  if (action) {
    const permissionString = `${resource}:${action}`;
    return admin.permissions.some((perm: string) => perm === permissionString);
  } else {
    return admin.permissions.some((perm: string) =>
      perm.startsWith(resourcePrefix)
    );
  }
};

export default function DashboardLayout() {
  const { admin, isAuthenticated, logout, isLoading } = useAuth();
  const { t } = useLanguage();
  const { theme, toggle } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    products: false,
    orders: false,
    users: false,
    support: false,
    settings: false,
  });

  const location = useLocation();

  // Auto-open section if current path matches (accordion - only one open at a time)
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/products") || path.startsWith("/brands") || path.startsWith("/categories") || path.startsWith("/attributes") || path.startsWith("/product-sections") || path.startsWith("/banners") || path.startsWith("/flash-sales")) {
      setOpenSections({
        products: true,
        orders: false,
        users: false,
        support: false,
        settings: false,
      });
    } else if (path.startsWith("/orders") || path.startsWith("/return-requests")) {
      setOpenSections({
        products: false,
        orders: true,
        users: false,
        support: false,
        settings: false,
      });
    } else if (path.startsWith("/users") || path.startsWith("/partner") || path.startsWith("/referrals")) {
      setOpenSections({
        products: false,
        orders: false,
        users: true,
        support: false,
        settings: false,
      });
    } else if (path.startsWith("/contact-management") || path.startsWith("/reviews-management") || path.startsWith("/faq-management")) {
      setOpenSections({
        products: false,
        orders: false,
        users: false,
        support: true,
        settings: false,
      });
    } else if (path.startsWith("/settings") || path.startsWith("/site-settings") || path.startsWith("/moq-settings") || path.startsWith("/pricing-slabs") || path.startsWith("/marketing-settings")) {
      setOpenSections({
        products: false,
        orders: false,
        users: false,
        support: false,
        settings: true,
      });
    } else {
      // Close all sections if on dashboard
      setOpenSections({
        products: false,
        orders: false,
        users: false,
        support: false,
        settings: false,
      });
    }
  }, [location.pathname]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const isCurrentlyOpen = prev[section];
      // If opening a section, close all others (accordion behavior)
      if (!isCurrentlyOpen) {
        return {
          products: false,
          orders: false,
          users: false,
          support: false,
          settings: false,
          [section]: true,
        };
      }
      // If closing, just close this section
      return {
        ...prev,
        [section]: false,
      };
    });
  };

  // Prevent body scrolling
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg text-muted-foreground">{t("admin.loading")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[240px] flex-col bg-[var(--bg-sidebar)] z-30 flex-shrink-0 border-r border-[var(--border-color)]">
        <div className="flex h-16 items-center px-4 py-5">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 font-semibold text-base text-[var(--text-primary)]"
          >
            <Package className="h-5 w-5" style={{ color: "var(--text-sidebar-icon)" }} />
            <span>{t("admin.admin_dashboard")}</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto scrollbar-hide">
          <SafeRender>
            <div className="flex flex-col gap-0.5">
              {/* Dashboard - Single Item */}
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard className="h-[1.125rem] w-[1.125rem]" />}
                title={t("nav.dashboard")}
                hasPermission={hasPermissionFor(
                  admin,
                  Resource.DASHBOARD,
                  Action.READ
                )}
              />

              {/* Products - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.products")}
                icon={<Package className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.products}
                onToggle={() => toggleSection("products")}
                children={[
                  {
                    href: "/products",
                    title: t("nav.all_products"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/products/new",
                    title: t("nav.add_product"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.CREATE
                    ),
                  },
                  {
                    href: "/brands",
                    title: t("nav.brands"),
                    icon: <Tags className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.BRANDS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/categories",
                    title: t("nav.categories"),
                    icon: <Tags className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.CATEGORIES,
                      Action.READ
                    ),
                  },
                  {
                    href: "/attributes",
                    title: t("nav.attributes"),
                    icon: <Tag className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/product-sections",
                    title: t("nav.product_sections"),
                    icon: <LayoutGrid className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/banners",
                    title: t("nav.banners"),
                    icon: <ImageIcon className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.BANNERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/shoppable-carousel",
                    title: "Shoppable Video",
                    icon: <HiVideoCamera className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.BANNERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/flash-sales",
                    title: t("nav.flash_sales"),
                    icon: <Zap className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.READ
                    ),
                  },
                ]}
              />

              {/* Orders - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.orders")}
                icon={<ShoppingCart className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.orders}
                onToggle={() => toggleSection("orders")}
                children={[
                  {
                    href: "/orders",
                    title: t("nav.all_orders"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.ORDERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/return-requests",
                    title: t("nav.return_requests"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.ORDERS,
                      Action.READ
                    ),
                  },
                ]}
              />

              {/* Users - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.users")}
                icon={<Users className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.users}
                onToggle={() => toggleSection("users")}
                children={[
                  {
                    href: "/users",
                    title: t("nav.users"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.USERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/partner",
                    title: t("nav.partners"),
                    icon: <Users className="h-3 w-3" />,
                    hasPermission:
                      admin?.role === "SUPER_ADMIN" ||
                      hasPermissionFor(admin, Resource.USERS, Action.READ),
                  },
                  {
                    href: "/referrals",
                    title: t("nav.referrals"),
                    icon: <Users className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.USERS,
                      Action.READ
                    ),
                  },
                ]}
              />

              {/* Support - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.support")}
                icon={<Headphones className="h-[18px] w-[18px]" />}
                isOpen={openSections.support}
                onToggle={() => toggleSection("support")}
                children={[
                  {
                    href: "/contact-management",
                    title: "Custom Rugs",
                    icon: <Mail className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.CONTACT,
                      Action.READ
                    ),
                  },
                  {
                    href: "/reviews-management",
                    title: t("nav.reviews"),
                    icon: <MessageSquare className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.REVIEWS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/faq-management",
                    title: t("nav.faq"),
                    icon: <HelpCircle className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.FAQS,
                      Action.READ
                    ),
                  },
                  // {
                  //   href: "/admins",
                  //   title: "Admins",
                  //   icon: <Users className="h-3 w-3" />,
                  //   hasPermission: hasPermissionFor(
                  //     admin,
                  //     Resource.ADMINS,
                  //     Action.READ
                  //   ),
                  // },
                  // {
                  //   href: "/admins/new",
                  //   title: "Add Admin",
                  //   icon: <Users className="h-3 w-3" />,
                  //   hasPermission: hasPermissionFor(
                  //     admin,
                  //     Resource.ADMINS,
                  //     Action.CREATE
                  //   ),
                  // }
                ]}
              />

              {/* Settings - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.settings")}
                icon={<Settings2 className="h-[18px] w-[18px]" />}
                isOpen={openSections.settings}
                onToggle={() => toggleSection("settings")}
                children={[
                  {
                    href: "/site-settings",
                    title: "Site Settings",
                    icon: <Globe className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/navigation-settings",
                    title: "Navigation Menu",
                    icon: <Layers className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },


                  {
                    href: "/email-delivery-settings",
                    title: t("nav.email_delivery"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/coupons",
                    title: t("nav.coupons"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.COUPONS,
                      Action.READ
                    ),
                  },
                ]}
              />
            </div>
          </SafeRender>
        </nav>
        <div className="mt-auto p-4 border-t border-[var(--border-color)]">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 font-medium text-sm text-[var(--text-primary)]">
              {admin?.firstName?.charAt(0) || admin?.email?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {admin?.firstName
                  ? `${admin.firstName} ${admin.lastName}`
                  : admin?.email}
              </span>
              <span className="text-xs text-[var(--text-secondary)] capitalize">
                {admin?.role === "SUPER_ADMIN"
                  ? t("admin.role.super_admin")
                  : admin?.role === "ADMIN"
                    ? t("admin.role.admin")
                    : t("admin.role.user")}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] text-sm h-9"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t("admin.logout")}</span>
          </Button>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[240px] transform bg-[var(--bg-sidebar)] transition-transform duration-300 ease-in-out lg:hidden flex flex-col h-full shadow-xl border-r border-[var(--border-color)]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 font-semibold text-base text-[var(--text-primary)]"
            onClick={toggleMobileMenu}
          >
            <Package className="h-5 w-5" style={{ color: "var(--text-sidebar-icon)" }} />
            <span>{t("admin.admin_dashboard")}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-sidebar-hover text-sidebar-foreground"
            onClick={toggleMobileMenu}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 p-3 pb-20 overflow-y-auto scrollbar-hide">
          <SafeRender>
            <div className="flex flex-col gap-0.5">
              {/* Dashboard - Single Item */}
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard className="h-[1.125rem] w-[1.125rem]" />}
                title={t("nav.dashboard")}
                onClick={toggleMobileMenu}
                hasPermission={hasPermissionFor(
                  admin,
                  Resource.DASHBOARD,
                  Action.READ
                )}
              />

              {/* Products - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.products")}
                icon={<Package className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.products}
                onToggle={() => toggleSection("products")}
                onClick={toggleMobileMenu}
                children={[
                  {
                    href: "/products",
                    title: t("nav.all_products"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/products/new",
                    title: t("nav.add_product"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.CREATE
                    ),
                  },
                  {
                    href: "/brands",
                    title: t("nav.brands"),
                    icon: <Tags className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.BRANDS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/categories",
                    title: t("nav.categories"),
                    icon: <Tags className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.CATEGORIES,
                      Action.READ
                    ),
                  },
                  {
                    href: "/attributes",
                    title: t("nav.attributes"),
                    icon: <Tag className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/product-sections",
                    title: t("nav.product_sections"),
                    icon: <LayoutGrid className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/banners",
                    title: t("nav.banners"),
                    icon: <ImageIcon className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.BANNERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/shoppable-carousel",
                    title: "Shoppable Video",
                    icon: <HiVideoCamera className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.BANNERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/flash-sales",
                    title: t("nav.flash_sales"),
                    icon: <Zap className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.READ
                    ),
                  },
                ]}
              />

              {/* Orders - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.orders")}
                icon={<ShoppingCart className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.orders}
                onToggle={() => toggleSection("orders")}
                onClick={toggleMobileMenu}
                children={[
                  {
                    href: "/orders",
                    title: t("nav.all_orders"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.ORDERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/return-requests",
                    title: t("nav.return_requests"),
                    icon: <RotateCcw className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.ORDERS,
                      Action.READ
                    ),
                  },
                ]}
              />

              {/* Users - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.users")}
                icon={<Users className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.users}
                onToggle={() => toggleSection("users")}
                onClick={toggleMobileMenu}
                children={[
                  {
                    href: "/users",
                    title: t("nav.users"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.USERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/partner",
                    title: t("nav.partners"),
                    icon: <Users className="h-3 w-3" />,
                    hasPermission:
                      admin?.role === "SUPER_ADMIN" ||
                      hasPermissionFor(admin, Resource.USERS, Action.READ),
                  },
                  {
                    href: "/referrals",
                    title: t("nav.referrals"),
                    icon: <Users className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.USERS,
                      Action.READ
                    ),
                  },
                ]}
              />

              {/* Support - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.support")}
                icon={<Headphones className="h-[18px] w-[18px]" />}
                isOpen={openSections.support}
                onToggle={() => toggleSection("support")}
                onClick={toggleMobileMenu}
                children={[
                  {
                    href: "/contact-management",
                    title: "Custom Rugs",
                    icon: <Mail className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.CONTACT,
                      Action.READ
                    ),
                  },
                  {
                    href: "/reviews-management",
                    title: t("nav.reviews"),
                    icon: <MessageSquare className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.REVIEWS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/faq-management",
                    title: t("nav.faq"),
                    icon: <HelpCircle className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.FAQS,
                      Action.READ
                    ),
                  },
                ]}
              />

              {/* Settings - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.settings")}
                icon={<Settings2 className="h-[18px] w-[18px]" />}
                isOpen={openSections.settings}
                onToggle={() => toggleSection("settings")}
                onClick={toggleMobileMenu}
                children={[
                  {
                    href: "/site-settings",
                    title: "Site Settings",
                    icon: <Globe className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/navigation-settings",
                    title: "Navigation Menu",
                    icon: <Layers className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/site-settings?tab=media",
                    title: "Media Storage (Images)",
                    icon: <Cloud className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/price-visibility-settings",
                    title: t("nav.price_visibility"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },

                  {
                    href: "/payment-settings",
                    title: t("nav.payment"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/payment-gateway-settings",
                    title: t("nav.gateway_keys"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/shiprocket-settings",
                    title: t("nav.shiprocket"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/email-delivery-settings",
                    title: t("nav.email_delivery"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/coupons",
                    title: t("nav.coupons"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.COUPONS,
                      Action.READ
                    ),
                  },
                ]}
              />
            </div>
          </SafeRender>
        </nav>
        <div className="mt-auto p-4 border-t border-[var(--border-color)]">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 font-medium text-sm text-[var(--text-primary)]">
              {admin?.firstName?.charAt(0) || admin?.email?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {admin?.firstName
                  ? `${admin.firstName} ${admin.lastName}`
                  : admin?.email}
              </span>
              <span className="text-xs text-[var(--text-secondary)] capitalize">
                {admin?.role === "SUPER_ADMIN"
                  ? t("admin.role.super_admin")
                  : admin?.role === "ADMIN"
                    ? t("admin.role.admin")
                    : t("admin.role.user")}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] text-sm h-9"
            onClick={() => {
              toggleMobileMenu();
              logout();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t("admin.logout")}</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex w-full flex-col flex-1 min-w-0 min-h-0 lg:ml-[240px] overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between px-4 lg:px-6 bg-[var(--bg-primary)] border-b border-[var(--border-color)] sticky top-0 z-20">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 lg:hidden"
              onClick={toggleMobileMenu}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-semibold text-foreground lg:hidden">{t("admin.admin_dashboard")}</span>
          </div>

          {/* Inventory Alerts - Desktop */}
          <div className="hidden md:block flex-1 max-w-md">
            <SafeRender>
              <InventoryAlertNotification />
            </SafeRender>
          </div>

          {/* Right side: Theme toggle + User */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span className="hidden text-sm text-muted-foreground lg:inline-block">
              {admin?.firstName
                ? `${admin.firstName} ${admin.lastName}`
                : admin?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Mobile Alert Bar */}
        <div className="lg:hidden">
          <SafeRender>
            <InventoryAlertNotification />
          </SafeRender>
        </div>

        {/* Main content area */}
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-[var(--bg-secondary)] p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
