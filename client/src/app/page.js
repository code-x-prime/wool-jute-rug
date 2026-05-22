"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi, fetchProductsByType } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { motion } from "framer-motion";
import WhoWeAreSection from "@/components/WhoWeAreSection";

import { useRouter } from "next/navigation";

import SupplementStoreUI from "@/components/SupplementStoreUI";
import CategoryGrid from "@/components/CategoryGrid";
import BrandCarousel from "@/components/BrandCarousel";
import ProducCard from "@/components/ProducCard";
import { DynamicIcon } from "@/components/dynamic-icon";
import ShoppableVideoCarousel from "@/components/ShoppableVideoCarousel";

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApi] = useState(null);
  const [autoplay, setAutoplay] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  // Fetch banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setIsLoading(true);
        const response = await fetchApi("/public/banners");

        // Handle response: fetchApi returns { success, data: { banners: [...] }, message }
        if (
          response &&
          response.success &&
          response.data &&
          response.data.banners
        ) {
          const bannersArray = response.data.banners;

          // Only set banners if array has items (length > 0)
          if (Array.isArray(bannersArray) && bannersArray.length > 0) {
            setBanners(bannersArray);
          } else {
            // Empty array from API - use fallback
            setBanners([]);
          }
        } else {
          // No banners in response - use fallback
          setBanners([]);
        }
      } catch (error) {
        console.error("Error fetching banners:", error);
        // On error, set empty array so fallback slides will show
        setBanners([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, []);

  // Fallback slides - only used when banners.length === 0
  const fallbackSlides = [
    {
      ctaLink: "/products",
      img: "/desk1.jpg",
      smimg: "/mob1.jpg",

    },
    {
      ctaLink: "/products",
      img: "/desk2.jpg",
      smimg: "/mob2.jpg",

    },

  ];

  // Use banners from API only if length > 0, otherwise use fallback
  // If banners.length === 0, show fallback slides
  const slides =
    banners.length > 0
      ? banners.map((banner) => ({
        ctaLink: banner.link || "/products",
        img: banner.desktopImage,
        smimg: banner.mobileImage,
        title: banner.title || "",
        subtitle: banner.subtitle || "",
      }))
      : fallbackSlides;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle autoplay functionality
  useEffect(() => {
    if (!api || !autoplay) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api, autoplay]);

  // Update current slide index when carousel changes
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrentSlide(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const handleSlideClick = (ctaLink) => {
    if (ctaLink) {
      router.push(ctaLink);
    } else {
      router.push("/products");
    }
  };

  // Loading state - show full page loading
  if (isLoading) {
    return (
      <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
        <div className="relative overflow-hidden w-full aspect-[9/16] md:aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 border-4 border-[#166454] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>
                <p className="text-gray-700 font-semibold text-lg mb-1">
                  Loading ....
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
      {/* Mobile: Smaller height, Desktop: Larger height */}
      <div className="relative overflow-hidden w-full">
        <Carousel
          setApi={setApi}
          className="w-full"
          opts={{
            loop: true,
            align: "start",
          }}
        >
          <CarouselContent className="-ml-0">
            {slides.map((slide, index) => (
              <CarouselItem key={index} className="pl-0 basis-full">
                <div
                  className="relative aspect-[9/16] md:aspect-[16/8] w-full cursor-pointer group overflow-hidden"
                  onClick={() => handleSlideClick(slide.ctaLink)}
                >
                  {/* Background Image */}
                  <Image
                    src={isMobile ? slide.smimg : slide.img}
                    alt={slide.title || "Hero banner"}
                    fill
                    priority={index === 0}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="100vw"
                  />

                  {/* Gradient overlay — dark top for navbar visibility, dark bottom for text */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/50" />

                  {/* Text overlay — bottom left like Jaipur Rugs */}
                  {(slide.title || slide.subtitle) && (
                    <div className="absolute bottom-16 md:bottom-14 left-6 md:left-14 z-10 text-white max-w-xs md:max-w-md">
                      {slide.subtitle && (
                        <p className="text-xs md:text-sm tracking-widest uppercase mb-2 font-jost opacity-90">
                          {slide.subtitle}
                        </p>
                      )}
                      {slide.title && (
                        <h2 className="text-2xl md:text-5xl font-bold font-jost tracking-wide uppercase leading-tight mb-4">
                          {slide.title}
                        </h2>
                      )}
                      <button
                        className="border border-white text-white text-xs md:text-sm font-jost tracking-widest uppercase px-5 py-2.5 hover:bg-white hover:text-[#3D1C02] transition-all duration-300"
                        onClick={(e) => { e.stopPropagation(); router.push(slide.ctaLink); }}
                      >
                        SHOP NOW
                      </button>
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation Controls - Better positioned and sized */}
          <CarouselPrevious className="absolute left-2 sm:left-4 top-1/2 hidden md:flex -translate-y-1/2 h-4 w-4 sm:h-10 sm:w-10 md:h-12 md:w-12 z-30 bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm" />
          <CarouselNext className="absolute right-2 sm:right-4 top-1/2 hidden md:flex -translate-y-1/2 h-4 w-4 sm:h-10 sm:w-10 md:h-12 md:w-12 z-30 bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm" />

          {/* Dot Indicators - Better responsive sizing */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`w-2 h-2  rounded-full transition-all duration-300 ${index === currentSlide
                  ? "bg-white scale-125 shadow-lg"
                  : "bg-white/50 hover:bg-white/70"
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Autoplay Toggle - Better positioned */}
          <div className="absolute top-4 right-4 z-30  hidden md:flex">
            <Button
              variant="outline"
              size="sm"
              className="h-5 w-5  bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm"
              onClick={() => setAutoplay(!autoplay)}
              aria-label={autoplay ? "Pause slideshow" : "Play slideshow"}
            >
              {autoplay ? (
                <div className="w-2 h-2 flex space-x-0.5">
                  <div className="w-1 h-full bg-current"></div>
                  <div className="w-1 h-full bg-current"></div>
                </div>
              ) : (
                <div className="w-0 h-0 border-t-[4px] sm:border-t-[6px] border-t-transparent border-b-[4px] sm:border-b-[6px] border-b-transparent border-l-[6px] sm:border-l-[8px] border-l-current ml-0.5"></div>
              )}
            </Button>
          </div>
        </Carousel>
      </div>
    </div>
  );
};


// Flash Sale Countdown Component
const FlashSaleCountdown = ({ endTime }) => {
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const end = new Date(endTime).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="flex justify-center items-center gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-md px-4 py-2 min-w-[70px]">
        <div className="text-2xl font-bold text-gray-900">
          {String(timeRemaining.hours).padStart(2, "0")}
        </div>
        <div className="text-xs text-gray-500 uppercase">Hours</div>
      </div>
      <span className="text-2xl font-bold text-gray-900">:</span>
      <div className="bg-white rounded-lg shadow-md px-4 py-2 min-w-[70px]">
        <div className="text-2xl font-bold text-gray-900">
          {String(timeRemaining.minutes).padStart(2, "0")}
        </div>
        <div className="text-xs text-gray-500 uppercase">Minutes</div>
      </div>
      <span className="text-2xl font-bold text-gray-900">:</span>
      <div className="bg-white rounded-lg shadow-md px-4 py-2 min-w-[70px]">
        <div className="text-2xl font-bold text-gray-900">
          {String(timeRemaining.seconds).padStart(2, "0")}
        </div>
        <div className="text-xs text-gray-500 uppercase">Seconds</div>
      </div>
    </div>
  );
};

const FeaturedProducts = ({
  products = [],
  isLoading = false,
  error = null,
}) => {
  const [api, setApi] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrentSlide(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(8)].map((_, index) => (
          <ProductSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load products</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No products found</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {products.map((product, index) => (
              <CarouselItem
                key={product.id || product.slug || index}
                className="pl-4 basis-1/2 md:basis-1/3 lg:basis-1/5 py-5 md:py-6"
              >
                <ProducCard product={product} />
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation Controls */}
          <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 bg-white/90 hover:bg-white hover:text-black border-gray-200 text-gray-700 shadow-lg" />
          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 bg-white/90 hover:bg-white hover:text-black border-gray-200 text-gray-700 shadow-lg" />
        </Carousel>
      </div>

      <div className="text-center mt-2">
        <Link href="/products">
          <Button
            variant="outline"
            size="lg"
            className="font-medium border-primary text-primary hover:bg-primary hover:text-white group rounded-full"
          >
            View All Products
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
        </Link>
      </div>
    </>
  );
};

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      console.log(`Subscribed with: ${email}`);
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 5000);
      setEmail("");
    }
  };

  return (
    <section className="relative py-10 md:py-12 overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-black/90 z-10" />
        <Image
          src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1500"
          alt="Fitness background"
          fill
          className="object-cover object-center"
          priority
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md p-5 md:p-10 rounded-2xl border border-white/20 shadow-xl">
            <div className="flex flex-col md:flex-row gap-10 items-center">
              {/* Left content */}
              <div className="w-full md:w-1/2 text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                  JOIN OUR <span className="text-gray-400">FASHION</span>{" "}
                  COMMUNITY
                </h2>

                <p className="text-gray-300 mb-5">
                  Get exclusive fashion trends, style tips, and special offers
                  straight to your inbox.
                </p>

                <div className="flex flex-col gap-2 md:gap-4 mb-3 md:mb-6">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                      <div className="h-6 w-6 text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                        </svg>
                      </div>
                    </div>
                    <span className="text-sm">Weekly fashion newsletter</span>
                  </div>

                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 7h-9"></path>
                        <path d="M14 17H5"></path>
                        <circle cx="17" cy="17" r="3"></circle>
                        <circle cx="7" cy="7" r="3"></circle>
                      </svg>
                    </div>
                    <span className="text-sm">Personalized workout plans</span>
                  </div>

                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                      </svg>
                    </div>
                    <span className="text-sm">
                      Exclusive discounts & offers
                    </span>
                  </div>
                </div>
              </div>

              {/* Right form */}
              <div className="w-full md:w-1/2 bg-white p-6 rounded-xl shadow-lg">
                {subscribed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-10"
                  >
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-green-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5"></path>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Thank You for Subscribing!
                    </h3>
                    <p className="text-gray-600">
                      Check your inbox for a welcome message and a special
                      discount code.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 mb-6">
                      Subscribe to Our Newsletter
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Your Email
                          </label>
                          <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="john@example.com"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-300 flex items-center justify-center"
                        >
                          Subscribe Now
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 ml-2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14M12 5l7 7-7 7"></path>
                          </svg>
                        </motion.button>
                      </div>

                      <p className="text-xs text-gray-500 text-center mt-4">
                        By subscribing, you agree to our Privacy Policy and
                        consent to receive updates from our company.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ProductSkeleton = () => (
  <div className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse">
    <div className="aspect-square bg-gray-200"></div>
    <div className="p-4">
      <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
      <div className="h-8 bg-gray-200 rounded w-full"></div>
    </div>
  </div>
);

// Home page component
export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestsellerProducts, setBestsellerProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [productSections, setProductSections] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch flash sales
    const fetchFlashSales = async () => {
      try {
        const response = await fetchApi("/public/flash-sales", {
          credentials: "include",
        });
        if (response.success) {
          setFlashSales(response.data.flashSales || []);
        }
      } catch (error) {
        console.error("Error fetching flash sales:", error);
      }
    };
    fetchFlashSales();

    // Fetch product sections from admin panel
    const fetchProductSections = async () => {
      try {
        const response = await fetchApi("/public/product-sections", {
          credentials: "include",
        });
        if (response?.success && response?.data?.sections) {
          setProductSections(response.data.sections);
        }
      } catch (error) {
        console.error("Error fetching product sections:", error);
      }
    };
    fetchProductSections();

    // Fetch products by different types (fallback for backward compatibility)
    const fetchData = async () => {
      try {
        setProductsLoading(true);
        const [featuredRes, bestsellerRes, trendingRes, newRes] =
          await Promise.allSettled([
            fetchProductsByType("featured", 8),
            fetchProductsByType("bestseller", 8),
            fetchProductsByType("trending", 8),
            fetchProductsByType("new", 8),
          ]);

        // Set featured products (fallback)
        if (featuredRes.status === "fulfilled") {
          setFeaturedProducts(featuredRes.value?.data?.products || []);
        } else {
          const fallbackRes = await fetchApi(
            "/public/products?featured=true&limit=8"
          );
          setFeaturedProducts(fallbackRes?.data?.products || []);
        }

        if (bestsellerRes.status === "fulfilled") {
          setBestsellerProducts(bestsellerRes.value?.data?.products || []);
        }

        if (trendingRes.status === "fulfilled") {
          setTrendingProducts(trendingRes.value?.data?.products || []);
        }

        if (newRes.status === "fulfilled") {
          setNewProducts(newRes.value?.data?.products || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err?.message || "Failed to fetch data");
      } finally {
        setProductsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="w-full">
      {/* <CategoriesCarousel /> */}
      <div className="w-full overflow-hidden">
        <HeroCarousel />
      </div>


      <CategoryGrid />

      {/* SHOP BY ROOM */}
      <section className="py-14 px-4 max-w-[1400px] mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-jost font-light tracking-widest uppercase mb-10" style={{ color: "#3D1C02" }}>
          Shop By Room
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {[
            { img: "/room3.jpg", href: "/products?room=dining" },
            { img: "/room2.jpg", href: "/products?room=living" },
            { img: "/room1.jpg", href: "/products?room=bedroom" },
          ].map((room) => (
            <a
              key={room.label}
              href={room.href}
              className="group relative overflow-hidden rounded-sm block aspect-[3/4]"
            >
              <img
                src={room.img}
                alt={room.label}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            </a>
          ))}
        </div>
      </section>




      {/* FLASH SALES */}
      {flashSales.length > 0 && (
        <section className="py-8 md:py-12 relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-orange-500/5 to-amber-500/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-200/20 via-transparent to-transparent" />
          <div className="relative max-w-7xl mx-auto px-4">
            {flashSales.map((sale) => (
              <div key={sale.id} className="mb-10 last:mb-0">
                <div className="text-center mb-8">
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg shadow-rose-500/25 mb-4">
                    🔥 Flash Sale
                  </span>
                  <h2 className="text-3xl md:text-5xl font-bold mb-3 text-gray-900 tracking-tight">
                    {sale.name}
                  </h2>
                  <p className="text-xl font-semibold text-rose-600 mb-2">
                    {sale.discountPercentage}% OFF on All Products
                  </p>
                  <p className="text-sm text-gray-500 mb-6">Limited time offer – grab the best deals before they’re gone</p>
                  <FlashSaleCountdown endTime={sale.endTime} />
                </div>

                {sale.products && sale.products.length > 0 && (
                  <div className="relative">
                    <Carousel
                      opts={{
                        align: "start",
                        loop: true,
                      }}
                      className="w-full"
                    >
                      <CarouselContent className="-ml-3 md:-ml-4">
                        {sale.products.map((product, index) => (
                          <CarouselItem
                            key={product.id || index}
                            className="pl-3 md:pl-4 basis-[280px] md:basis-[300px] lg:basis-[320px]"
                          >
                            <ProducCard
                              product={{
                                ...product,
                                hasSale: true,
                                price: product.basePrice,
                                salePrice: product.salePrice,
                                basePrice: product.salePrice,
                                regularPrice: product.basePrice,
                              }}
                            />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="absolute -left-1 md:left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-xl border border-gray-200 hover:bg-gray-50 text-gray-700 z-10" />
                      <CarouselNext className="absolute -right-1 md:right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-xl border border-gray-200 hover:bg-gray-50 text-gray-700 z-10" />
                    </Carousel>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TOP BRANDS */}
      <BrandCarousel tag="TOP" title="TOP BRANDS" />

      {/* FEATURED PRODUCTS */}
      {featuredProducts.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-xs tracking-[0.3em] uppercase font-jost mb-2" style={{ color: "#C9A84C" }}>
                Handpicked For You
              </p>
              <h2 className="text-2xl md:text-4xl font-light font-jost tracking-widest uppercase mb-3" style={{ color: "#3D1C02" }}>
                Featured Collections
              </h2>
              <p className="text-sm text-gray-500 max-w-xl mx-auto mt-3">
                Curated rugs that bring artistry and elegance to every room
              </p>
              <div className="w-12 h-px mx-auto mt-4" style={{ backgroundColor: "#C9A84C" }} />
            </div>
            <FeaturedProducts
              products={featuredProducts}
              isLoading={productsLoading}
              error={error}
            />
          </div>
        </section>
      )}
      {/* BEST SELLERS */}
      {bestsellerProducts.length > 0 && (
        <section className="py-12 md:py-16 bg-[#FAF8F5]">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-xs tracking-[0.3em] uppercase font-jost mb-2" style={{ color: "#C9A84C" }}>
                Customer Favourites
              </p>
              <h2 className="text-2xl md:text-4xl font-light font-jost tracking-widest uppercase mb-3" style={{ color: "#3D1C02" }}>
                Bestsellers For A Good Reason
              </h2>
              <div className="w-12 h-px mx-auto mt-4" style={{ backgroundColor: "#C9A84C" }} />
            </div>
            <FeaturedProducts
              products={bestsellerProducts}
              isLoading={productsLoading}
              error={error}
            />
          </div>
        </section>
      )}

      {/* TRENDING */}
      {trendingProducts.length > 0 && (
        <section className="py-12 md:py-16 bg-[#FAF8F5]">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-xs tracking-[0.3em] uppercase font-jost mb-2" style={{ color: "#C9A84C" }}>
                What Everyone Loves
              </p>
              <h2 className="text-2xl md:text-4xl font-light font-jost tracking-widest uppercase mb-3" style={{ color: "#3D1C02" }}>
                Trending Now
              </h2>
              <p className="text-sm text-gray-500 max-w-xl mx-auto mt-3">
                The most loved designs this season — flying off our shelves
              </p>
              <div className="w-12 h-px mx-auto mt-4" style={{ backgroundColor: "#C9A84C" }} />
            </div>
            <FeaturedProducts
              products={trendingProducts}
              isLoading={productsLoading}
              error={error}
            />
          </div>
        </section>
      )}

      <SupplementStoreUI />

      {/* NEW BRANDS */}
      <BrandCarousel tag="NEW" title="NEW BRANDS" />


      {/* NEW ARRIVALS */}
      {newProducts.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-xs tracking-[0.3em] uppercase font-jost mb-2" style={{ color: "#C9A84C" }}>
                Just In
              </p>
              <h2 className="text-2xl md:text-4xl font-light font-jost tracking-widest uppercase mb-3" style={{ color: "#3D1C02" }}>
                New Arrivals
              </h2>
              <p className="text-sm text-gray-500 max-w-xl mx-auto mt-3">
                Fresh designs just added — be the first to bring them home
              </p>
              <div className="w-12 h-px mx-auto mt-4" style={{ backgroundColor: "#C9A84C" }} />
            </div>
            <FeaturedProducts
              products={newProducts}
              isLoading={productsLoading}
              error={error}
            />
          </div>
        </section>
      )}
      {/* SHOPPABLE VIDEO CAROUSEL */}
      <ShoppableVideoCarousel />


      {/* ========== DYNAMIC PRODUCT SECTIONS FROM ADMIN ========== */}
      {productSections.map((section, index) => {
        if (!section.products || section.products.length === 0) return null;

        const bgClass = index % 2 === 0 ? "bg-white" : "bg-gray-50";
        const isDark =
          section.color?.includes("black") || section.color?.includes("dark");
        const textColor = isDark ? "text-white" : "text-gray-900";
        const textMuted = isDark ? "text-white/70" : "text-gray-600";
        const sectionBg = isDark ? "bg-black" : bgClass;

        return (
          <section
            key={section.id}
            className={`py-5 md:py-8 ${sectionBg} ${isDark ? "text-white" : ""
              }`}
          >
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-5">
                <h2
                  className={`text-3xl md:text-4xl font-light tracking-wide mb-3 ${textColor}`}
                >
                  {section.icon && (
                    <DynamicIcon
                      name={section.icon}
                      className="inline-block mr-2 h-8 w-8 md:h-10 md:w-10"
                    />
                  )}
                  {section.name}
                </h2>
                {section.description && (
                  <p className={`${textMuted} max-w-2xl mx-auto text-sm`}>
                    {section.description}
                  </p>
                )}
              </div>

              <FeaturedProducts
                products={section.products}
                isLoading={productsLoading}
                error={error}
              />
            </div>
          </section>
        );
      })}

      {/* HOT BRANDS */}
      <BrandCarousel tag="HOT" title="HOT BRANDS" />

      <WhoWeAreSection />
    </div>
  );
}
