"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  ArrowRight,
  ArrowLeft,
  Check,
  Cpu,
  Zap,
  Gauge,
  ThermometerSun,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ITEMS_PER_PAGE = 10;

interface SearchCriteria {
  priceRange: {
    min: number;
    max: number;
  };
  socket?: string;
  recommendedFeatures: string[];
}

interface CPU {
  id: string;
  name: string;
  image: string;
  price: number;
  manufacturer: string;
  socket: string;
  series: string;
  coreCount: string;
  coreClock: string;
  boostClock: string;
  tdp: string;
  integratedGraphics: string;
  cache: {
    l2: string;
    l3: string;
  };
  score: number;
  isRecommended: boolean;
  reasons?: string[];
}

const FeatureBadge = ({
  icon: Icon,
  text,
  variant = "outline",
}: {
  icon?: React.ComponentType<any>;
  text: string;
  variant?: "outline" | "default" | "secondary";
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <Badge variant={variant} className="flex items-center gap-1 px-3 py-1">
          {Icon && <Icon className="h-3 w-3" />}
          <span>{text}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function CPUListing() {
  const router = useRouter();
  const { budget, setComponent, components } = usePCBuilderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCPU, setSelectedCPU] = useState<string | null>(null);
  const [cpus, setCPUs] = useState<CPU[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );

  const fetchCPUs = async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/cpu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget,
          motherboard: components.motherboard,
          page,
          itemsPerPage: ITEMS_PER_PAGE,
          searchTerm: searchTerm.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setCPUs(data.cpus || []);
      setTotalPages(Math.ceil((data.totalCount || 0) / ITEMS_PER_PAGE));
      setSearchCriteria(data.searchCriteria);
    } catch (error) {
      console.error("Error fetching CPUs:", error);
      setError("Failed to load CPUs. Please try again.");
      setCPUs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (budget && components.motherboard) {
      setCurrentPage(1);
      fetchCPUs(1);
    }
  }, [budget, components.motherboard]);

  useEffect(() => {
    if (components.cpu) {
      setSelectedCPU(components.cpu.id);
    }
  }, [components.cpu]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCPUs(1);
  };

  const handleAddReplace = (cpu: CPU) => {
    if (selectedCPU === cpu.id) {
      setSelectedCPU(null);
      setComponent("cpu", null);
    } else {
      setSelectedCPU(cpu.id);
      setComponent("cpu", {
        id: cpu.id,
        name: cpu.name,
        price: cpu.price,
        image: processImageUrl(cpu.image),
        type: "cpu",
        specifications: {
          socket: cpu.socket,
          series: cpu.series,
          coreCount: cpu.coreCount,
          coreClock: cpu.coreClock,
          boostClock: cpu.boostClock,
          tdp: cpu.tdp,
          integratedGraphics: cpu.integratedGraphics,
        },
      });
    }
  };

  const renderFeatures = (cpu: CPU) => {
    const features = [];

    if (cpu.socket) {
      features.push(
        <FeatureBadge
          key="socket"
          icon={Cpu}
          text={`Socket ${cpu.socket}`}
          variant="default"
        />
      );
    }

    if (cpu.coreCount) {
      features.push(
        <FeatureBadge key="cores" icon={Zap} text={`${cpu.coreCount} Cores`} />
      );
    }

    if (cpu.boostClock) {
      features.push(
        <FeatureBadge
          key="boost"
          icon={Gauge}
          text={`Boost: ${cpu.boostClock}`}
          variant="secondary"
        />
      );
    }

    if (cpu.tdp) {
      features.push(
        <FeatureBadge key="tdp" icon={ThermometerSun} text={`${cpu.tdp} TDP`} />
      );
    }

    return features;
  };

  const processImageUrl = (url: string) => {
    if (url.startsWith("//")) {
      return `https:${url}`;
    }
    return url;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Select CPU</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                AI-recommended CPUs compatible with your{" "}
                {components.motherboard?.specifications.socket} motherboard
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
                onClick={() => selectedCPU && router.push("/pc-builder/memory")}
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

        {/* Search Criteria Display */}
        {searchCriteria && (
          <Card className="p-4 mb-6 bg-secondary/10">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Budget: ${Math.round(searchCriteria.priceRange.min)} - $
                {Math.round(searchCriteria.priceRange.max)}
              </Badge>
              {searchCriteria.socket && (
                <Badge variant="secondary">
                  Socket: {searchCriteria.socket}
                </Badge>
              )}
              {searchCriteria.recommendedFeatures.map((feature, idx) => (
                <Badge key={idx} variant="secondary">
                  {feature}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 text-center text-red-500 mb-6">{error}</Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && cpus.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No CPUs found matching your criteria. Try adjusting your search or
              budget.
            </p>
          </Card>
        )}

        {/* CPU Listings */}
        {!loading && !error && cpus.length > 0 && (
          <div className="space-y-6">
            {cpus.map((cpu) => (
              <div
                key={cpu.id}
                className={`
                relative group
                transition-all duration-300 ease-in-out
                ${
                  selectedCPU === cpu.id
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:shadow-md"
                }
              `}
              >
                <Card
                  className="p-6 cursor-pointer"
                  onClick={() => handleAddReplace(cpu)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-secondary/10 rounded-lg overflow-hidden">
                      <Image
                        src={processImageUrl(cpu.image)}
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
                          <h3 className="text-2xl font-bold">{cpu.name}</h3>
                          <p className="text-muted-foreground mt-1">
                            {cpu.manufacturer} | {cpu.series}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${cpu.price.toFixed(2)}
                          </div>
                          <Button
                            variant={
                              selectedCPU === cpu.id ? "default" : "outline"
                            }
                            className="mt-2 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddReplace(cpu);
                            }}
                          >
                            {selectedCPU === cpu.id ? (
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

                      {/* Features */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {renderFeatures(cpu)}
                      </div>

                      {/* Cache Information */}
                      <div className="mt-4 text-sm text-muted-foreground">
                        <span className="font-medium">Cache:</span> L2:{" "}
                        {cpu.cache.l2} | L3: {cpu.cache.l3}
                      </div>

                      {/* Additional Info */}
                      {cpu.integratedGraphics !== "None" && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">
                            Integrated Graphics:
                          </span>{" "}
                          {cpu.integratedGraphics}
                        </div>
                      )}

                      {/* AI Recommendations */}
                      {cpu.isRecommended && (
                        <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                          <Badge variant="secondary" className="mb-2">
                            AI Recommended
                          </Badge>
                          <ul className="text-sm space-y-1">
                            {cpu.reasons?.map((reason, idx) => (
                              <li key={idx} className="text-muted-foreground">
                                • {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => {
                const newPage = currentPage - 1;
                setCurrentPage(newPage);
                fetchCPUs(newPage);
              }}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => {
                const newPage = currentPage + 1;
                setCurrentPage(newPage);
                fetchCPUs(newPage);
              }}
            >
              Next
            </Button>
          </div>
        )}

        {/* Mobile Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={() => selectedCPU && router.push("/pc-builder/memory")}
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
