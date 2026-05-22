import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const CarouselContext = React.createContext(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }
  return context;
}

const Carousel = React.forwardRef(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    );
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const onSelect = React.useCallback((api) => {
      if (!api) {
        return;
      }

      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    }, []);

    React.useEffect(() => {
      if (!api) {
        return;
      }

      onSelect(api);
      api.on("select", onSelect);
      api.on("reInit", onSelect);

      return () => {
        api?.off("select", onSelect);
        api?.off("reInit", onSelect);
      };
    }, [api, onSelect]);

    React.useEffect(() => {
      if (api && setApi) {
        setApi(api);
      }
    }, [api, setApi]);

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: api,
          opts,
          orientation:
            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    );
  }
);
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef(({ className, ...props }, ref) => {
  const { orientation } = useCarousel();

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  );
});
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = React.forwardRef(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { orientation, canScrollPrev, api } = useCarousel();

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full",
          orientation === "horizontal"
            ? "left-4 top-1/2 -translate-y-1/2"
            : "top-4 left-1/2 -translate-x-1/2 rotate-90",
          className
        )}
        disabled={!canScrollPrev}
        onClick={() => api?.scrollPrev()}
        {...props}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">Previous slide</span>
      </Button>
    );
  }
);
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { orientation, canScrollNext, api } = useCarousel();

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full",
          orientation === "horizontal"
            ? "right-4 top-1/2 -translate-y-1/2"
            : "bottom-4 left-1/2 -translate-x-1/2 rotate-90",
          className
        )}
        disabled={!canScrollNext}
        onClick={() => api?.scrollNext()}
        {...props}
      >
        <ArrowRight className="h-4 w-4" />
        <span className="sr-only">Next slide</span>
      </Button>
    );
  }
);
CarouselNext.displayName = "CarouselNext";

// Custom component for Autoplay controls
const CarouselAutoplayButton = React.forwardRef(
  (
    {
      isPlaying,
      onToggle,
      className,
      variant = "outline",
      size = "icon",
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("absolute z-10", className)}
        onClick={onToggle}
        {...props}
      >
        {isPlaying ? (
          <span className="block w-3 h-3 bg-current"></span>
        ) : (
          <span className="block w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-current ml-0.5"></span>
        )}
        <span className="sr-only">
          {isPlaying ? "Pause" : "Play"} slideshow
        </span>
      </Button>
    );
  }
);
CarouselAutoplayButton.displayName = "CarouselAutoplayButton";

// Custom component for dot indicators
const CarouselDots = React.forwardRef(({ className, ...props }, ref) => {
  const { api } = useCarousel();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [slideCount, setSlideCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    setSlideCount(api.scrollSnapList().length);

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    onSelect(); // Initial call

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const dots = React.useMemo(() => {
    return Array.from({ length: slideCount }).map((_, index) => (
      <button
        key={index}
        className={cn(
          "w-2 h-2 mx-1 rounded-full transition-all",
          selectedIndex === index ? "bg-primary" : "bg-gray-300"
        )}
        onClick={() => api?.scrollTo(index)}
        aria-label={`Go to slide ${index + 1}`}
      />
    ));
  }, [api, selectedIndex, slideCount]);

  return (
    <div
      ref={ref}
      className={cn("flex justify-center my-2", className)}
      {...props}
    >
      {dots}
    </div>
  );
});
CarouselDots.displayName = "CarouselDots";

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselAutoplayButton,
  CarouselDots,
};
