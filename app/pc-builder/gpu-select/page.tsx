import React, { useState } from "react";
import { MagicCard } from "@/components/ui/magic-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const GpuBrandSelector = () => {
  const router = useRouter();
  const [selectedBrand, setSelectedBrand] = useState<"amd" | "nvidia" | null>(
    null
  );

  const handleSelectBrand = (brand: "amd" | "nvidia", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Selecting brand:", brand);
    setSelectedBrand(brand);
  };

  return (
    <div className="min-h-[calc(75vh)] flex flex-col bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Select GPU Brand
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Choose your preferred graphics card manufacturer
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="default"
                onClick={() => router.push("/pc-builder")}
                className="flex-1 sm:flex-none gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                variant="default"
                size="default"
                onClick={() => router.push("/pc-builder/gpu")}
                className="flex-1 sm:flex-none gap-2"
                disabled={!selectedBrand}
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-5xl w-full">
          <div className="flex flex-col lg:flex-row gap-6 justify-center">
            {/* AMD Card Wrapper */}
            <div
              className="w-full"
              onClick={(e) => handleSelectBrand("amd", e)}
            >
              <MagicCard
                asChild
                className={`relative cursor-pointer flex-col items-center justify-center p-0 shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden`}
                gradientColor={"#FF000040"}
              >
                <div className="w-full">
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${
                      selectedBrand === "amd"
                        ? "bg-[#FF0000]"
                        : "bg-transparent"
                    }`}
                  />
                  <div className="relative z-10 p-12">
                    <div className="w-full h-32 mb-8 flex items-center justify-center">
                      <svg
                        viewBox="0 0 800 190.802"
                        className={`w-full h-full transition-colors duration-300 ${
                          selectedBrand === "amd"
                            ? "fill-white"
                            : "fill-foreground"
                        }`}
                      >
                        <path d="M187.888 178.122H143.52l-13.573-32.738H56.003l-12.366 32.738H0L66.667 12.776h47.761zM91.155 52.286L66.912 116.53h50.913zM349.056 12.776h35.88v165.346h-41.219V74.842l-44.608 51.877h-6.301l-44.605-51.877V178.12h-41.219V12.776h35.88l53.092 61.336zM489.375 12.776c60.364 0 91.391 37.573 91.391 82.909 0 47.517-30.058 82.437-96 82.437h-68.369V12.776zm-31.762 135.041h26.906c41.457 0 53.823-28.129 53.823-52.377 0-28.368-15.276-52.363-54.308-52.363h-26.422v104.74zM662.769 51.981L610.797 0H800v189.21l-51.972-51.975V51.981zM662.708 62.397L609.2 115.903v74.899h74.889l53.505-53.506h-74.886z" />
                      </svg>
                    </div>
                    <div
                      className={`text-center transition-colors duration-300`}
                    >
                      <h2
                        className={`text-2xl font-bold ${
                          selectedBrand === "amd" ? "text-white" : ""
                        }`}
                      >
                        AMD Radeon
                      </h2>
                      <p
                        className={`mt-2 ${
                          selectedBrand === "amd"
                            ? "text-white/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        Advanced graphics with FidelityFX Super Resolution
                        technology
                      </p>
                    </div>
                  </div>
                </div>
              </MagicCard>
            </div>

            {/* NVIDIA Card Wrapper */}
            <div
              className="w-full"
              onClick={(e) => handleSelectBrand("nvidia", e)}
            >
              <MagicCard
                asChild
                className={`relative cursor-pointer flex-col items-center justify-center p-0 shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden`}
                gradientColor={"#76B900"}
              >
                <div className="w-full">
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${
                      selectedBrand === "nvidia"
                        ? "bg-[#76B900]"
                        : "bg-transparent"
                    }`}
                  />
                  <div className="relative z-10 p-12">
                    <div className="w-full h-32 mb-8 flex items-center justify-center">
                      <svg
                        viewBox="0 0 124 124"
                        className={`w-full h-full transition-colors duration-300 ${
                          selectedBrand === "nvidia"
                            ? "fill-white"
                            : "fill-foreground"
                        }`}
                      >
                        <path d="M122.1,1.9C122.1,1.9,122.1,1.9,122.1,1.9C122.1,1.9,122.1,1.9,122.1,1.9c0,0-0.1,0-0.1,0c0,0,0,0,0,0 c0,0,0,0,0,0c0,0,0,0,0,0L84.6,7.2c-2.2,0.3-3.9,2.2-3.9,4.5v82.2c0,1.9,1.2,3.4,2.7,4.1c0.5,0.3,1.1,0.4,1.8,0.4 c0.9,0,1.8-0.3,2.6-0.8l33.8-23c1.5-1,2.3-2.6,2.3-4.3V4.5C124,3.1,123.2,2.1,122.1,1.9z M35.4,100.4c0.2,0,0.3,0,0.5,0 c0.8-0.1,1.5-0.4,2.2-0.8c2.3-1.5,3.7-4.2,3.7-7V28.8c0-1.7-1.4-3.1-3.1-3.1l0,0c-1.7,0-3.1,1.4-3.1,3.1v56c0,0,0,0,0,0.1 c0,0.2,0,0.4-0.1,0.5c-0.1,0.3-0.4,0.5-0.7,0.5c-0.2,0-0.4-0.1-0.5-0.2L3.7,58.5c-0.4-0.3-0.6-0.9-0.5-1.4c0.1-0.5,0.5-0.9,1-1 l24.9-6.2c1.4-0.3,2.3-1.7,2-3.1c-0.3-1.4-1.7-2.3-3.1-2l-27,6.7c0,0-0.1,0-0.1,0c0,0-0.1,0-0.1,0c0,0,0,0,0,0 c0,0-0.1,0-0.1,0c0,0-0.1,0-0.1,0.1c0,0,0,0-0.1,0c0,0-0.1,0-0.1,0.1c0,0,0,0-0.1,0c0,0-0.1,0.1-0.1,0.1c0,0,0,0,0,0 c0,0-0.1,0.1-0.1,0.1c0,0,0,0,0,0c0,0-0.1,0.1-0.1,0.1c0,0,0,0,0,0c0,0,0,0.1-0.1,0.1c0,0,0,0,0,0c0,0,0,0.1-0.1,0.1 c0,0,0,0.1,0,0.1c0,0,0,0.1,0,0.1c0,0,0,0.1,0,0.1c0,0,0,0.1,0,0.1c0,0,0,0.1,0,0.1c0,0,0,0.1,0,0.1c0,0,0,0.1,0,0.1l0.6,37.8 c0,1.3,0.7,2.4,1.7,3.1L35.4,100.4z" />
                      </svg>
                    </div>
                    <div
                      className={`text-center transition-colors duration-300`}
                    >
                      <h2
                        className={`text-2xl font-bold ${
                          selectedBrand === "nvidia" ? "text-white" : ""
                        }`}
                      >
                        NVIDIA GeForce
                      </h2>
                      <p
                        className={`mt-2 ${
                          selectedBrand === "nvidia"
                            ? "text-white/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        Ray tracing and DLSS technology for ultimate gaming
                        performance
                      </p>
                    </div>
                  </div>
                </div>
              </MagicCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GpuBrandSelector;
