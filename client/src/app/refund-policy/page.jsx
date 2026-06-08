import { Card, CardContent } from "@/components/ui/card";

export default function RefundPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 font-jost">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl tracking-widest uppercase font-normal text-[#3D1C02] mb-3">
          Cancellation, Return &amp; Refund Policy
        </h1>
        <div className="h-0.5 w-16 bg-[#C9A84C] mx-auto mb-6"></div>
        <p className="text-sm text-gray-500 uppercase tracking-widest">
          Last Updated: June 2026
        </p>
      </div>

      <Card className="border border-[#e5e0da] shadow-none bg-white rounded-none">
        <CardContent className="space-y-8 p-8 md:p-12 text-gray-800 leading-relaxed font-roboto">
          <p className="text-base font-jost tracking-wide text-gray-600">
            At Wool Jute Rug Co., every rug is handcrafted by skilled artisans using natural fibers. As each rug is handmade, slight variations in color, texture, weave, pattern and size are natural and are not considered defects.
          </p>

          <hr className="border-[#e5e0da]" />

          {/* Section 1: Handmade Product Notice */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Handmade Product Notice
            </h2>
            <blockquote className="border-l-2 border-[#C9A84C] pl-4 italic text-sm text-gray-500 my-2 font-jost">
              &ldquo;Variation is the beauty of handmade rugs.&rdquo;
            </blockquote>
            <p className="text-sm text-gray-600">
              Minor variations in color, texture, weave, fringe, pile height and dimensions (up to &plusmn;5%) are normal characteristics of handmade products and do not qualify for return, refund or replacement.
            </p>
          </div>

          {/* Section 2: Order Cancellation */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Order Cancellation
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600">
              <li>Orders may be cancelled within 24 hours of purchase.</li>
              <li>Once production has started or the order has been shipped, cancellation is not possible.</li>
              <li>Custom and made-to-order rugs cannot be cancelled after production begins.</li>
            </ul>
          </div>

          {/* Section 3: Returns */}
          <div className="space-y-4">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Returns
            </h2>
            
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[#3D1C02]">Returns are accepted only if:</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                <li>The wrong product is delivered.</li>
                <li>The product arrives damaged.</li>
                <li>There is a significant manufacturing defect.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-[#3D1C02]">Returns are not accepted for:</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                <li>Change of mind.</li>
                <li>Color or texture preference.</li>
                <li>Normal handmade variations.</li>
                <li>Custom-made or personalized rugs.</li>
              </ul>
            </div>
          </div>

          {/* Section 4: Return Request */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Return Request
            </h2>
            <p className="text-sm text-gray-600">
              All return requests must be submitted within 48 hours of delivery with photographs of the product and packaging.
            </p>
          </div>

          {/* Section 5: Refunds */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Refunds &amp; Resolutions
            </h2>
            <p className="text-sm text-gray-600">
              After inspection and approval, we may offer:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
              <li>Replacement</li>
              <li>Store Credit</li>
              <li>Partial Refund</li>
              <li>Full Refund</li>
            </ul>
            <p className="text-sm text-gray-600 pt-1">
              Refunds are processed within 7&ndash;14 business days after approval.
            </p>
          </div>

          {/* Section 6: International Orders */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              International Orders
            </h2>
            <p className="text-sm text-gray-600">
              Import duties, customs fees and local taxes are the responsibility of the customer and are non-refundable.
            </p>
          </div>

          <hr className="border-[#e5e0da]" />

          {/* Contact */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-500 font-jost tracking-wide uppercase">
              Contact Us
            </p>
            <p className="text-base font-semibold text-[#3D1C02] font-jost mt-1">
              Wool Jute Rug Co.
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
