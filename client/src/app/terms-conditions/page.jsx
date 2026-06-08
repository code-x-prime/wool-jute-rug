import { Card, CardContent } from "@/components/ui/card";

export default function TermsAndConditions() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 font-jost">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl tracking-widest uppercase font-normal text-[#3D1C02] mb-3">
          Terms &amp; Conditions
        </h1>
        <div className="h-0.5 w-16 bg-[#C9A84C] mx-auto mb-6"></div>
        <p className="text-sm text-gray-500 uppercase tracking-widest">
          Last Updated: June 2026
        </p>
      </div>

      <Card className="border border-[#e5e0da] shadow-none bg-white rounded-none">
        <CardContent className="space-y-8 p-8 md:p-12 text-gray-800 leading-relaxed font-roboto">
          <p className="text-base font-jost tracking-wide text-gray-600">
            Welcome to Wool Jute Rug Co. By using our website or placing an order, you agree to these Terms.
          </p>

          <hr className="border-[#e5e0da]" />

          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Handmade Products
            </h2>
            <p className="text-sm text-gray-600">
              All rugs are handcrafted. Slight variations in color, size, texture, weave, pattern, and finish are natural characteristics of handmade products and are not considered defects.
            </p>
            <blockquote className="border-l-2 border-[#C9A84C] pl-4 italic text-sm text-gray-500 my-2">
              &ldquo;Variation is the beauty of handmade rugs.&rdquo;
            </blockquote>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Orders &amp; Pricing
            </h2>
            <p className="text-sm text-gray-600">
              We reserve the right to refuse, cancel, or modify any order due to pricing errors, product availability, suspected fraud, or other legitimate business reasons.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Custom Rugs
            </h2>
            <p className="text-sm text-gray-600">
              Custom, personalized, and made-to-order rugs are final sale and cannot be cancelled, returned, or refunded once production has begun.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Shipping
            </h2>
            <p className="text-sm text-gray-600">
              Delivery dates are estimates only. We are not responsible for delays caused by shipping carriers, customs, weather conditions, or events beyond our control.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Intellectual Property
            </h2>
            <p className="text-sm text-gray-600">
              All content, images, designs, logos, and product information on this website are the property of Wool Jute Rug Co. and may not be copied, reproduced, or used without permission.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Liability
            </h2>
            <p className="text-sm text-gray-600">
              Wool Jute Rug Co. shall not be liable for indirect, incidental, or consequential damages arising from the use of our website, products, or services.
            </p>
          </div>

          {/* Section 7 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Updates
            </h2>
            <p className="text-sm text-gray-600">
              We may update these Terms at any time. Continued use of the website constitutes acceptance of any changes.
            </p>
          </div>

          <hr className="border-[#e5e0da]" />

          {/* Contact */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-500 font-jost tracking-wide">
              Have questions? Contact Support at
            </p>
            <a 
              href="mailto:support@wooljuterugco.com" 
              className="text-base font-semibold text-[#C9A84C] hover:text-[#3D1C02] transition-colors font-jost mt-1 inline-block"
            >
              support@wooljuterugco.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
