"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Phone, 
  Mail, 
  Check, 
  X,
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  ArrowRight,
  Maximize2,
  Lock,
  Award,
  Calendar
} from "lucide-react";
import { fetchApi } from "@/lib/utils";
import { toast } from "sonner";

export default function RugServicesPage() {
  // Before/After Slider state
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Accordion states
  const [activeTermsSection, setActiveTermsSection] = useState("terms");
  const [activeFaq, setActiveFaq] = useState(0);

  // Modal State for AMC
  const [isAmcModalOpen, setIsAmcModalOpen] = useState(false);
  const [amcTab, setAmcTab] = useState("residential"); // residential or commercial

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    pincode: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details form ref for scrolling
  const detailsFormRef = useRef(null);

  // Handle slider drag
  const handleMove = (clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  const toggleTermsSection = (section) => {
    setActiveTermsSection(activeTermsSection === section ? null : section);
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.pincode) {
      toast.error("Please fill all required fields (*)");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchApi("/public/rug-services", {
        method: "POST",
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          pincode: formData.pincode,
          designNotes: formData.description,
        },
      });

      if (response) {
        toast.success("Request Submitted Successfully!", {
          description: "Our rug care specialists will contact you shortly.",
        });
        setFormData({
          name: "",
          email: "",
          phone: "",
          pincode: "",
          description: "",
        });
      } else {
        toast.error("Failed to submit request. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting services form:", error);
      toast.error("Failed to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScrollToForm = () => {
    setIsAmcModalOpen(false);
    if (detailsFormRef.current) {
      detailsFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="bg-[#FAF8F5] pt-20">
      {/* ── HERO SECTION ── */}
      <section 
        className="relative h-[75vh] min-h-[500px] w-full flex items-end justify-center pb-20 bg-cover bg-center text-white"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.65)), url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80')`,
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 text-center z-10 w-full mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light font-jost tracking-wider mb-3 text-white leading-tight">
            Professional Rug Washing & Care
          </h1>
          <p className="text-xs md:text-sm tracking-[0.25em] font-jost uppercase text-white/90 mb-10 max-w-xl mx-auto">
            Handled by Experts who know carpets best!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a 
              href="tel:+918053210008" 
              className="px-8 py-3.5 bg-black text-white hover:bg-neutral-900 font-jost text-[10px] tracking-widest uppercase font-semibold transition-all border border-black flex items-center gap-2 rounded-none"
            >
              <Phone className="h-3 w-3" />
              Call Us
            </a>
            <a 
              href="mailto:connect.wooljuterug@gmail.com" 
              className="px-8 py-3.5 bg-transparent text-white hover:bg-white/10 font-jost text-[10px] tracking-widest uppercase font-semibold transition-all border border-white flex items-center gap-2 rounded-none"
            >
              <Mail className="h-3 w-3" />
              Email Us
            </a>
          </div>
        </div>
      </section>

      {/* ── WHY WASH YOUR RUG SECTION ── */}
      <section className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
        <div className="mb-12 max-w-4xl">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-light font-jost tracking-wide text-[#3D1C02] mb-6">
            Why Wash Your Rug?
          </h2>
          <p className="text-neutral-600 text-sm md:text-base font-roboto leading-relaxed">
            Regular deep cleaning removes dust, allergens, and restores color protecting your investment and extending the rug&apos;s life. Our professional wash uses gentle techniques suitable for delicate, handwoven rugs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Deep Cleaning",
              description: "Removes dust, grime, and allergens with gentle, effective care.",
              image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
            },
            {
              title: "Stain & Odor Removal",
              description: "Targeted treatment for spills and tough spots without harming fibers.",
              image: "https://images.unsplash.com/photo-1563161402-8b11cf7009ba?auto=format&fit=crop&w=600&q=80",
            },
            {
              title: "Vintage Wash",
              description: "Rejuvenates old rugs while preserving their vintage charm.",
              image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80",
            },
            {
              title: "Repairs & Reweaving",
              description: "Restore damaged fringes, edges, or patterns by our expert artisans.",
              image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
            },
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-[#e8e0d5] flex flex-col h-full group">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 shrink-0">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-jost text-base md:text-lg font-medium text-[#3D1C02] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-neutral-500 text-xs font-roboto leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6-STEP PROCESS SECTION ── */}
      <section 
        className="relative py-20 bg-cover bg-center text-white"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url('https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1600&q=80')`,
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-light font-jost tracking-wide text-white mb-16">
            Our 6-Step Washing Process
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { step: 1, title: "Inspection", desc: "Detailed assessment of material, damage and colorfastness." },
              { step: 2, title: "Dust Removal", desc: "Mechanical beating and vacuuming to eliminate embedded dirt." },
              { step: 3, title: "Pre-Treatment", desc: "Spot treatments for stains and problem areas." },
              { step: 4, title: "Gentle Wash", desc: "Fiber safe immersion cleaning based on rug type." },
              { step: 5, title: "Drying", desc: "Sun-controlled drying to avoid shrinkage or fading." },
              { step: 6, title: "Quality Check", desc: "Final inspection, grooming, and secure packaging." },
            ].map((proc) => (
              <div key={proc.step} className="bg-black/30 border border-white/10 p-8 flex flex-col items-center justify-center text-center">
                <div className="text-4xl font-light font-jost text-[#C9A84C] mb-3">{proc.step}</div>
                <h3 className="text-lg font-medium tracking-wide font-jost mb-2 text-white">{proc.title}</h3>
                <p className="text-white/70 text-xs font-roboto leading-relaxed">{proc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESTORATION & CUSTOMIZATION SECTION ── */}
      <section className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light font-jost tracking-wide text-[#3D1C02] mb-6">
              Restoration & Customization
            </h2>
            <p className="text-neutral-600 text-sm md:text-base font-roboto leading-relaxed mb-8">
              Bring your rug back to life with specialized repair, reweaving, and restoration services. We also offer resizing, trimming, and color balancing to fit your interiors perfectly.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a 
                href="tel:+918053210008" 
                className="px-6 py-3 bg-black text-white hover:bg-neutral-900 font-jost text-[10px] tracking-widest uppercase font-semibold transition-all border border-black flex items-center gap-2"
              >
                <Phone className="h-3.5 w-3.5" />
                Call Us
              </a>
              <a 
                href="mailto:connect.wooljuterug@gmail.com" 
                className="px-6 py-3 bg-transparent text-black hover:bg-neutral-100 font-jost text-[10px] tracking-widest uppercase font-semibold transition-all border border-black flex items-center gap-2"
              >
                <Mail className="h-3.5 w-3.5" />
                Email Us
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              "Reweaving",
              "Edge Repair",
              "Color Restoration",
              "Resizing"
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-[#e8e0d5] py-12 px-6 rounded flex flex-col items-center text-center justify-center group hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 flex items-center justify-center mb-4 text-[#C9A84C]">
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-7 h-7 transition-transform duration-300 group-hover:scale-110"
                  >
                    <path d="M12 0L14.7 9.3L24 12L14.7 14.7L12 24L9.3 14.7L0 12L9.3 9.3Z" />
                  </svg>
                </div>
                <h3 className="font-jost text-sm md:text-base font-medium text-[#3D1C02]">
                  {item}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING STRUCTURE SECTIONS ── */}
      <section className="bg-[#FAF6F0] border-t border-b border-[#e8e0d5] py-16 md:py-24">
        <div className="max-w-[1400px] mx-auto px-6">
          
          {/* Brand Customers Pricing */}
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-light font-jost tracking-wide text-[#3D1C02] mb-3">
              Comprehensive Service Pricing Structure
            </h2>
            <p className="text-neutral-500 text-xs tracking-wider uppercase font-jost mb-8">
              Wool Jute Rug Co. Customer Pricing & Benefits
            </p>

            <div className="overflow-x-auto max-w-4xl mx-auto border border-[#e8e0d5] rounded bg-white shadow-sm">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#3D1C02] text-white font-jost text-xs tracking-wider uppercase">
                    <th className="py-4 px-6 font-semibold">Rug Type / Value</th>
                    <th className="py-4 px-6 font-semibold text-center">1st Clean</th>
                    <th className="py-4 px-6 font-semibold text-center">2nd Clean</th>
                    <th className="py-4 px-6 font-semibold text-center">3rd Clean</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e0d5] font-roboto text-xs md:text-sm text-gray-700">
                  <tr className="hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-[#3D1C02]">Knotted &gt; ₹1L</td>
                    <td className="py-4 px-6 text-center font-semibold text-emerald-700 bg-emerald-50/50">Free</td>
                    <td className="py-4 px-6 text-center">Paid</td>
                    <td className="py-4 px-6 text-center">Paid</td>
                  </tr>
                  <tr className="hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-[#3D1C02]">Knotted &gt; ₹2L</td>
                    <td className="py-4 px-6 text-center font-semibold text-emerald-700 bg-emerald-50/50">Free</td>
                    <td className="py-4 px-6 text-center font-semibold text-emerald-700 bg-emerald-50/50">Free</td>
                    <td className="py-4 px-6 text-center">Paid</td>
                  </tr>
                  <tr className="hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-[#3D1C02]">Tufted/Handloom</td>
                    <td className="py-4 px-6 text-center">Paid</td>
                    <td className="py-4 px-6 text-center">Paid</td>
                    <td className="py-4 px-6 text-center">Paid</td>
                  </tr>
                  <tr className="hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-[#3D1C02]">Dhurrie</td>
                    <td className="py-4 px-6 text-center">Paid</td>
                    <td className="py-4 px-6 text-center">Paid</td>
                    <td className="py-4 px-6 text-center">Paid</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-400 text-[10px] mt-4 italic max-w-4xl mx-auto text-left px-4">
              *Terms & Conditions applied*
            </p>
          </div>

          {/* Detailed pricing */}
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-light font-jost tracking-wide text-[#3D1C02] mb-3">
              Detailed Service Pricing for Wool Jute Rug Co. Customers
            </h2>
            <p className="text-neutral-500 text-xs tracking-wider uppercase font-jost mb-8">
              Professional Cleaning Rates Per Square Foot
            </p>

            <div className="overflow-x-auto max-w-4xl mx-auto border border-[#e8e0d5] rounded bg-white shadow-sm">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#3D1C02] text-white font-jost text-xs tracking-wider uppercase">
                    <th className="py-4 px-6 font-semibold">Weave Type</th>
                    <th className="py-4 px-6 font-semibold text-center">Wool</th>
                    <th className="py-4 px-6 font-semibold text-center">Silk</th>
                    <th className="py-4 px-6 font-semibold text-center">Antique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e0d5] font-roboto text-xs md:text-sm text-gray-700">
                  <tr className="hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-[#3D1C02]">Knotted</td>
                    <td className="py-4 px-6 text-center">₹100/sq.ft</td>
                    <td className="py-4 px-6 text-center">₹150/sq.ft</td>
                    <td className="py-4 px-6 text-center">₹200/sq.ft</td>
                  </tr>
                  <tr className="hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-[#3D1C02]">Tufted/Handloom</td>
                    <td className="py-4 px-6 text-center">₹75/sq.ft</td>
                    <td className="py-4 px-6 text-center">₹100/sq.ft</td>
                    <td className="py-4 px-6 text-center">₹200/sq.ft</td>
                  </tr>
                  <tr className="hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-[#3D1C02]">Dhurrie</td>
                    <td className="py-4 px-6 text-center">₹75/sq.ft</td>
                    <td className="py-4 px-6 text-center">₹100/sq.ft</td>
                    <td className="py-4 px-6 text-center">₹200/sq.ft</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Non-Brand Customers Box */}
          <div className="max-w-4xl mx-auto bg-[#F7F2EB] border border-[#e8e0d5] rounded p-6 md:p-10 mb-12 text-center">
            <h3 className="text-xl md:text-2xl font-light font-jost text-[#3D1C02] tracking-wide mb-6">
              Non-Wool Jute Rug Co. Customers
            </h3>
            <div className="overflow-x-auto border border-[#e8e0d5] rounded bg-white max-w-2xl mx-auto mb-8 shadow-sm">
              <table className="w-full text-left border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-[#3D1C02] text-white font-jost text-xs tracking-wider uppercase">
                    <th className="py-3.5 px-6 font-semibold">Rug Category</th>
                    <th className="py-3.5 px-6 font-semibold text-center">Normal Rugs</th>
                    <th className="py-3.5 px-6 font-semibold text-center">Antique Rugs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e0d5] font-roboto text-xs md:text-sm text-gray-700">
                  <tr className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-[#3D1C02]">All Weaves</td>
                    <td className="py-4 px-6 text-center">₹100/sq.ft</td>
                    <td className="py-4 px-6 text-center">₹200/sq.ft</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-center items-center gap-4">
              <a 
                href="tel:+918053210008" 
                className="px-6 py-2.5 bg-black text-white hover:bg-neutral-900 font-jost text-[10px] tracking-widest uppercase font-semibold transition-all border border-black rounded-none flex items-center gap-1.5"
              >
                <Phone className="h-3 w-3" /> Call Us
              </a>
              <a 
                href="mailto:connect.wooljuterug@gmail.com" 
                className="px-6 py-2.5 bg-transparent text-black hover:bg-neutral-200/50 font-jost text-[10px] tracking-widest uppercase font-semibold transition-all border border-black rounded-none flex items-center gap-1.5"
              >
                <Mail className="h-3 w-3" /> Email Us
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* ── ADDITIONAL SERVICES PRICING ── */}
      <section className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-light font-jost tracking-wide text-[#3D1C02]">
            Additional Services Pricing
          </h2>
        </div>

        {/* AMC Box */}
        <div className="max-w-4xl mx-auto bg-white border border-[#e8e0d5] p-6 md:p-10 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 shadow-sm">
          <div>
            <span className="inline-block text-[9px] font-bold tracking-widest uppercase text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-1 mb-4">
              + Premium Service Package
            </span>
            <h3 className="text-xl md:text-2xl font-light font-jost text-[#3D1C02] tracking-wide mb-2">
              Annual Maintenance Contract (AMC)
            </h3>
            <p className="text-neutral-500 text-xs font-roboto mb-4">
              Rug care, cleaning & restoration for life-long beauty.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-medium text-neutral-700 font-roboto">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 border border-emerald-600 rounded-full p-0.5" />
                Residential Plans
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 border border-emerald-600 rounded-full p-0.5" />
                Commercial Plans
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 border border-emerald-600 rounded-full p-0.5" />
                1-3 Year Options
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsAmcModalOpen(true)}
            className="px-6 py-3 bg-black hover:bg-neutral-900 text-white font-jost text-[10px] tracking-widest uppercase font-semibold transition-all rounded-none"
          >
            Explore AMC Plans
          </button>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { title: "Stain-Resistant Coating", desc: "₹118 per square foot" },
            { title: "Custom Rug Pads", desc: "Contact for pricing based on dimensions" },
            { title: "Rug Appraisal Services", desc: "Contact for assessment pricing" },
            { title: "Installation Services", desc: "Contact for quote based on rug size and location" }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-[#e8e0d5] py-10 px-6 rounded flex flex-col items-center text-center justify-center shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="w-8 h-8 flex items-center justify-center mb-4 text-[#C9A84C]">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 transition-transform group-hover:scale-110">
                  <path d="M12 0L14.7 9.3L24 12L14.7 14.7L12 24L9.3 14.7L0 12L9.3 9.3Z" />
                </svg>
              </div>
              <h4 className="font-jost text-sm md:text-base font-medium text-[#3D1C02] mb-2">
                {item.title}
              </h4>
              <p className="text-neutral-400 text-xs font-roboto leading-normal">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BEFORE & AFTER INTERACTIVE SLIDER ── */}
      <section className="bg-white py-16 md:py-24 border-t border-b border-[#e8e0d5]">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light font-jost tracking-wide text-[#3D1C02] mb-3">
              Handled with the same love as when it was woven.
            </h2>
            <p className="text-neutral-500 text-xs font-roboto">
              Every rug is serviced by master artisans who understand the craft.
            </p>
          </div>

          {/* Interactive Image Slider */}
          <div 
            ref={sliderRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            className="relative w-full max-w-4xl mx-auto aspect-[16/7] overflow-hidden select-none border border-[#e8e0d5]"
          >
            {/* Unwashed / Dirty Side (Background) */}
            <div className="absolute inset-0 w-full h-full">
              <img 
                src="https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80" 
                alt="Dirty Rug" 
                className="w-full h-full object-cover filter saturate-[0.5] brightness-[0.75] contrast-[1.15] blur-[1px]"
                draggable="false"
              />
              <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 text-white text-[10px] tracking-wider uppercase font-jost">
                Before Wash
              </div>
            </div>

            {/* Washed / Clean Side (Foreground, clipped) */}
            <div 
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
              }}
            >
              <img 
                src="https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80" 
                alt="Clean Rug" 
                className="w-full h-full object-cover"
                draggable="false"
              />
              <div className="absolute bottom-4 right-4 bg-emerald-700/85 px-3 py-1 text-white text-[10px] tracking-wider uppercase font-jost">
                After Wash
              </div>
            </div>

            {/* Slider bar & handle */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 flex items-center justify-center"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              <div className="absolute w-8 h-8 rounded-full bg-[#3D1C02] text-white flex items-center justify-center border-2 border-white shadow-lg cursor-ew-resize">
                <Maximize2 className="h-3.5 w-3.5 rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DETAILS FORM SECTION ── */}
      <section ref={detailsFormRef} className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-light font-jost text-[#3D1C02] tracking-wide">
            Add in the Details
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-[#e8e0d5] p-8 md:p-12 shadow-sm font-roboto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#3D1C02] uppercase tracking-wider mb-2">
                *Name
              </label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-[#3D1C02] font-roboto"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D1C02] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-[#3D1C02] font-roboto"
                placeholder="your.email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#3D1C02] uppercase tracking-wider mb-2">
                *Mobile No.
              </label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-[#3D1C02] font-roboto"
                placeholder="Phone Number"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D1C02] uppercase tracking-wider mb-2">
                *Pin code
              </label>
              <input 
                type="text" 
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-[#3D1C02] font-roboto"
                placeholder="Postal Pincode"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D1C02] uppercase tracking-wider mb-2">
              Description of service / comment
            </label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-[#3D1C02] font-roboto resize-none"
              placeholder="Enter Description"
            />
          </div>

          <div className="text-center pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-10 py-3.5 bg-[#b2948c] text-white hover:bg-[#a18178] font-jost text-xs tracking-widest uppercase font-bold transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </section>

      {/* ── ACCORDION TERMS SECTION ── */}
      <section className="max-w-4xl mx-auto px-6 py-8 md:py-12 font-roboto">
        <div className="space-y-4">
          
          {/* Important Terms and Conditions */}
          <div className="border border-[#e8e0d5] bg-white rounded overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleTermsSection("terms")}
              className="w-full flex items-center justify-between px-6 py-4 bg-[#3D1C02] text-white font-jost text-sm md:text-base font-medium tracking-wide text-left"
            >
              <span>Important Terms and Conditions</span>
              {activeTermsSection === "terms" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {activeTermsSection === "terms" && (
              <div className="p-6 text-xs md:text-sm text-neutral-600 leading-relaxed bg-white">
                <ul className="list-disc list-inside space-y-3">
                  <li><span className="font-semibold text-neutral-800">Time Limit:</span> Free washing services can only be availed within two years from date of purchase.</li>
                  <li><span className="font-semibold text-neutral-800">Documentation:</span> Valid proof of purchase is required to avail the free service.</li>
                  <li><span className="font-semibold text-neutral-800">Minimum Charges:</span> INR 2,000/- plus taxes minimum charge applies.</li>
                  <li><span className="font-semibold text-neutral-800">Post-Free Services:</span> After free services are exhausted, service charges + shipping charges will be applicable as mentioned in pricing table.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Logistics and Service Terms */}
          <div className="border border-[#e8e0d5] bg-white rounded overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleTermsSection("logistics")}
              className="w-full flex items-center justify-between px-6 py-4 text-[#3D1C02] font-jost text-sm md:text-base font-medium tracking-wide text-left"
            >
              <span>Logistics and Service Terms</span>
              {activeTermsSection === "logistics" ? <ChevronUp className="h-4 w-4 text-[#C9A84C]" /> : <ChevronDown className="h-4 w-4 text-[#C9A84C]" />}
            </button>
            {activeTermsSection === "logistics" && (
              <div className="p-6 text-xs md:text-sm text-neutral-600 leading-relaxed bg-white">
                <p className="mb-2">We provide reliable door-to-door pickup and delivery services across major cities. Customers are requested to ensure:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>The rug is properly rolled and packaged before pickup.</li>
                  <li>Our logistics partners are verified upon arrival.</li>
                  <li>Transit insurance is covered for premium antique rugs.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Logistics Cost Sharing */}
          <div className="border border-[#e8e0d5] bg-white rounded overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleTermsSection("cost-sharing")}
              className="w-full flex items-center justify-between px-6 py-4 text-[#3D1C02] font-jost text-sm md:text-base font-medium tracking-wide text-left"
            >
              <span>Logistics Cost Sharing for Wool Jute Rug Co Customers</span>
              {activeTermsSection === "cost-sharing" ? <ChevronUp className="h-4 w-4 text-[#C9A84C]" /> : <ChevronDown className="h-4 w-4 text-[#C9A84C]" />}
            </button>
            {activeTermsSection === "cost-sharing" && (
              <div className="p-6 text-xs md:text-sm text-neutral-600 leading-relaxed bg-white">
                <p>For verified brand customers, we share the transit and shipping logistics costs. For rugs within the warranty or package coverage, one-way shipping cost is fully subsidized, and return delivery is offered at a flat-rate co-pay discount.</p>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 border-t border-[#e8e0d5]">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-light font-jost tracking-wide text-[#3D1C02]">
            Enhanced Rug Washing FAQ
          </h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How often should I wash my rug?",
              a: "We recommend deep-cleaning your rug every 12 to 18 months, depending on your household's lifestyle and the rug's color. Handknotted rugs should be washed every three to five years."
            },
            {
              q: "What is the process for getting my rug washed?",
              a: "You can book a slot by calling or emailing us. Our team schedules a door-to-door pickup. The rug undergoes inspection, dust removal, gentle washing, sun-controlled drying, quality check, and is safely returned to you."
            },
            {
              q: "Are there any charges for pickup and delivery?",
              a: "Verified Wool Jute Rug Co customers receive free or subsidized shipping options based on their purchase level. For non-brand customers, standard logistics rates apply based on location."
            },
            {
              q: "What if my rug is damaged?",
              a: "We assess the rug's condition during the initial inspection. If we detect existing tears, structural decay, or color bleeding risks, we discuss restoration choices (like reweaving or edge repair) before beginning the wash."
            },
            {
              q: "Is the washing service available outside India?",
              a: "Currently, our physical pickup and washing services are restricted to selected cities within India. For international customers, we offer guidance, recommended washing manuals, and advice from our rug conservation specialists."
            }
          ].map((item, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="border border-[#e8e0d5] bg-white rounded overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleFaq(idx)}
                  className={`w-full flex items-center justify-between px-6 py-4.5 text-left font-jost text-sm md:text-base font-medium transition-colors ${
                    isOpen ? "bg-[#3D1C02] text-white" : "text-[#3D1C02] hover:bg-neutral-50"
                  }`}
                >
                  <span>{item.q}</span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-white" /> : <ChevronDown className="h-4 w-4 text-[#C9A84C]" />}
                </button>
                {isOpen && (
                  <div className="p-6 text-xs md:text-sm text-neutral-600 leading-relaxed font-roboto bg-white border-t border-neutral-100">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── INTERACTIVE AMC PLANS MODAL ── */}
      {isAmcModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAmcModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl z-10 border border-[#e8e0d5] flex flex-col animate-in fade-in zoom-in-95 duration-250">
            {/* Header */}
            <div className="p-6 md:p-8 text-center relative border-b border-neutral-100 shrink-0">
              <button 
                onClick={() => setIsAmcModalOpen(false)}
                className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 p-1 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-2xl md:text-3xl font-light font-jost text-[#3D1C02] tracking-wide">
                Annual Maintenance Contract Plans
              </h2>
              <p className="text-neutral-500 text-xs md:text-sm font-roboto mt-1.5">
                Choose the perfect care plan for your valuable rugs
              </p>

              {/* Tabs selector */}
              <div className="inline-flex rounded-full bg-neutral-100 p-1 mt-6 border border-neutral-200">
                <button 
                  onClick={() => setAmcTab("residential")}
                  className={`px-8 py-2 text-xs font-semibold tracking-wider font-jost uppercase transition-all rounded-full ${
                    amcTab === "residential" 
                      ? "bg-white text-[#3D1C02] shadow-sm" 
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  Residential
                </button>
                <button 
                  onClick={() => setAmcTab("commercial")}
                  className={`px-8 py-2 text-xs font-semibold tracking-wider font-jost uppercase transition-all rounded-full ${
                    amcTab === "commercial" 
                      ? "bg-white text-[#3D1C02] shadow-sm" 
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  Commercial
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 md:p-8 flex-1 space-y-8">
              {amcTab === "residential" ? (
                /* Residential Plan details */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* What We Provide */}
                  <div className="bg-white border border-[#e8e0d5] p-6 rounded-lg shadow-sm">
                    <h3 className="font-jost text-lg font-medium text-[#3D1C02] mb-1">
                      What We Provide
                    </h3>
                    <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider mb-4">
                      On-site cleaning every 6 months
                    </p>
                    <ul className="space-y-2.5 text-xs text-neutral-600 font-roboto">
                      {[
                        "Binding, check & Repair",
                        "Deep cleaning with PH Neutral shampoo (removes all odour)",
                        "Furniture Impressions",
                        "Stain Removal",
                        "Priority Support and actions"
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-emerald-600 border border-emerald-600 rounded-full p-0.5 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-neutral-400 mt-6 leading-relaxed font-roboto italic border-t border-neutral-100 pt-4">
                      Deep cleaning on demand with only freight charge applicable (Washing, Fringes Repair, Binding Check & Repair & Color Restoration)
                    </p>
                  </div>

                  {/* Not Included / Chargeable */}
                  <div className="bg-white border border-[#e8e0d5] p-6 rounded-lg shadow-sm">
                    <h3 className="font-jost text-lg font-medium text-[#3D1C02] mb-1">
                      Not Included / Chargeable
                    </h3>
                    <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wider mb-4">
                      Out of scope services
                    </p>
                    <ul className="space-y-2.5 text-xs text-neutral-600 font-roboto">
                      {[
                        "Any Tear due to Furniture or Pets chew or accidents",
                        "Damage due to Moths (if not informed earlier)",
                        "Water Damage",
                        "Oil based stains",
                        "Freight charges (in case of deep cleaning)"
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="h-4 w-4 text-red-500 border border-red-500 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">✕</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                /* Commercial Plan details */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* High End Hotels & Offices */}
                  <div className="bg-white border border-[#e8e0d5] p-6 rounded-lg shadow-sm">
                    <h3 className="font-jost text-lg font-medium text-[#3D1C02] mb-1">
                      High End Hotels & Offices
                    </h3>
                    <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider mb-4">
                      On-site cleaning every 3 months
                    </p>
                    <ul className="space-y-2.5 text-xs text-neutral-600 font-roboto">
                      {[
                        "Binding, check & Repair",
                        "Deep cleaning with PH Neutral shampoo (removes all odour)",
                        "Furniture Impressions",
                        "Stain Removal",
                        "Priority Support and actions"
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-emerald-600 border border-emerald-600 rounded-full p-0.5 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Not Included / Chargeable */}
                  <div className="bg-white border border-[#e8e0d5] p-6 rounded-lg shadow-sm">
                    <h3 className="font-jost text-lg font-medium text-[#3D1C02] mb-1">
                      Not Included / Chargeable
                    </h3>
                    <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wider mb-4">
                      Out of scope services
                    </p>
                    <ul className="space-y-2.5 text-xs text-neutral-600 font-roboto">
                      {[
                        "Any Tear due to Furniture or Pets chew or accidents",
                        "Damage due to Moths (if not informed earlier)",
                        "Water Damage",
                        "Oil based stains",
                        "Freight charges (in case of deep cleaning)"
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="h-4 w-4 text-red-500 border border-red-500 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">✕</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Pricing plans Grid */}
              <div className="space-y-4">
                <h3 className="font-jost text-xl font-medium text-[#3D1C02] tracking-wide mb-2 text-center md:text-left">
                  Pricing Plans
                </h3>
                <p className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold font-roboto mb-4 text-center md:text-left">
                  Tenure: 1-3 years (minimum 1 year contract) · Min 400 sqft
                </p>

                <div className="space-y-3.5">
                  {amcTab === "residential" ? (
                    // Residential pricing options
                    [
                      { plan: "1 Year Plan", details: "2 Cleanings", price: "₹32,000", sub: "As per Min 80 Rs PSFT · 20% off" },
                      { plan: "2 Year Plan", details: "4 Cleanings", price: "₹56,000", sub: "As per Min 80 Rs PSFT · 20% off" },
                      { plan: "3 Year Plan", details: "6 Cleanings", price: "₹72,000", sub: "As per Min 80 Rs PSFT · 20% off", tag: "Best Value" }
                    ].map((planItem, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border rounded-lg transition-all ${
                          planItem.tag ? "bg-[#FAF2EB] border-amber-300" : "bg-white border-[#e8e0d5]"
                        }`}
                      >
                        <div className="mb-2 sm:mb-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-jost text-sm md:text-base font-semibold text-[#3D1C02]">
                              {planItem.plan}
                            </h4>
                            {planItem.tag && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                                {planItem.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-neutral-500 text-[11px] font-roboto mt-0.5">{planItem.details}</p>
                          <p className="text-neutral-400 text-[9px] font-roboto mt-1 italic">{planItem.sub}</p>
                        </div>
                        <div className="text-left sm:text-right shrink-0 mt-2 sm:mt-0">
                          <span className="text-xl font-bold text-[#3D1C02]">{planItem.price}</span>
                          <p className="text-neutral-400 text-[9px] font-roboto">Minimum</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Commercial pricing options
                    [
                      { plan: "1 Year Plan", details: "4 cleanings", price: "₹80,000", sub: "As per Min 160 Rs PSFT · 20% off" },
                      { plan: "2 Year Plan", details: "8 Cleanings", price: "₹1,40,000", sub: "As per Min 280 Rs PSFT · 30% off" },
                      { plan: "3 Year Plan", details: "12 Cleanings", price: "₹1,80,000", sub: "As per Min 360 Rs PSFT · 40% off", tag: "Best Value" }
                    ].map((planItem, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border rounded-lg transition-all ${
                          planItem.tag ? "bg-[#FAF2EB] border-amber-300" : "bg-white border-[#e8e0d5]"
                        }`}
                      >
                        <div className="mb-2 sm:mb-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-jost text-sm md:text-base font-semibold text-[#3D1C02]">
                              {planItem.plan}
                            </h4>
                            {planItem.tag && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                                {planItem.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-neutral-500 text-[11px] font-roboto mt-0.5">{planItem.details}</p>
                          <p className="text-neutral-400 text-[9px] font-roboto mt-1 italic">{planItem.sub}</p>
                        </div>
                        <div className="text-left sm:text-right shrink-0 mt-2 sm:mt-0">
                          <span className="text-xl font-bold text-[#3D1C02]">{planItem.price}</span>
                          <p className="text-neutral-400 text-[9px] font-roboto">Minimum</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 md:p-8 bg-neutral-50 border-t border-neutral-100 shrink-0 text-center space-y-6">
              <div className="grid grid-cols-3 gap-2 text-[10px] md:text-xs text-neutral-600 font-roboto max-w-2xl mx-auto">
                <div className="flex flex-col items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-[#C9A84C]" />
                  <span className="font-semibold text-neutral-800">Fully Insured</span>
                  <span className="text-[9px] text-neutral-400">Comprehensive coverage</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Maximize2 className="h-4.5 w-4.5 text-[#C9A84C]" />
                  <span className="font-semibold text-neutral-800">Certified Experts</span>
                  <span className="text-[9px] text-neutral-400">15+ years experience</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Calendar className="h-4.5 w-4.5 text-[#C9A84C]" />
                  <span className="font-semibold text-neutral-800">Flexible Terms</span>
                  <span className="text-[9px] text-neutral-400">Custom packages available</span>
                </div>
              </div>

              <button 
                onClick={handleScrollToForm}
                className="w-full py-4 bg-black hover:bg-neutral-900 text-white font-jost text-xs tracking-widest uppercase font-semibold transition-all"
              >
                Schedule a Consultation
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
