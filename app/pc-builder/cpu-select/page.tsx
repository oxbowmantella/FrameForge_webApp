"use client";
import React, { useState } from "react";
import { MagicCard } from "@/components/ui/magic-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";

const CpuBrandSelector = () => {
  const router = useRouter();
  const { setCPUBrand } = usePCBuilderStore();
  const [selectedBrand, setSelectedBrand] = useState<"amd" | "intel" | null>(
    null
  );

  const handleSelectBrand = (brand: "amd" | "intel", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Selecting brand:", brand);
    setSelectedBrand(brand);
  };

  const handleNext = () => {
    if (selectedBrand) {
      console.log("Setting CPU brand in store:", {
        selectedBrand: selectedBrand.toUpperCase(),
      });

      // Set the CPU brand in store
      setCPUBrand(selectedBrand.toUpperCase() as "AMD" | "Intel");

      // Verify the stored value
      setTimeout(() => {
        const currentPreferences = usePCBuilderStore.getState().preferences;
        console.log("Verified store values after setting:", {
          storedCPUBrand: currentPreferences.cpuBrand,
          allPreferences: currentPreferences,
        });
      }, 0);

      router.push("/pc-builder/cpu");
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
                Select CPU Brand
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Choose your preferred processor manufacturer
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
                onClick={() => handleNext()}
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
                        AMD Processors
                      </h2>
                      <p
                        className={`mt-2 ${
                          selectedBrand === "amd"
                            ? "text-white/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        High-performance processors with excellent
                        multi-threading capabilities
                      </p>
                    </div>
                  </div>
                </div>
              </MagicCard>
            </div>

            {/* Intel Card Wrapper */}
            <div
              className="w-full"
              onClick={(e) => handleSelectBrand("intel", e)}
            >
              <MagicCard
                asChild
                className={`relative cursor-pointer flex-col items-center justify-center p-0 shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden `}
                gradientColor={"#1c76d3"}
              >
                <div className="w-full">
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${
                      selectedBrand === "intel"
                        ? "bg-[#1c76d3]"
                        : "bg-transparent"
                    }`}
                  />
                  <div className="relative z-10 p-12">
                    <div className="w-full h-32 mb-8 flex items-center justify-center">
                      <svg
                        viewBox="4.7 3.1 388.2 150.6"
                        className={`w-full h-full transition-colors duration-300 ${
                          selectedBrand === "intel"
                            ? "fill-white"
                            : "fill-foreground"
                        }`}
                      >
                        <path d="m4.7 5.2h28.1v28.1h-28.1z" />
                        <path d="m32.1 151.6v-101.2h-26.6v101.2zm176.8 1v-24.8c-3.9 0-7.2-.2-9.6-.6-2.8-.4-4.9-1.4-6.3-2.8s-2.3-3.4-2.8-6c-.4-2.5-.6-5.8-.6-9.8v-35.4h19.3v-22.8h-19.3v-39.5h-26.7v97.9c0 8.3.7 15.3 2.1 20.9 1.4 5.5 3.8 10 7.1 13.4s7.7 5.8 13 7.3c5.4 1.5 12.2 2.2 20.3 2.2zm152.8-1v-148.5h-26.7v148.5zm-224.5-91.3c-7.4-8-17.8-12-31-12-6.4 0-12.2 1.3-17.5 3.9-5.2 2.6-9.7 6.2-13.2 10.8l-1.5 1.9v-14.5h-26.3v101.2h26.5v-53.9 1.9c.3-9.5 2.6-16.5 7-21 4.7-4.8 10.4-7.2 16.9-7.2 7.7 0 13.6 2.4 17.5 7 3.8 4.6 5.8 11.1 5.8 19.4v53.7h26.9v-57.4c.1-14.4-3.7-25.8-11.1-33.8zm184 40.5c0-7.3-1.3-14.1-3.8-20.5-2.6-6.3-6.2-11.9-10.7-16.7-4.6-4.8-10.1-8.5-16.5-11.2s-13.5-4-21.2-4c-7.3 0-14.2 1.4-20.6 4.1-6.4 2.8-12 6.5-16.7 11.2s-8.5 10.3-11.2 16.7c-2.8 6.4-4.1 13.3-4.1 20.6s1.3 14.2 3.9 20.6 6.3 12 10.9 16.7 10.3 8.5 16.9 11.2c6.6 2.8 13.9 4.2 21.7 4.2 22.6 0 36.6-10.3 45-19.9l-19.2-14.6c-4 4.8-13.6 11.3-25.6 11.3-7.5 0-13.7-1.7-18.4-5.2-4.7-3.4-7.9-8.2-9.6-14.1l-.3-.9h79.5zm-79.3-9.3c0-7.4 8.5-20.3 26.8-20.4 18.3 0 26.9 12.9 26.9 20.3z" />
                      </svg>
                    </div>
                    <div
                      className={`text-center transition-colors duration-300`}
                    >
                      <h2
                        className={`text-2xl font-bold ${
                          selectedBrand === "intel" ? "text-white" : ""
                        }`}
                      >
                        Intel Processors
                      </h2>
                      <p
                        className={`mt-2 ${
                          selectedBrand === "intel"
                            ? "text-white/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        Industry-leading single-core performance and reliability
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

export default CpuBrandSelector;
