"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeatureBadge } from "@/components/ui/feature-badge";

// Types
interface CPUResponse {
  name: string;
  price: number;
  socket: string;
  coreCount: string;
  coreClock: string;
  boostClock: string;
  tdp: string;
  features: {
    integratedGraphics: string | null;
    includesCooler: boolean;
    cache: {
      l2: string;
      l3: string;
    };
  };
  details: {
    manufacturer: string;
    series: string;
    image: string;
  };
  recommendation: {
    isRecommended: boolean;
    summary: string;
    reasons: string[];
    performanceScore: number;
  };
}

interface CPUSpecifications {
  socket: string;
  series: string;
  coreCount: string;
  coreClock: string;
  boostClock: number;
  tdp: number;
  integratedGraphics?: string;
  includesCooler: boolean;
  cache: {
    l2: number;
    l3: number;
  };
  performanceScore: number;
}

interface APIResponse {
  cpus: CPUResponse[];
  metadata: {
    totalPages: number;
    currentPage: number;
    priceRange: {
      min: number;
      max: number;
    };
  };
}

interface FeatureBadgeProps {
  icon?: React.ComponentType<any>;
  text: string;
  variant?: "outline" | "default" | "secondary";
}

// Helper Functions
const generateUniqueId = (cpu: CPUResponse): string => {
  // Create a unique identifier combining multiple attributes
  const features = [
    cpu.features.includesCooler ? "with-cooler" : "no-cooler",
    cpu.features.integratedGraphics ? "igpu" : "no-igpu",
    cpu.price.toString().replace(".", "-"),
  ].join("-");

  return `${cpu.name}-${features}`.toLowerCase().replace(/\s+/g, "-");
};

const processImageUrl = (url: string): string => {
  if (!url) return "";
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  return url;
};

// Main Component
export default function CPUSelector() {
  const router = useRouter();
  const { budget, setComponent, preferences } = usePCBuilderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCPU, setSelectedCPU] = useState<CPUResponse | null>(null);
  const [data, setData] = useState<APIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCPUs = async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/ai/cpu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budget,
          cpuBrand: preferences.cpuBrand,
          page,
          searchTerm: searchTerm.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || "Failed to fetch CPU recommendations"
        );
      }

      const responseData: APIResponse = await response.json();

      // Add unique IDs to each CPU
      responseData.cpus = responseData.cpus.map((cpu) => ({
        ...cpu,
        uniqueId: generateUniqueId(cpu),
      }));

      setData(responseData);
      setCurrentPage(page);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCPUs(1);
  }, [budget, preferences.cpuBrand]);

  const handleNextPage = () => {
    if (data && currentPage < data.metadata.totalPages) {
      fetchCPUs(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchCPUs(currentPage - 1);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCPUs(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectCPU = (cpu: CPUResponse) => {
    setSelectedCPU(cpu);
  };

  const handleConfirmSelection = () => {
    console.log("Selected CPU:", selectedCPU);
    if (selectedCPU) {
      // Use the setComponent function from the store
      setComponent("cpu", {
        id: generateUniqueId(selectedCPU),
        name: selectedCPU.name,
        price: selectedCPU.price,
        image: processImageUrl(selectedCPU.details.image),
        type: "cpu",
        specifications: {
          socket: selectedCPU.socket,
          coreCount: selectedCPU.coreCount,
          coreClock: selectedCPU.coreClock,
          boostClock: parseFloat(selectedCPU.boostClock),
          tdp: parseFloat(selectedCPU.tdp),
          integratedGraphics:
            selectedCPU.features.integratedGraphics ?? undefined,
          includesCooler: selectedCPU.features.includesCooler,
          cache: {
            l2: parseFloat(selectedCPU.features.cache.l2),
            l3: parseFloat(selectedCPU.features.cache.l3),
          },
          performanceScore: selectedCPU.recommendation.performanceScore,
        },
      });

      router.push("/pc-builder/motherboard");
    }
  };

  const handleBack = () => {
    router.push("/pc-builder/cpu-select");
  };

  const renderFeatures = (cpu: CPUResponse) => {
    const features = [];

    if (cpu.socket) {
      features.push({
        key: "socket",
        icon: "Cpu",
        text: `Socket ${cpu.socket}`,
        variant: "default",
      });
    }

    if (cpu.coreCount) {
      features.push({
        key: "cores",
        icon: "Zap",
        text: `${cpu.coreCount} Cores`,
        variant: "outline",
      });
    }

    if (cpu.boostClock) {
      features.push({
        key: "boost",
        icon: "Gauge",
        text: `Boost: ${cpu.boostClock}`,
        variant: "secondary",
      });
    }

    if (cpu.tdp) {
      features.push({
        key: "tdp",
        icon: "ThermometerSun",
        text: `${cpu.tdp} TDP`,
        variant: "outline",
      });
    }

    if (cpu.features.integratedGraphics) {
      features.push({
        key: "igpu",
        icon: "MonitorSmartphone",
        text: cpu.features.integratedGraphics,
        variant: "secondary",
      });
    }

    if (cpu.features.includesCooler) {
      features.push({
        key: "cooler",
        icon: "Snowflake",
        text: "Includes Cooler",
        variant: "secondary",
      });
    }

    return features;
  };

  // Return JSX for the CPU Selector component
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Select CPU</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {data?.metadata.priceRange &&
                  `Budget Range: $${data.metadata.priceRange.min.toFixed(
                    0
                  )} - $${data.metadata.priceRange.max.toFixed(0)}`}
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="default"
                onClick={handleBack}
                className="flex-1 sm:flex-none gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                variant="default"
                size="default"
                onClick={handleConfirmSelection}
                className="flex-1 sm:flex-none gap-2"
                disabled={!selectedCPU}
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Search Bar */}
        <div className="flex gap-4 mb-8">
          <Input
            type="text"
            placeholder="Search CPUs..."
            className="flex-grow text-lg p-6"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button className="p-6" variant="outline" onClick={handleSearch}>
            <Search className="h-6 w-6" />
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-6 text-center text-red-500 mb-6">{error}</Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && !data?.cpus.length && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No CPUs found matching your criteria. Try adjusting your search or
              budget.
            </p>
          </Card>
        )}

        {/* CPU Listings */}
        {!isLoading && !error && data?.cpus.length > 0 && (
          <div className="space-y-6">
            {data.cpus.map((cpu) => (
              <div
                key={generateUniqueId(cpu)}
                className={`
                relative group
                transition-all duration-300 ease-in-out
                ${
                  selectedCPU?.name === cpu.name &&
                  selectedCPU.price === cpu.price &&
                  selectedCPU.features.includesCooler ===
                    cpu.features.includesCooler
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:shadow-md"
                }
              `}
              >
                <Card
                  className="p-6 cursor-pointer"
                  onClick={() => handleSelectCPU(cpu)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-secondary/10 rounded-lg overflow-hidden">
                      <Image
                        src={processImageUrl(cpu.details.image)}
                        alt={cpu.name}
                        width={200}
                        height={200}
                        className="object-contain w-full h-full"
                      />
                    </div>

                    {/* Content Section */}
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold">{cpu.name}</h3>
                            {cpu.recommendation.isRecommended && (
                              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                <Star className="w-3 h-3 mr-1" />
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mt-1">
                            {cpu.details.manufacturer} | {cpu.details.series}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${cpu.price.toFixed(2)}
                          </div>
                          <Button
                            variant={
                              selectedCPU?.name === cpu.name &&
                              selectedCPU.price === cpu.price &&
                              selectedCPU.features.includesCooler ===
                                cpu.features.includesCooler
                                ? "default"
                                : "outline"
                            }
                            className="mt-2 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCPU(cpu);
                            }}
                          >
                            {selectedCPU?.name === cpu.name &&
                            selectedCPU.price === cpu.price &&
                            selectedCPU.features.includesCooler ===
                              cpu.features.includesCooler ? (
                              <>
                                <Check className="h-4 w-4" /> Selected
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" /> Select
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Performance Score */}
                      <div className="mt-4">
                        <Badge variant="secondary" className="mb-2">
                          Performance Score:{" "}
                          {cpu.recommendation.performanceScore}/100
                        </Badge>
                      </div>

                      {/* Features */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {renderFeatures(cpu).map((feature) => (
                          <FeatureBadge
                            key={feature.key}
                            icon={feature.icon}
                            text={feature.text}
                            variant={feature.variant}
                          />
                        ))}
                      </div>

                      {/* Cache Information */}
                      <div className="mt-4 text-sm text-muted-foreground">
                        <span className="font-medium">Cache:</span>{" "}
                        {cpu.features.cache.l2 !== "Unknown" && (
                          <span>L2: {cpu.features.cache.l2}</span>
                        )}
                        {cpu.features.cache.l3 !== "Unknown" &&
                          cpu.features.cache.l3 !== "0 MB" && (
                            <span> | L3: {cpu.features.cache.l3}</span>
                          )}
                      </div>

                      {/* AI Recommendations */}
                      <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                        <p className="font-medium mb-2">
                          {cpu.recommendation.summary}
                        </p>
                        <ul className="text-sm space-y-1">
                          {cpu.recommendation.reasons.map((reason, idx) => (
                            <li key={idx} className="text-muted-foreground">
                              • {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && data && data.metadata.totalPages > 1 && (
          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="outline"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            <span className="flex items-center">
              Page {currentPage} of {data.metadata.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={currentPage === data.metadata.totalPages}
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Mobile Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBack}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={handleConfirmSelection}
              className="flex-1"
              disabled={!selectedCPU}
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Bottom Padding for Mobile Navigation */}
        <div className="h-24 lg:h-0" />
      </div>
    </div>
  );
}
