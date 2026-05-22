"use client";
import VerticalCategoriesCarousel from "@/components/vertical-catgry";
import { usePathname } from "next/navigation";

export default function CategoriesLayout({ children }) {
  const pathname = usePathname();

  // Check if we're on a category detail page (has slug parameter)
  const isCategoryDetailPage =
    pathname.includes("/category/") && pathname.split("/").length > 2;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-8">
        <div className="flex gap-2 md:gap-8">
          {/* Left Sidebar - Vertical Categories - Only on mobile and not on category detail pages */}
          {!isCategoryDetailPage && (
            <div className="flex-shrink-0 md:hidden block">
              <div className="sticky top-24">
                <VerticalCategoriesCarousel />
              </div>
            </div>
          )}

          {/* Right Side - Main Content */}
          <div
            className={`${isCategoryDetailPage ? "w-full" : "flex-1"} min-w-0`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
