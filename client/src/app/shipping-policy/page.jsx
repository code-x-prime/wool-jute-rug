import { Card, CardContent } from "@/components/ui/card";

export default function ShippingPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 font-jost">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl tracking-widest uppercase font-normal text-[#3D1C02] mb-3">
          Shipping &amp; Delivery Policy
        </h1>
        <div className="h-0.5 w-16 bg-[#C9A84C] mx-auto mb-6"></div>
        <p className="text-sm text-gray-500 uppercase tracking-widest">
          Last Updated: June 2026
        </p>
      </div>

      <Card className="border border-[#e5e0da] shadow-none bg-white rounded-none">
        <CardContent className="space-y-8 p-8 md:p-12 text-gray-800 leading-relaxed font-roboto">
          <p className="text-base font-jost tracking-wide text-gray-600">
            We take care to pack and ship every rug securely. Below is everything you need to know about how and when your order will reach you.
          </p>

          <hr className="border-[#e5e0da]" />

          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Order Processing Time
            </h2>
            <p className="text-sm text-gray-600">
              All in-stock orders are processed and dispatched within <strong>2&ndash;5 business days</strong> of payment confirmation. Custom and made-to-order rugs have a separate production timeline which will be communicated at the time of order.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Domestic Shipping (India)
            </h2>
            <p className="text-sm text-gray-600">
              We ship across India using trusted courier partners. Estimated delivery time is <strong>5&ndash;10 business days</strong> after dispatch, depending on your location. Remote areas may take slightly longer. You will receive a tracking number once your order is dispatched.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              International Shipping
            </h2>
            <p className="text-sm text-gray-600">
              We ship internationally via registered courier services. Delivery typically takes <strong>10&ndash;21 business days</strong> depending on the destination country and customs clearance. Import duties, taxes, and customs fees are the sole responsibility of the buyer and are not included in the order total.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Shipping Address
            </h2>
            <p className="text-sm text-gray-600">
              Orders are shipped to the address provided at checkout. Please double-check your address before completing your order. We are unable to redirect shipments once an order has been dispatched.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Delays &amp; Exceptions
            </h2>
            <p className="text-sm text-gray-600">
              While we do our best to meet estimated delivery windows, delays caused by courier operations, weather conditions, public holidays, or customs clearance are outside our control. We will keep you informed if there is a significant delay on our end.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Damaged in Transit
            </h2>
            <p className="text-sm text-gray-600">
              If your rug arrives damaged due to transit, please photograph the packaging and the product and contact us within <strong>48 hours of delivery</strong>. We will assess the case and arrange a replacement or resolution promptly.
            </p>
          </div>

          <hr className="border-[#e5e0da]" />

          {/* Contact */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-500 font-jost tracking-wide uppercase">
              Questions about your shipment?
            </p>
            <p className="text-base font-semibold text-[#3D1C02] font-jost mt-1">
              Wool Jute Rug Co.
            </p>
            <a
              href="mailto:connect.wooljuterugco@gmail.com"
              className="text-base font-semibold text-[#C9A84C] hover:text-[#3D1C02] transition-colors font-jost mt-1 inline-block"
            >
              connect.wooljuterugco@gmail.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
