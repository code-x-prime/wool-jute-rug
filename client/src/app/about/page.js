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
            Who We Are
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-jost text-white leading-tight mb-6">
            Rooted in Craft, <br className="hidden md:block" />
            <span className="italic font-light">Woven with Purpose</span>
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
            &quot;Every thread carries the patience of the weaver, the warmth of natural fibre, and the intention of a craft passed down across generations.&quot;
          </h2>
          <div className="mt-8 w-16 h-px mx-auto" style={{ backgroundColor: BRAND_GOLD }} />
          <p className="mt-8 text-sm md:text-base font-jost tracking-widest uppercase" style={{ color: "#8a7a6a" }}>
            The Wool Jute Rug Co. Belief
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
                How We Started
              </span>
              <h2
                className="text-3xl md:text-5xl font-jost mb-8 leading-tight"
                style={{ color: BRAND_BROWN }}
              >
                Handmade in India, <br />
                <span className="italic font-light">Loved Worldwide</span>
              </h2>

              <div className="space-y-6 font-roboto text-base leading-loose" style={{ color: "#5C4A3D" }}>
                <p>
                  Wool Jute Rug Co. was built on a straightforward idea — that a rug made slowly, by hand, from natural fibres, will always outlast and outfeel anything made by a machine. We work directly with skilled weavers across India&apos;s traditional rug-making regions.
                </p>
                <p>
                  Our collections are designed in-house and produced in small batches, ensuring that each piece receives the attention it deserves. From selecting the raw wool and jute to the final wash and finishing, every step is done with care.
                </p>
                <p>
                  We are not a marketplace or a middleman. We own our production relationships, which means better quality control, fair wages for artisans, and rugs that arrive at your door exactly as intended.
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
            Made by Hand. <br />Finished with Intention.
          </h2>
          <p className="text-white/80 font-roboto text-lg leading-relaxed max-w-2xl mx-auto">
            Each rug goes through a multi-stage process — hand-spinning, natural dyeing, loom weaving, washing in clean water, and sun drying — before it passes our quality inspection. We do not cut corners, and we do not outsource our standards.
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
              <h3 className="text-xl font-jost mb-4" style={{ color: BRAND_BROWN }}>Natural Fibres Only</h3>
              <p className="font-roboto leading-relaxed text-sm" style={{ color: "#5C4A3D" }}>
                We use wool, jute, and cotton sourced responsibly from trusted suppliers. No synthetic blends, no shortcuts — just materials that age gracefully and feel honest underfoot.
              </p>
            </div>
            {/* Pillar 2 */}
            <div className="text-center">
              <h3 className="text-xl font-jost mb-4" style={{ color: BRAND_BROWN }}>Artisan-First Approach</h3>
              <p className="font-roboto leading-relaxed text-sm" style={{ color: "#5C4A3D" }}>
                We work with weavers who have spent decades at the loom. Their skill is irreplaceable, and their livelihood matters to us. Fair pay and sustainable workloads are non-negotiable.
              </p>
            </div>
            {/* Pillar 3 */}
            <div className="text-center">
              <h3 className="text-xl font-jost mb-4" style={{ color: BRAND_BROWN }}>Built to Last</h3>
              <p className="font-roboto leading-relaxed text-sm" style={{ color: "#5C4A3D" }}>
                A rug from Wool Jute Rug Co. is not a seasonal purchase. Properly cared for, it will hold its colour, structure, and character for years — even decades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ── */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-jost mb-6" style={{ color: BRAND_BROWN }}>
            Find Your Rug
          </h2>
          <p className="font-roboto mb-10 text-base" style={{ color: "#5C4A3D" }}>
            Browse our full range of handmade wool and jute rugs — from classic weaves to contemporary patterns. Free shipping on orders above a certain value.
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
