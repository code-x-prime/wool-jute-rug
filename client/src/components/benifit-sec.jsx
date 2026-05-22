import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Truck, Users, Lock } from "lucide-react";

const BenefitsSec = () => {
  const benefits = [
    {
      title: "Premium Quality",
      description:
        "Carefully curated fashion pieces made with high-quality materials for lasting style.",
      icon: Sparkles,
    },
    {
      title: "Fast Delivery",
      description:
        "Get your fashion items delivered to your doorstep within 2-3 business days.",
      icon: Truck,
    },
    {
      title: "Expert Support",
      description:
        "Our team of fashion experts is available to help you choose the perfect style.",
      icon: Users,
    },
    {
      title: "Secure Payments",
      description: "Shop with confidence with our 100% secure payment gateway.",
      icon: Lock,
    },
  ];

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header Text */}
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-light tracking-wide mb-3 text-gray-900">
            Why Choose Us
          </h2>
          <p className="text-gray-500 text-base md:text-lg font-light">
            We&apos;re committed to providing you with the best fashion
            experience
          </p>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white">
          {/* Left side - Image with overlay */}
          <motion.div
            className="relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Image
              width={800}
              height={800}
              src="/banner-background.jpg"
              alt="Fashion collection"
              className="w-full h-full object-cover"
              priority
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/60 to-black/50" />

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 z-10">
              <motion.div
                className="text-white max-w-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-light mb-4 md:mb-6 leading-tight tracking-wide">
                  The highest quality for your style
                </h3>
                <p className="text-gray-200 mb-6 md:mb-8 text-sm md:text-base leading-relaxed">
                  We carefully curate each collection to ensure you get the best
                  fashion pieces for your wardrobe.
                </p>
                <Link href="/about">
                  <motion.button
                    className="px-6 md:px-8 py-3 md:py-4 bg-white text-black font-semibold rounded-none hover:bg-gray-100 transition-all duration-300 uppercase tracking-wider text-xs md:text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Learn More
                  </motion.button>
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Right side - Benefits grid */}
          <div className="grid grid-cols-2 bg-white">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="p-4 md:p-6 lg:p-10 bg-white border-r border-b border-gray-200 hover:bg-gray-50 transition-colors duration-300 group"
                >
                  <div className="flex flex-col h-full">
                    <div className="mb-4">
                      <motion.div
                        className="text-black"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <IconComponent
                          className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10"
                          strokeWidth={1.5}
                        />
                      </motion.div>
                    </div>
                    <h3 className="text-base md:text-lg lg:text-xl font-bold mb-3 text-gray-900 group-hover:text-[#136C5B] transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 text-xs md:text-sm lg:text-base leading-relaxed flex-grow">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSec;
