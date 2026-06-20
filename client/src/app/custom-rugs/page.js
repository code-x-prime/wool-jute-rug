"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

const BRAND_BROWN = "#3D1C02";
const BRAND_GOLD = "#C9A84C";

export default function CustomRugsPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dimensions: "8x10 ft",
    customDimensions: "",
    material: "Wool",
    colors: "Beige / Ivory",
    customColors: "",
    designNotes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Construct final payload
    const finalData = {
      ...formData,
      dimensions: formData.dimensions === "Custom" ? formData.customDimensions : formData.dimensions,
      colors: formData.colors === "Custom" ? formData.customColors : formData.colors,
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/content/custom-rugs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit request.");
      }

      toast.success("Your custom rug request has been received. Our team will contact you shortly.");
      setFormData({
        name: "", email: "", phone: "", dimensions: "8x10 ft", customDimensions: "", material: "Wool", colors: "Beige / Ivory", customColors: "", designNotes: ""
      });
    } catch (error) {
      toast.error(error.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <main className="min-h-screen bg-white font-roboto">
      {/* ── HERO SECTION ── */}
      <section className="relative h-[60vh] md:h-[80vh] w-full flex items-center justify-center overflow-hidden">
        <Image
          src="/contact.png"
          alt="Custom Rugs by Wool Jute Rug Co"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto mt-10">
          <p className="text-white/90 text-sm md:text-base font-jost tracking-[0.2em] uppercase mb-4">
            Custom Rug Orders
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-jost text-white leading-tight mb-6">
            Your Space, <br className="hidden md:block" />
            <span className="italic font-light">Your Rug</span>
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg leading-relaxed">
            We make rugs to your exact size, colour, and design — handwoven by skilled artisans using natural wool and jute. Tell us what you need, and we will take care of the rest.
          </p>
        </div>
      </section>

      {/* ── THE PROCESS ── */}
      <section className="py-24 px-6" style={{ backgroundColor: "#FDF8F0" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-jost" style={{ color: BRAND_BROWN }}>
              How It Works
            </h2>
            <div className="mt-6 w-12 h-px mx-auto" style={{ backgroundColor: BRAND_GOLD }} />
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { num: "01", title: "Tell Us Your Idea", desc: "Submit your inquiry with dimensions, material preference, and any colour or design references. No idea is too rough — we work with whatever you have." },
              { num: "02", title: "We Design It", desc: "Our team prepares a design layout and material sample for your approval. You review and confirm before any production begins." },
              { num: "03", title: "Woven by Hand", desc: "Once approved, your rug is woven on traditional looms using hand-dyed yarn. The process takes time — because quality cannot be rushed." },
              { num: "04", title: "Inspected & Delivered", desc: "Every custom rug undergoes a thorough wash, finishing, and quality check before being carefully packed and shipped directly to you." }
            ].map((step) => (
              <div key={step.num} className="text-center group">
                <div
                  className="text-5xl font-jost font-light mb-4 transition-colors duration-500"
                  style={{ color: "rgba(201,168,76,0.3)" }}
                >
                  {step.num}
                </div>
                <h3 className="text-xl font-jost mb-3" style={{ color: BRAND_BROWN }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#5C4A3D" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INQUIRY FORM SECTION ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">

          {/* Left: Info */}
          <div>
            <span
              className="text-xs font-jost tracking-[0.2em] uppercase mb-4 block"
              style={{ color: BRAND_GOLD }}
            >
              Start Your Journey
            </span>
            <h2 className="text-3xl md:text-5xl font-jost mb-6 leading-tight" style={{ color: BRAND_BROWN }}>
              Request a Custom Quote
            </h2>
            <p className="text-base leading-relaxed mb-10" style={{ color: "#5C4A3D" }}>
              Fill in the form with as much or as little detail as you currently have. Our team reviews every inquiry personally and will get back to you with a clear proposal — no automated replies, no vague timelines.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ borderColor: BRAND_GOLD, color: BRAND_GOLD }}>
                  1
                </div>
                <div>
                  <h4 className="font-jost text-lg" style={{ color: BRAND_BROWN }}>Single Pieces Welcome</h4>
                  <p className="text-sm mt-1" style={{ color: "#8a7a6a" }}>We make custom rugs for individual homes, interior designers, and hotels alike. There is no minimum order quantity.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ borderColor: BRAND_GOLD, color: BRAND_GOLD }}>
                  2
                </div>
                <div>
                  <h4 className="font-jost text-lg" style={{ color: BRAND_BROWN }}>We Help You Choose</h4>
                  <p className="text-sm mt-1" style={{ color: "#8a7a6a" }}>Not sure which fibre or weave style suits your space? Our team will guide you based on your room, usage, and budget.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="p-6 md:p-8 shadow-lg rounded-sm" style={{ backgroundColor: "#FDF8F0", border: "1px solid #E8E0D5" }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-jost uppercase tracking-wider mb-2" style={{ color: BRAND_BROWN }}>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border focus:outline-none transition-colors"
                    style={{ borderColor: "#D0C8B8" }}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-jost uppercase tracking-wider mb-2" style={{ color: BRAND_BROWN }}>Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border focus:outline-none transition-colors"
                    style={{ borderColor: "#D0C8B8" }}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-jost uppercase tracking-wider mb-2" style={{ color: BRAND_BROWN }}>Phone (Optional)</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border focus:outline-none transition-colors"
                    style={{ borderColor: "#D0C8B8" }}
                    placeholder="+91 99999 00000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-jost uppercase tracking-wider mb-2" style={{ color: BRAND_BROWN }}>Size / Dimensions</label>
                  <select
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border focus:outline-none transition-colors"
                    style={{ borderColor: "#D0C8B8" }}
                  >
                    <option value="4x6 ft">4x6 ft</option>
                    <option value="5x8 ft">5x8 ft</option>
                    <option value="6x9 ft">6x9 ft</option>
                    <option value="8x10 ft">8x10 ft</option>
                    <option value="9x12 ft">9x12 ft</option>
                    <option value="10x14 ft">10x14 ft</option>
                    <option value="Runner">Runner</option>
                    <option value="Custom">Custom Size (Specify Below)</option>
                  </select>
                  {formData.dimensions === "Custom" && (
                    <input
                      type="text"
                      name="customDimensions"
                      value={formData.customDimensions}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border focus:outline-none transition-colors mt-2"
                      style={{ borderColor: "#D0C8B8" }}
                      placeholder="e.g. 15x20 ft or 300x400 cm"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-jost uppercase tracking-wider mb-2" style={{ color: BRAND_BROWN }}>Material Preference</label>
                  <select
                    name="material"
                    value={formData.material}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border focus:outline-none transition-colors"
                    style={{ borderColor: "#D0C8B8" }}
                  >
                    <option value="Wool">Wool</option>
                    <option value="Jute">Jute</option>
                    <option value="Wool & Silk Blend">Wool & Silk Blend</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Viscose">Viscose</option>
                    <option value="Not Sure - Need Advice">Not Sure - Need Advice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-jost uppercase tracking-wider mb-2" style={{ color: BRAND_BROWN }}>Color Palette</label>
                  <select
                    name="colors"
                    value={formData.colors}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border focus:outline-none transition-colors"
                    style={{ borderColor: "#D0C8B8" }}
                  >
                    <option value="Beige / Ivory">Beige / Ivory</option>
                    <option value="Grey / Silver">Grey / Silver</option>
                    <option value="Blue / Navy">Blue / Navy</option>
                    <option value="Red / Rust">Red / Rust</option>
                    <option value="Green / Sage">Green / Sage</option>
                    <option value="Multi-color">Multi-color</option>
                    <option value="Monochrome">Monochrome</option>
                    <option value="Custom">Custom Color (Specify Below)</option>
                  </select>
                  {formData.colors === "Custom" && (
                    <input
                      type="text"
                      name="customColors"
                      value={formData.customColors}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border focus:outline-none transition-colors mt-2"
                      style={{ borderColor: "#D0C8B8" }}
                      placeholder="e.g. Burgundy and Gold"
                      required
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-jost uppercase tracking-wider mb-2" style={{ color: BRAND_BROWN }}>Design Ideas / Inspiration</label>
                <textarea
                  name="designNotes"
                  rows={4}
                  value={formData.designNotes}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border focus:outline-none transition-colors resize-none"
                  style={{ borderColor: "#D0C8B8" }}
                  placeholder="Tell us about the space, the vibe, or any specific patterns you have in mind..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 text-sm font-jost tracking-[0.15em] uppercase text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: BRAND_BROWN }}
              >
                {isSubmitting ? "Submitting..." : "Submit Inquiry"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
