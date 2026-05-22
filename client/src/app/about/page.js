"use client";

import Image from "next/image";
import Link from "next/link";

const BRAND_BROWN = "#3D1C02";
const BRAND_GOLD = "#C9A84C";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── HERO SECTION ── */}
      <section className="relative h-[60vh] md:h-[80vh] w-full flex items-center justify-center overflow-hidden">
        <Image
          src="/h1.jpg" // Placeholder for an artisanal weaving image
          alt="Wool Jute Rug Co Artisan Weaving"
          fill
          className="object-cover"
          priority
        />
        {/* Elegant subtle overlay */}
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-white/90 text-sm md:text-base font-jost tracking-[0.2em] uppercase mb-4">
            Our Heritage
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-jost text-white leading-tight mb-6">
            Weaving Stories, <br className="hidden md:block" />
            <span className="italic font-light">One Knot at a Time</span>
          </h1>
        </div>
      </section>

      {/* ── INTRODUCTION / STATEMENT ── */}
      <section className="py-20 md:py-32 px-6" style={{ backgroundColor: "#FDF8F0" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-2xl md:text-4xl font-jost leading-relaxed"
            style={{ color: BRAND_BROWN }}
          >
            &quot;A rug is more than a piece of decor. It is a canvas of tradition, a testament to time, and a foundation for the memories you build upon it.&quot;
          </h2>
          <div className="mt-8 w-16 h-px mx-auto" style={{ backgroundColor: BRAND_GOLD }} />
          <p className="mt-8 text-sm md:text-base font-jost tracking-widest uppercase" style={{ color: "#8a7a6a" }}>
            The Wool Jute Rug Co Philosophy
          </p>
        </div>
      </section>

      {/* ── OUR STORY ── */}
      <section className="py-20 md:py-32 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
            {/* Image Column */}
            <div className="relative h-[500px] md:h-[700px] w-full">
              <Image
                src="/images/about-story.jpg"
                alt="Our Journey"
                fill
                className="object-cover"
              />
            </div>

            {/* Text Column */}
            <div className="max-w-lg">
              <span
                className="text-xs font-jost tracking-[0.2em] uppercase mb-6 block"
                style={{ color: BRAND_GOLD }}
              >
                Our Journey
              </span>
              <h2
                className="text-3xl md:text-5xl font-jost mb-8 leading-tight"
                style={{ color: BRAND_BROWN }}
              >
                From Passion to <br />
                <span className="italic font-light">Purpose</span>
              </h2>

              <div className="space-y-6 font-roboto text-base leading-loose" style={{ color: "#5C4A3D" }}>
                <p>
                  Founded in 2009, Wool Jute Rug Co was born from a deep reverence for the ancient art of rug weaving. We started with a simple belief: that the warmth of a handcrafted rug brings a soul to any living space.
                </p>
                <p>
                  What began as a small collaborative effort with local artisans has gracefully evolved into a nationwide movement. Today, we stand proud as a bridge between the masterful hands of rural weavers and contemporary homes across the globe.
                </p>
                <p>
                  Every collection we curate is a dialogue between heritage and modernity. We preserve centuries-old techniques while embracing minimalist, elegant designs that resonate with the aesthetics of today.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARTISAN CRAFTSMANSHIP (Full width image break) ── */}
      <section className="relative py-32 px-6 flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: BRAND_BROWN }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <span className="text-white/60 text-xs font-jost tracking-[0.2em] uppercase mb-6 block">
            Behind The Looms
          </span>
          <h2 className="text-3xl md:text-5xl font-jost text-white mb-8 leading-tight font-light">
            Empowering the Hands <br />That Create Magic
          </h2>
          <p className="text-white/80 font-roboto text-lg leading-relaxed max-w-2xl mx-auto">
            Our rugs are not manufactured; they are born. Over 10,000 hours of meticulous knotting, washing, and finishing go into our premium collections. By partnering directly with artisans, we ensure fair wages, sustainable practices, and the preservation of a generational craft.
          </p>
        </div>
      </section>

      {/* ── OUR PILLARS ── */}
      <section className="py-20 md:py-32 px-6" style={{ backgroundColor: "#FDF8F0" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-jost" style={{ color: BRAND_BROWN }}>
              The Pillars of Our Craft
            </h2>
            <div className="mt-6 w-12 h-px mx-auto" style={{ backgroundColor: BRAND_GOLD }} />
          </div>

          <div className="grid md:grid-cols-3 gap-12 md:gap-16">
            {/* Pillar 1 */}
            <div className="text-center">
              <h3 className="text-xl font-jost mb-4" style={{ color: BRAND_BROWN }}>Raw & Natural</h3>
              <p className="font-roboto leading-relaxed text-sm" style={{ color: "#5C4A3D" }}>
                We source the finest, unadulterated wool and natural jute. Our commitment to organic, sustainable materials ensures that every rug is as kind to the earth as it is to your home.
              </p>
            </div>
            {/* Pillar 2 */}
            <div className="text-center">
              <h3 className="text-xl font-jost mb-4" style={{ color: BRAND_BROWN }}>Slow Living</h3>
              <p className="font-roboto leading-relaxed text-sm" style={{ color: "#5C4A3D" }}>
                In a world of mass production, we embrace the slow, deliberate pace of hand-knotting. True luxury cannot be rushed; it is cultivated over months of patient craftsmanship.
              </p>
            </div>
            {/* Pillar 3 */}
            <div className="text-center">
              <h3 className="text-xl font-jost mb-4" style={{ color: BRAND_BROWN }}>Enduring Quality</h3>
              <p className="font-roboto leading-relaxed text-sm" style={{ color: "#5C4A3D" }}>
                A Wool Jute Co rug is designed to be an heirloom. With meticulous attention to detail and rigorous quality standards, we create pieces that withstand the test of time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ── */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-jost mb-6" style={{ color: BRAND_BROWN }}>
            Bring Our Story Home
          </h2>
          <p className="font-roboto mb-10 text-base" style={{ color: "#5C4A3D" }}>
            Explore our curated collections and find the perfect piece to anchor your space.
          </p>
          <Link
            href="/products"
            className="inline-block border px-10 py-4 text-sm font-jost tracking-[0.15em] uppercase transition-all duration-300 hover:bg-[#3D1C02] hover:text-white"
            style={{ borderColor: BRAND_BROWN, color: BRAND_BROWN }}
          >
            Explore Collections
          </Link>
        </div>
      </section>
    </main>
  );
}
