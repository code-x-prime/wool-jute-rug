import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

// Helper function to format image URLs correctly
const getImageUrl = (image) => {
  if (!image) return "/product-placeholder.png";
  if (image.startsWith("http")) return image;
  return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
};

export default function ProductCarousel({
  images,
  productName,
  showSaleBadge,
}) {
  const [emblaMainApi, setEmblaMainApi] = useState(null);
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const autoplayRef = useRef(null);

  // Initialize thumbnail carousel
  const [thumbViewportRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });

  // Handle autoplay for carousel
  const startAutoplay = useCallback(() => {
    if (!emblaMainApi || autoplayRef.current) return;

    setIsAutoScrolling(true);
    autoplayRef.current = setInterval(() => {
      if (!emblaMainApi.canScrollNext()) {
        emblaMainApi.scrollTo(0);
      } else {
        emblaMainApi.scrollNext();
      }
    }, 4000);
  }, [emblaMainApi]);

  const stopAutoplay = useCallback(() => {
    if (!autoplayRef.current) return;

    setIsAutoScrolling(false);
    clearInterval(autoplayRef.current);
    autoplayRef.current = null;
  }, []);

  const toggleAutoplay = useCallback(() => {
    if (isAutoScrolling) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  }, [isAutoScrolling, startAutoplay, stopAutoplay]);

  // Start autoplay when API is available
  useEffect(() => {
    if (!emblaMainApi) return;

    if (isAutoScrolling) {
      startAutoplay();
    }

    return () => stopAutoplay();
  }, [emblaMainApi, isAutoScrolling, startAutoplay, stopAutoplay]);

  // Track selected slide for thumbnails
  useEffect(() => {
    if (!emblaMainApi) return;

    const onSelect = () => {
      const selectedIndex = emblaMainApi.selectedScrollSnap();
      setSelectedSlide(selectedIndex);
    };

    emblaMainApi.on("select", onSelect);
    onSelect(); // Initialize

    return () => {
      emblaMainApi.off("select", onSelect);
    };
  }, [emblaMainApi]);

  // Sync thumbnails scroll position when main slide changes
  useEffect(() => {
    if (!emblaThumbsApi || !emblaMainApi) return;

    emblaThumbsApi.scrollTo(selectedSlide);
  }, [emblaThumbsApi, emblaMainApi, selectedSlide]);

  // Handle thumbnail click
  const onThumbClick = useCallback(
    (index) => {
      if (!emblaMainApi) return;
      emblaMainApi.scrollTo(index);
    },
    [emblaMainApi]
  );

  // Scroll thumbnails when hitting the edges
  const scrollThumbnails = useCallback(
    (direction) => {
      if (!emblaThumbsApi) return;

      if (direction === "prev") {
        emblaThumbsApi.scrollPrev();
      } else {
        emblaThumbsApi.scrollNext();
      }
    },
    [emblaThumbsApi]
  );

  if (!images || images.length === 0) {
    return (
      <div className="relative h-[450px] w-full bg-gray-100 flex items-center justify-center border rounded-md mb-6">
        <Image
          src="/product-placeholder.png"
          alt={productName}
          fill
          className="object-contain p-4"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md overflow-hidden mb-6 border border-gray-200">
      {/* Main Carousel */}
      <Carousel
        opts={{
          loop: true,
          align: "start",
          dragFree: false,
        }}
        className="relative"
        orientation="horizontal"
        setApi={setEmblaMainApi}
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="relative h-[450px] w-full bg-gray-50 transition-all duration-300">
                <Image
                  src={getImageUrl(image.url)}
                  alt={`${productName} - Image ${index + 1}`}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={index === 0}
                />
                {showSaleBadge && index === 0 && (
                  <div className="absolute top-4 left-4 bg-primary text-white text-sm font-bold px-4 py-1 rounded">
                    SALE
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div
          className="absolute inset-0"
          onMouseEnter={stopAutoplay}
          onMouseLeave={startAutoplay}
        />

        <CarouselPrevious className="left-2 h-10 w-10 opacity-70 hover:opacity-100 z-10" />
        <CarouselNext className="right-2 h-10 w-10 opacity-70 hover:opacity-100 z-10" />

        <button
          onClick={toggleAutoplay}
          className="absolute bottom-4 right-4 h-8 w-8 bg-white/70 hover:bg-white rounded-full flex items-center justify-center z-10 shadow-sm"
          aria-label={isAutoScrolling ? "Pause slideshow" : "Play slideshow"}
        >
          {isAutoScrolling ? (
            <Pause className="h-4 w-4 text-primary" />
          ) : (
            <Play className="h-4 w-4 text-primary" />
          )}
        </button>
      </Carousel>

      {/* Thumbnail Carousel */}
      {images.length > 1 && (
        <div className="mt-4 px-4 relative">
          <div className={`overflow-hidden ${images.length > 5 ? "px-8" : ""}`}>
            <div className="embla-thumbs" ref={thumbViewportRef}>
              <div className="flex space-x-3 py-2">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className={`relative flex-shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition-all hover:shadow-md ${selectedSlide === index
                        ? "border-primary"
                        : "border-transparent hover:border-gray-300"
                      }`}
                    onClick={() => onThumbClick(index)}
                  >
                    <div className="relative w-20 h-20">
                      <Image
                        src={getImageUrl(image.url)}
                        alt={`${productName} - Thumbnail ${index + 1}`}
                        fill
                        className="object-contain p-1"
                        sizes="80px"
                      />
                    </div>
                    {selectedSlide === index && (
                      <div className="absolute inset-0 bg-primary/10"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Thumbnail navigation buttons if there are many images */}
          {images.length > 5 && (
            <>
              <button
                className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center bg-white hover:bg-gray-100 shadow-md rounded-full z-10 border border-gray-200"
                onClick={() => scrollThumbnails("prev")}
                aria-label="View previous thumbnails"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center bg-white hover:bg-gray-100 shadow-md rounded-full z-10 border border-gray-200"
                onClick={() => scrollThumbnails("next")}
                aria-label="View next thumbnails"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
