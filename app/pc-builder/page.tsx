"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";

interface PCType {
  title: string;
  image: string;
  priceRange: string;
  badges: string[];
  maxPrice: number;
  minPrice: number;
}

const pcTypes: PCType[] = [
  {
    title: "Entry-Level Build",
    image: "1-pc.webp",
    priceRange: "500-1000",
    badges: [
      "1080p Gaming",
      "Office Work",
      "Light Content Creation",
      "Web Browsing",
    ],
    maxPrice: 1000,
    minPrice: 500,
  },
  {
    title: "Mid-Range Build",
    image: "2-pc.webp",
    priceRange: "1000-2000",
    badges: [
      "1440p Gaming",
      "Content Creation",
      "Multitasking",
      "Light Streaming",
    ],
    maxPrice: 2000,
    minPrice: 1000,
  },
  {
    title: "High-End Build",
    image: "3-pc.webp",
    priceRange: "2000-4000",
    badges: ["4K Gaming", "Heavy Streaming", "Video Editing", "3D Rendering"],
    maxPrice: 4000,
    minPrice: 2000,
  },
];

const PCShowcase = () => {
  const router = useRouter();
  const { setBudget, setSelectedType } = usePCBuilderStore();
  const [selectedPrice, setSelectedPrice] = useState(800);

  // Get PC type based on price
  const getTypeFromPrice = (price: number): PCType => {
    if (price <= 1000) return pcTypes[0]; // Entry-Level
    if (price <= 2000) return pcTypes[1]; // Mid-Range
    return pcTypes[2]; // High-End
  };

  // Initialize on mount
  useEffect(() => {
    setBudget(800);
    setSelectedType(getTypeFromPrice(800).title);
  }, []);

  // Handle slider changes
  const handleSliderChange = (value: number[]) => {
    const newPrice = value[0];
    setSelectedPrice(newPrice);
    setBudget(newPrice);
    setSelectedType(getTypeFromPrice(newPrice).title);
  };

  // Handle card clicks
  const handleCardClick = (type: PCType) => {
    // Animate the price change
    const duration = 500;
    const steps = 20;
    const startPrice = selectedPrice;
    const endPrice = type.maxPrice;
    const increment = (endPrice - startPrice) / steps;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const newPrice =
        step === steps ? endPrice : Math.round(startPrice + increment * step);

      setSelectedPrice(newPrice);
      setBudget(newPrice);
      setSelectedType(getTypeFromPrice(newPrice).title);

      if (step === steps) clearInterval(interval);
    }, duration / steps);
  };

  // In PCShowcase component
  const handleNext = () => {
    // Ensure final values are set in storage
    console.log("Handle Next clicked");
    setBudget(selectedPrice);
    setSelectedType(currentType.title);
    router.push("/pc-builder/motherboard");
  };

  const currentType = getTypeFromPrice(selectedPrice);

  return (
    <div className="bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Budget and Requirement
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Select your budget or click a build type
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="default"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                variant="default"
                size="default"
                onClick={() => handleNext()}
                className="flex-1 sm:flex-none gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Budget Selector Card */}
        <Card className="w-full">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="w-full sm:w-1/2">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={selectedPrice}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="text-3xl sm:text-4xl font-bold text-primary mb-2"
                  >
                    ${selectedPrice.toLocaleString()}
                  </motion.p>
                </AnimatePresence>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Slider
                    value={[selectedPrice]}
                    onValueChange={handleSliderChange}
                    min={500}
                    max={4000}
                    step={100}
                    className="w-full"
                  />
                </motion.div>
              </div>
              <div className="w-full sm:w-1/2 text-left sm:text-right">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentType.title}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-lg sm:text-xl font-medium"
                  >
                    Build Type: {currentType.title}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Build Type Cards */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pcTypes.map((type, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{
                    scale: 1.03,
                    transition: { duration: 0.2, ease: "easeOut" },
                  }}
                  onClick={() => handleCardClick(type)}
                  className="cursor-pointer"
                >
                  <Card
                    className={`relative h-[350px] overflow-hidden transition-all ${
                      currentType.title === type.title
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                  >
                    <motion.div
                      className="absolute inset-0 bg-cover bg-center z-0"
                      style={{
                        backgroundImage: `url(${type.image})`,
                        filter: "brightness(0.3)",
                      }}
                      whileHover={{
                        scale: 1.1,
                        transition: { duration: 0.4 },
                      }}
                    />
                    <CardContent className="relative z-10 h-full flex flex-col justify-between p-6">
                      <motion.div
                        initial={false}
                        whileHover={{ y: -5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {type.title}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {type.badges.map((badge, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
                            >
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                      <motion.div
                        className="bg-black/50 backdrop-blur-sm rounded-lg p-3"
                        whileHover={{
                          backgroundColor: "rgba(0,0,0,0.7)",
                        }}
                      >
                        <p className="text-white text-lg">
                          Budget Range: ${type.priceRange}
                        </p>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Features Section */}
          <Card className="lg:col-span-4 border-none">
            <CardContent className="p-6 ">
              <h3 className="text-2xl font-bold mb-4">AI-Powered Building</h3>
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <ul className="space-y-4 text-muted-foreground">
                  {[
                    "AI suggests compatible parts within your budget",
                    "Personalized recommendations based on usage",
                    "Ensures component compatibility",
                    "Compare options within price range",
                  ].map((item, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PCShowcase;
