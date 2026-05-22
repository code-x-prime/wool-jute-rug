import React from "react";
import Image from "next/image";
import Link from "next/link";

const WhoWeAreSection = () => {
  return (
    <section className="py-16 md:py-24 bg-white text-center font-jost">
      <div className="max-w-4xl mx-auto px-4 mb-10">
        <h2 className="text-2xl md:text-3xl tracking-wide text-gray-900 mb-4">
          Who We Are
        </h2>
        <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-2xl mx-auto mb-6">
          Without love, connecting rural India to the world would just be a dream. Read what our company really is, and what we stand for.
        </p>
        <Link
          href="/about"
          className="text-xs uppercase tracking-widest font-semibold text-gray-900 border-b border-gray-900 pb-1 hover:text-gray-500 hover:border-gray-500 transition-colors"
        >
          LEARN MORE
        </Link>
      </div>

      <div className="w-full relative h-[400px] md:h-[600px] lg:h-[700px]">
        {/* We use a placeholder representing the artisan and rug from rural India */}
        <Image
          src="/who-we-are.png"
          alt="Rural Indian artisan with a woven rug"
          fill
          className="object-cover"
        />
      </div>
    </section>
  );
};

export default WhoWeAreSection;
