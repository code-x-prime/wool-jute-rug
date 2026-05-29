"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import ProducCard from "@/components/ProducCard";

// Helper function to format image URLs correctly
const getImageUrl = (image) => {
  if (!image) return "/images/blog-placeholder.png";
  if (image.startsWith("http")) return image;
  return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
};

export default function CategoryPage() {
  const params = useParams();
  const { slug } = params;
  const searchParams = useSearchParams();
  const router = useRouter();

  // subcategory can come from query param ?sub=...
  const subSlug = searchParams.get("sub") || "";

  const [category, setCategory] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState("newest");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 16,
    total: 0,
    pages: 0,
  });

  // Fetch category info + sub-categories (once on slug change)
  useEffect(() => {
    if (!slug) return;
    const fetchCategoryMeta = async () => {
      try {
        // Fetch category metadata — use the all-categories list to find sub-categories
        const res = await fetchApi(`/public/categories`);
        const allCats = res?.data?.categories || [];
        const found = allCats.find((c) => c.slug === slug);
        if (found) {
          setCategory(found);
          setSubCategories(found.children || []);
        }
      } catch (err) {
        // Non-critical — category header just won't show
      }
    };
    fetchCategoryMeta();
  }, [slug]);

  // Fetch products based on slug/subSlug/sort/page
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let sort = "createdAt";
        let order = "desc";

        switch (sortOption) {
          case "newest":   sort = "createdAt"; order = "desc"; break;
          case "oldest":   sort = "createdAt"; order = "asc";  break;
          case "name-asc": sort = "name";      order = "asc";  break;
          case "name-desc":sort = "name";      order = "desc"; break;
          default: break;
        }

        // If a subcategory is selected, fetch by subcategory slug
        // Otherwise fetch by parent category slug
        const fetchSlug = subSlug || slug;

        const response = await fetchApi(
          `/public/categories/${fetchSlug}/products?page=${pagination.page}&limit=${pagination.limit}&sort=${sort}&order=${order}`
        );

        // Backend returns category info at response.data.category
        if (!category && response?.data?.category) {
          setCategory(response.data.category);
        }

        setProducts(response.data.products || []);
        setPagination((prev) => ({
          ...prev,
          ...(response.data.pagination || {}),
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, subSlug, pagination.page, pagination.limit, sortOption]);

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle sorting
  const handleSortChange = (e) => {
    setSortOption(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Switch subcategory
  const handleSubCategoryClick = (sub) => {
    const nextSub = sub?.slug === subSlug ? "" : (sub?.slug || "");
    const url = nextSub ? `/category/${slug}?sub=${nextSub}` : `/category/${slug}`;
    router.push(url);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Loading state
  if (loading && !category && !products.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-[#166454] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-4 rounded-md flex items-start">
          <AlertCircle className="text-red-500 mr-3 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-red-700">
              Error Loading Category
            </h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Category header */}
      {category && (
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Link href="/" className="text-gray-500 hover:text-[#166454]">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="text-gray-500 hover:text-[#166454]">
              Products
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/category/${slug}`} className={`hover:text-[#166454] ${!subSlug ? "text-[#166454]" : "text-gray-500"}`}>
              {category.name}
            </Link>
            {subSlug && (
              <>
                <span className="mx-2">/</span>
                <span className="text-[#166454]">
                  {subCategories.find((s) => s.slug === subSlug)?.name || subSlug}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                {subSlug
                  ? (subCategories.find((s) => s.slug === subSlug)?.name || subSlug)
                  : category.name}
              </h1>
              {!subSlug && category.description && (
                <p className="text-gray-600 max-w-2xl">{category.description}</p>
              )}
            </div>

            {category.image && !subSlug && (
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <Image
                  src={getImageUrl(category.image)}
                  alt={category.name}
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subcategory Tabs — show if parent category has sub-categories */}
      {subCategories.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {/* "All" pill */}
            <button
              onClick={() => handleSubCategoryClick(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                !subSlug
                  ? "bg-[#166454] text-white border-[#166454]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-[#166454] hover:text-[#166454]"
              }`}
            >
              All
            </button>

            {subCategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSubCategoryClick(sub)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  subSlug === sub.slug
                    ? "bg-[#166454] text-white border-[#166454]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#166454] hover:text-[#166454]"
                }`}
              >
                {sub.image && (
                  <Image
                    src={getImageUrl(sub.image)}
                    alt={sub.name}
                    width={20}
                    height={20}
                    className="object-contain rounded-full"
                  />
                )}
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <p className="text-gray-600 text-sm">
            {loading
              ? "Loading..."
              : `Showing ${products.length} of ${pagination.total} products`}
          </p>
        </div>

        <div className="flex items-center mt-4 sm:mt-0">
          <label htmlFor="sort" className="text-sm mr-2">
            Sort by:
          </label>
          <select
            id="sort"
            name="sort"
            className="rounded-md border border-gray-300 shadow-sm focus:border-[#166454] focus:ring-[#166454] text-sm px-3 py-1.5"
            onChange={handleSortChange}
            value={sortOption}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name-asc">Name: A-Z</option>
            <option value="name-desc">Name: Z-A</option>
          </select>
        </div>
      </div>

      {/* Loading overlay while refreshing */}
      {loading && products.length === 0 && (
        <div className="flex justify-center items-center py-16">
          <div className="w-10 h-10 border-4 border-[#166454] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Products Grid */}
      {!loading && products.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center border">
          <div className="text-gray-400 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-3">No products found</h2>
          <p className="text-gray-600 mb-6">
            {subSlug
              ? "No products in this sub-category yet."
              : "There are no products in this category yet."}
          </p>
          {subSlug ? (
            <Button onClick={() => handleSubCategoryClick(null)}>
              View All in {category?.name}
            </Button>
          ) : (
            <Link href="/products">
              <Button>Browse All Products</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {products.map((product) => (
            <ProducCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center mt-10">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronUp className="h-4 w-4 rotate-90" />
            </Button>

            {[...Array(pagination.pages)].map((_, i) => {
              const page = i + 1;
              if (
                page === 1 ||
                page === pagination.pages ||
                (page >= pagination.page - 1 && page <= pagination.page + 1)
              ) {
                return (
                  <Button
                    key={page}
                    variant={pagination.page === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              }

              if (
                (page === 2 && pagination.page > 3) ||
                (page === pagination.pages - 1 &&
                  pagination.page < pagination.pages - 2)
              ) {
                return <span key={page}>...</span>;
              }

              return null;
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
