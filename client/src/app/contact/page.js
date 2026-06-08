"use client";

import { useState } from "react";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Send 
} from "lucide-react";
import { fetchApi } from "@/lib/utils";
import { toast } from "sonner";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill all required fields (*)");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchApi("/public/contact-enquiry", {
        method: "POST",
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          designNotes: formData.message, // Map message to designNotes
        },
      });

      if (response) {
        toast.success("Message Sent Successfully!", {
          description: "Our support team will get back to you within 24 hours.",
        });
        setFormData({
          name: "",
          email: "",
          phone: "",
          message: "",
        });
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error("Failed to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAF8F5] pt-28 pb-16 font-roboto">
      <div className="max-w-[1200px] mx-auto px-6">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-light font-jost text-[#3D1C02] tracking-wide mb-4">
            Contact Us
          </h1>
          <p className="text-neutral-500 text-sm leading-relaxed">
            Have questions about our handcrafted rugs, custom orders, or care services? We&apos;re here to help you select, preserve, and restore your perfect carpet.
          </p>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Info cards (Left col, takes 1/3) */}
          <div className="space-y-6">
            
            {/* Address Card */}
            <div className="bg-white border border-[#e8e0d5] p-6 rounded shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FAF6F0] text-[#C9A84C] flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-jost text-sm font-semibold text-[#3D1C02] tracking-wide uppercase mb-1">
                  Our Showroom
                </h3>
                <p className="text-neutral-600 text-xs leading-relaxed">
                  89/2 Sector 39, Gurugram,<br />Haryana 122001, India
                </p>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-white border border-[#e8e0d5] p-6 rounded shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FAF6F0] text-[#C9A84C] flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-jost text-sm font-semibold text-[#3D1C02] tracking-wide uppercase mb-1">
                  Call Us
                </h3>
                <a 
                  href="tel:+918053210008" 
                  className="text-neutral-600 text-xs hover:text-[#C9A84C] transition-colors"
                >
                  +91 8053210008
                </a>
              </div>
            </div>

            {/* Email Card */}
            <div className="bg-white border border-[#e8e0d5] p-6 rounded shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FAF6F0] text-[#C9A84C] flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-jost text-sm font-semibold text-[#3D1C02] tracking-wide uppercase mb-1">
                  Email Us
                </h3>
                <a 
                  href="mailto:connect.wooljuterug@gmail.com" 
                  className="text-neutral-600 text-xs hover:text-[#C9A84C] transition-colors break-all"
                >
                  connect.wooljuterug@gmail.com
                </a>
              </div>
            </div>

            {/* Hours Card */}
            <div className="bg-white border border-[#e8e0d5] p-6 rounded shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FAF6F0] text-[#C9A84C] flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-jost text-sm font-semibold text-[#3D1C02] tracking-wide uppercase mb-1">
                  Working Hours
                </h3>
                <p className="text-neutral-600 text-xs leading-relaxed">
                  Monday - Saturday: 10:00 AM - 7:00 PM<br />
                  Sunday: Closed
                </p>
              </div>
            </div>

          </div>

          {/* Form (Right col, takes 2/3) */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white border border-[#e8e0d5] p-8 md:p-10 rounded shadow-sm space-y-6">
              
              <h2 className="text-xl font-light font-jost text-[#3D1C02] tracking-wide mb-6 border-b border-neutral-100 pb-3">
                Send a Message
              </h2>

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
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3D1C02] uppercase tracking-wider mb-2">
                    *Email Address
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-[#3D1C02] font-roboto"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D1C02] uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-[#3D1C02] font-roboto"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D1C02] uppercase tracking-wider mb-2">
                  *Message
                  </label>
                <textarea 
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={5}
                  className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-[#3D1C02] font-roboto resize-none"
                  placeholder="Tell us what you are looking for..."
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-3.5 bg-black hover:bg-neutral-900 text-white font-jost text-[10px] tracking-widest uppercase font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="h-3 w-3" />
                  {isSubmitting ? "Sending..." : "Submit Message"}
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
