"use client";
import React, { useState } from "react";
import { MagicCard } from "@/components/ui/magic-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";

const GpuBrandSelector = () => {
  const router = useRouter();
  const [selectedBrand, setSelectedBrand] = useState<"amd" | "nvidia" | null>(
    null
  );
  const { setGPUBrand } = usePCBuilderStore();

  const handleSelectBrand = (brand: "amd" | "nvidia", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBrand(brand);
    if (brand === "nvidia") {
      setGPUBrand("NVIDIA");
    } else if (brand === "amd") {
      setGPUBrand("AMD");
    }
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
                onClick={() => {
                  if (selectedBrand) {
                    router.push("/pc-builder/gpu");
                  }
                }}
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
                        viewBox="0 0 800 190"
                        className={`w-full h-full transition-colors duration-300 ${
                          selectedBrand === "nvidia"
                            ? "fill-white"
                            : "fill-foreground"
                        }`}
                      >
                        <path
                          d="M59.66 10.76v-.249h.16c.086 0 .205.007.205.113 0 .115-.06.135-.164.135zm0 .173h.106l.247.433h.272l-.274-.45c.142-.01.258-.077.258-.267 0-.237-.164-.313-.439-.313h-.399v1.03h.23zm1.16-.08c0-.606-.47-.957-.995-.957-.528 0-.999.351-.999.957 0 .605.471.958 1 .958.523 0 .994-.353.994-.958m-.288 0c0 .441-.323.738-.707.738v-.003c-.394.003-.712-.294-.712-.735s.318-.736.712-.736c.384 0 .707.295.707.736M24.307.604l.001 10.868h3.069V.604zM.16.589v10.883h3.097V3.209h2.399c.794 0 1.36.197 1.744.607.485.517.683 1.351.683 2.878v4.778h3.001V5.459c0-4.292-2.736-4.87-5.412-4.87zm29.09.015v10.868h4.978c2.653 0 3.519-.441 4.455-1.43.662-.694 1.089-2.219 1.089-3.883 0-1.528-.362-2.891-.993-3.74C37.642.9 36.003.604 33.558.604zm3.044 2.366h1.32c1.914 0 3.153.861 3.153 3.091 0 2.232-1.239 3.092-3.153 3.092h-1.32zM19.882.604l-2.563 8.614L14.865.604h-3.314l3.506 10.868h4.424L23.015.604zM41.2 11.472h3.071V.604H41.2zM49.806.608L45.52 11.47h3.026l.678-1.921h5.073l.642 1.921h3.286L53.906.608zm1.992 1.981l1.86 5.089H49.88z"
                          transform="scale(12) translate(5, 5)"
                        />
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
