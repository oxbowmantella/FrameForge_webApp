// /app/pc-builder/memory/page.tsx
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
  MemoryStick,
  Zap,
  Gauge,
  Thermometer,
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
  memoryType: string;
  maxMemory: string;
  recommendedSpeeds: string[];
  features: string[];
}

interface MemoryModule {
  id: string;
  name: string;
  image: string;
  manufacturer: string;
  price: number;
  speed: string;
  modules: string;
  pricePerGB: string;
  timing: string;
  latency: string;
  voltage: string;
  heatSpreader: boolean;
  formFactor: string;
  score: number;
  isRecommended: boolean;
  reasons?: string[];
}

// Helper function to format features as badges
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

export default function MemoryListing() {
  const router = useRouter();
  const { budget, setComponent, components } = usePCBuilderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [memoryModules, setMemoryModules] = useState<MemoryModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );

  const fetchMemory = async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget,
          page,
          itemsPerPage: ITEMS_PER_PAGE,
          searchTerm: searchTerm.trim(),
          motherboard: components.motherboard,
          cpu: components.cpu,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setMemoryModules(data.memory || []);
      setTotalPages(Math.ceil((data.totalCount || 0) / ITEMS_PER_PAGE));
      setSearchCriteria(data.searchCriteria);
    } catch (error) {
      console.error("Error fetching memory:", error);
      setError("Failed to load memory modules. Please try again.");
      setMemoryModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (budget && components.motherboard) {
      setCurrentPage(1);
      fetchMemory(1);
    }
  }, [budget, components.motherboard]);

  useEffect(() => {
    if (components.memory) {
      setSelectedMemory(components.memory.id);
    }
  }, [components.memory]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchMemory(1);
  };

  const handleAddReplace = (memory: MemoryModule) => {
    if (selectedMemory === memory.id) {
      setSelectedMemory(null);
      setComponent("memory", null);
    } else {
      setSelectedMemory(memory.id);
      setComponent("memory", {
        id: memory.id,
        name: memory.name,
        price: memory.price,
        image: processImageUrl(memory.image),
        type: "memory",
        specifications: {
          speed: memory.speed,
          modules: memory.modules,
          timing: memory.timing,
          voltage: memory.voltage,
        },
      });
    }
  };

  const renderFeatures = (memory: MemoryModule) => {
    const features = [];

    if (memory.speed) {
      features.push(
        <FeatureBadge
          key="speed"
          icon={Zap}
          text={memory.speed}
          variant="default"
        />
      );
    }

    if (memory.modules) {
      features.push(
        <FeatureBadge key="modules" icon={MemoryStick} text={memory.modules} />
      );
    }

    if (memory.timing) {
      features.push(
        <FeatureBadge
          key="timing"
          icon={Gauge}
          text={`Timing: ${memory.timing}`}
        />
      );
    }

    if (memory.heatSpreader) {
      features.push(
        <FeatureBadge
          key="cooling"
          icon={Thermometer}
          text="Heat Spreader"
          variant="secondary"
        />
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

  const nextRoute = "/pc-builder/psu";
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Select Memory (RAM)
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                AI-recommended memory for your ${budget} build
                {components.motherboard &&
                  ` - Compatible with ${components.motherboard.name}`}
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
                onClick={() => selectedMemory && router.push(nextRoute)}
                className="flex-1 sm:flex-none gap-2"
                disabled={!selectedMemory}
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
            placeholder="Search memory modules..."
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
                Budget: ${searchCriteria.priceRange.min.toFixed(0)} - $
                {searchCriteria.priceRange.max.toFixed(0)}
              </Badge>
              <Badge variant="secondary">
                Memory Type: {searchCriteria.memoryType}
              </Badge>
              {searchCriteria.maxMemory !== "Any" && (
                <Badge variant="secondary">
                  Max Capacity: {searchCriteria.maxMemory}
                </Badge>
              )}
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
        {!loading && !error && memoryModules.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No memory modules found matching your criteria. Try adjusting your
              search or budget.
            </p>
          </Card>
        )}

        {/* Memory Module Listings */}
        {!loading && !error && memoryModules.length > 0 && (
          <div className="space-y-6">
            {memoryModules.map((memory) => (
              <div
                key={memory.id}
                className={`
                relative group
                transition-all duration-300 ease-in-out
                ${
                  selectedMemory === memory.id
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:shadow-md"
                }
              `}
              >
                <Card
                  className="p-6 cursor-pointer"
                  onClick={() => handleAddReplace(memory)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-secondary/10 rounded-lg overflow-hidden">
                      <Image
                        src={processImageUrl(memory.image)}
                        alt={memory.name}
                        width={200}
                        height={200}
                        className="object-contain w-full h-full"
                      />
                    </div>

                    {/* Content Section */}
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold">{memory.name}</h3>
                          <p className="text-muted-foreground mt-1">
                            {memory.manufacturer} | {memory.modules}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${memory.price.toFixed(2)}
                          </div>
                          {memory.pricePerGB && (
                            <div className="text-sm text-muted-foreground">
                              ${memory.pricePerGB}/GB
                            </div>
                          )}
                          <Button
                            variant={
                              selectedMemory === memory.id
                                ? "default"
                                : "outline"
                            }
                            className="mt-2 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddReplace(memory);
                            }}
                          >
                            {selectedMemory === memory.id ? (
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
                        {renderFeatures(memory)}
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 text-sm text-muted-foreground">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {memory.voltage && (
                            <span>Voltage: {memory.voltage}</span>
                          )}
                          {memory.latency && (
                            <span>CAS Latency: {memory.latency}</span>
                          )}
                        </div>
                      </div>

                      {/* AI Recommendations */}
                      {memory.isRecommended && (
                        <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                          <Badge variant="secondary" className="mb-2">
                            AI Recommended
                          </Badge>
                          <ul className="text-sm space-y-1">
                            {memory.reasons?.map((reason, idx) => (
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
                fetchMemory(newPage);
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
                fetchMemory(newPage);
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
