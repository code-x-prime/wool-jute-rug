import { Card, CardContent } from "@/components/ui/card";

export default function RefundPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <Card>
        <CardContent className="space-y-5 pt-6 text-gray-800">
          <p>
            Morris Enterprises believes in helping its customers as far as
            possible, and has therefore a liberal cancellation policy. Under
            this policy:
          </p>

          <p>
            Cancellations will be considered only if the request is made within
            Same day of placing the order. However, the cancellation request may
            not be entertained if the orders have been communicated to the
            vendors/merchants and they have initiated the process of shipping
            them.
          </p>

          <p>
            Morris Enterprises does not accept cancellation requests for
            perishable items like flowers, eatables etc. However,
            refund/replacement can be made if the customer establishes that the
            quality of product delivered is not good.
          </p>

          <p>
            In case of receipt of damaged or defective items please report the
            same to our Customer Service team. The request will, however, be
            entertained once the merchant has checked and determined the same at
            his own end. This should be reported within Same day of receipt of
            the products.
          </p>

          <p>
            In case you feel that the product received is not as shown on the
            site or as per your expectations, you must bring it to the notice of
            our customer service within Same day of receiving the product. The
            Customer Service Team after looking into your complaint will take an
            appropriate decision.
          </p>

          <p>
            In case of complaints regarding products that come with a warranty
            from manufacturers, please refer the issue to them.
          </p>

          <p>
            In case of any Refunds approved by the Morris Enterprises,
            it&apos;ll take 3-5 days for the refund to be processed to the end
            customer.
          </p>

          <p className="text-sm">Last updated on Jul 14 2025</p>
        </CardContent>
      </Card>
    </div>
  );
}
