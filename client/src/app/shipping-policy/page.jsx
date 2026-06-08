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
            Learn more about our shipping partners, processing timelines, and domestic/international delivery terms.
          </p>

          <hr className="border-[#e5e0da]" />

          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Shipping &amp; Courier Channels
            </h2>
            <p className="text-sm text-gray-600">
              For International buyers, orders are shipped and delivered through registered international courier companies and/or International speed post only. For domestic buyers, orders are shipped through registered domestic courier companies and/or speed post only.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Dispatch &amp; Delivery Timelines
            </h2>
            <p className="text-sm text-gray-600">
              Orders are dispatched within 0-7 days or as per the delivery date agreed at the time of order confirmation. The delivery timeline is subject to Courier Company / post office norms.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Liability Disclaimer
            </h2>
            <p className="text-sm text-gray-600">
              Wool Jute Rug Co. is not liable for any delay in delivery by the courier company / postal authorities and only guarantees to hand over the consignment to the courier company or postal authorities within 0-7 days from the date of the order and payment, or as per the delivery date agreed at the time of order confirmation.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="font-jost text-sm font-bold uppercase tracking-widest text-[#3D1C02]">
              Delivery Address
            </h2>
            <p className="text-sm text-gray-600">
              All orders will be delivered to the shipping address provided by the buyer at the time of checkout. Confirmation of your shipment will be sent to the email ID provided during registration/checkout.
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
