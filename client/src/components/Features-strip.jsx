import { motion } from "framer-motion";
import { Truck, Shield, CreditCard, CheckCircle2 } from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      icon: Truck,
      title: "Free Shipping",
      description: "On orders above ₹999",
      color: "#22c55e",
    },
    {
      icon: Shield,
      title: "Secure Payment",
      description: "100% secure transaction",
      color: "#22c55e",
    },
    {
      icon: CreditCard,
      title: "Easy Returns",
      description: "7-day return policy",
      color: "#22c55e",
    },
    {
      icon: CheckCircle2,
      title: "Quality Guaranteed",
      description: "Premium women's fashion",
      color: "#22c55e",
    },
  ];

  return (
    <section className="relative py-8 md:py-12 bg-gray-50">
      {/* Top dark section */}
      <div className="absolute top-0 left-0 w-full h-16 md:h-24 bg-gradient-to-b from-gray-900 to-gray-800"></div>

      <div className="container mx-auto px-4 max-w-7xl relative z-10 pt-8 md:pt-12">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center p-4 md:p-6 bg-white rounded-lg hover:shadow-md transition-shadow duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <motion.div
                  className="mb-3 md:mb-4"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <IconComponent
                    className="w-8 h-8 md:w-10 md:h-10"
                    style={{ color: feature.color }}
                    strokeWidth={1.5}
                  />
                </motion.div>
                <h3 className="text-sm md:text-base font-bold text-gray-900 mb-1 md:mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
