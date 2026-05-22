"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PartnerWithUsPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    number: "",
    city: "",
    state: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("Thanks! We will reach out shortly.", {
          description: `${formData.name || "Partner"}, your interest has been recorded.`,
        });
        setFormData({
          name: "",
          email: "",
          number: "",
          city: "",
          state: "",
          message: "",
        });
      } else {
        const data = await res.json();
        toast.error(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-[#f7f9fc]">
      <section className="max-w-7xl mx-auto px-4 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl font-semibold mb-4 font-jost" style={{ color: "#3D1C02" }}>
              Partner with Wool Jute Rug Co
            </h1>
            <p className="leading-relaxed font-roboto" style={{ color: "#7A5C3A" }}>
              Grow your business with us. Whether you are a rug retailer,
              interior designer, home decor store owner, or influencer, we would
              love to collaborate. Share your details and our team will get in touch soon.
            </p>
            <p className="leading-relaxed mt-2 font-roboto" style={{ color: "#7A5C3A" }}>
              <span className="block font-semibold mb-1 font-jost" style={{ color: "#3D1C02" }}>We offer two partnership models:</span>
              <ul className="list-disc list-inside ml-2" style={{ color: "#7A5C3A" }}>
                <li><span className="font-semibold">Commission Model</span> – Earn attractive commissions on every rug sale you generate.</li>
                <li><span className="font-semibold">Dealer / Reseller Model</span> – Become a Wool Jute Rug Co authorized reseller and grow with us.</li>
              </ul>
              <span className="block text-gray-600 mt-2">Choose the model that fits your business best, or contact us to discuss which option is right for you!</span>
            </p>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                {["Premium handcrafted rugs", "Pan-India shipping", "Dedicated partner support", "Transparent margins"].map((item, i) => (
                  <div key={i} className="rounded-lg p-4 shadow-sm font-roboto" style={{ backgroundColor: "#F5ECD7", border: "1px solid #C9A84C", color: "#3D1C02" }}>
                    {item}
                  </div>
                ))}
              </div>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-[#0f2b47] mb-2">
                Share your details
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Fill the form and our partnerships team will contact you within
                24-48 hours.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="number">Phone number</Label>
                    <Input
                      id="number"
                      name="number"
                      type="tel"
                      placeholder="98765 43210"
                      value={formData.number}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="Gurugram"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="Haryana"
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="hidden md:block" />
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us a bit about your business and how you would like to partner."
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
