// /app/pc-builder/gpu/page.tsx
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
  AlertTriangle,
  Monitor,
  Cable,
  Zap,
  Gauge,
  Cpu,
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
  powerLimit: number;
  lengthLimit: number;
  features: string[];
}

interface GPU {
  id: string;
  name: string;
  image: string;
  manufacturer: string;
  price: number;
  chipset: string;
  memory: string;
  memoryType: string;
  coreClock: string;
  boostClock: string;
  length: string;
  tdp: string;
  powerConnectors: string;
  outputs: {
    hdmi: string;
    displayPort: string;
  };
  score: number;
  isRecommended: boolean;
  compatibility: {
    powerOk: boolean;
    lengthOk: boolean;
    tdpOk: boolean;
  };
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
  variant?: "outline" | "default" | "secondary" | "destructive";
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

export default function GPUListing() {
  const router = useRouter();
  const { budget, setComponent, components } = usePCBuilderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGpu, setSelectedGpu] = useState<string | null>(null);
  const [gpus, setGpus] = useState<GPU[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );

  const fetchGpus = async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/gpu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget,
          page,
          itemsPerPage: ITEMS_PER_PAGE,
          searchTerm: searchTerm.trim(),
          components,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setGpus(data.gpus || []);
      setTotalPages(Math.ceil((data.totalCount || 0) / ITEMS_PER_PAGE));
      setSearchCriteria(data.searchCriteria);
    } catch (error) {
      console.error("Error fetching GPUs:", error);
      setError("Failed to load graphics cards. Please try again.");
      setGpus([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (budget) {
      setCurrentPage(1);
      fetchGpus(1);
    }
  }, [budget]);

  useEffect(() => {
    if (components.gpu) {
      setSelectedGpu(components.gpu.id);
    }
  }, [components.gpu]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchGpus(1);
  };

  const handleAddReplace = (gpu: GPU) => {
    if (selectedGpu === gpu.id) {
      setSelectedGpu(null);
      setComponent("gpu", null);
    } else {
      setSelectedGpu(gpu.id);
      setComponent("gpu", {
        id: gpu.id,
        name: gpu.name,
        price: gpu.price,
        image: processImageUrl(gpu.image),
        type: "gpu",
        specifications: {
          chipset: gpu.chipset,
          memory: gpu.memory,
          memoryType: gpu.memoryType,
          tdp: gpu.tdp,
          length: gpu.length,
          powerConnectors: gpu.powerConnectors,
        },
      });
    }
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

  // Check for missing required components
  const missingComponents = [];
  if (!components.motherboard) missingComponents.push("motherboard");
  if (!components.case) missingComponents.push("case");
  if (!components.cpu) missingComponents.push("CPU");
  if (!components.storage) missingComponents.push("storage");

  if (missingComponents.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold mb-4">
            Missing Required Components
          </h2>
          <p className="text-muted-foreground mb-4">
            Please select the following components first:
            {missingComponents.map((component, index) => (
              <span key={component}>
                {index === 0 ? " " : ", "}
                <span className="font-medium">{component}</span>
              </span>
            ))}
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Select Graphics Card
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                AI-recommended GPUs for your ${budget} build
                {components.case &&
                  ` - Must fit within ${components.case.specifications.maxGpuLength}mm`}
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
                onClick={() => selectedGpu && router.push("/pc-builder/psu")}
                className="flex-1 sm:flex-none gap-2"
                disabled={!selectedGpu}
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Missing Components Warning */}
      {!components.case ||
      !components.motherboard ||
      !components.cpu ||
      !components.storage ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <Card className="p-6 max-w-md mx-auto text-center">
            <h2 className="text-xl font-bold mb-4">
              Missing Required Components
            </h2>
            <p className="text-muted-foreground mb-4">
              Please select the following components first:
              {!components.motherboard && (
                <span className="font-medium"> motherboard</span>
              )}
              {!components.case && <span className="font-medium"> case</span>}
              {!components.cpu && <span className="font-medium"> CPU</span>}
              {!components.storage && (
                <span className="font-medium"> storage</span>
              )}
            </p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </Card>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-6">
          {/* Search Bar */}
          <div className="flex gap-4 mb-8">
            <Input
              type="text"
              placeholder="Search graphics cards..."
              className="flex-grow text-lg p-6"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button className="p-6" variant="outline" onClick={handleSearch}>
              <Search className="h-6 w-6" />
            </Button>
          </div>

          {/* System Compatibility Info */}
          {searchCriteria && (
            <Card className="p-4 mb-6 bg-secondary/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Budget Range</h3>
                  <Badge variant="outline" className="text-nowrap">
                    ${searchCriteria.priceRange.min.toFixed(0)} - $
                    {searchCriteria.priceRange.max.toFixed(0)}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Power Available</h3>
                  <Badge variant="secondary" className="text-nowrap">
                    {searchCriteria.powerLimit}W Max TDP
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Case Fit</h3>
                  <Badge variant="secondary" className="text-nowrap">
                    Max {searchCriteria.lengthLimit}mm Length
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Required Features
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {searchCriteria.features.map((feature, idx) => (
                      <Badge key={idx} variant="outline">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
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
          {!loading && !error && gpus.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">
                No compatible graphics cards found. Try adjusting your search
                criteria or budget.
              </p>
            </Card>
          )}

          {/* GPU Listings */}
          {!loading && !error && gpus.length > 0 && (
            <div className="space-y-6">
              {gpus.map((gpu) => (
                <div
                  key={gpu.id}
                  className={`
                  relative group
                  transition-all duration-300 ease-in-out
                  ${
                    selectedGpu === gpu.id
                      ? "ring-2 ring-primary shadow-lg"
                      : "hover:shadow-md"
                  }
                `}
                >
                  <Card
                    className="p-6 cursor-pointer"
                    onClick={() => handleAddReplace(gpu)}
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Image Section */}
                      <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-secondary/10 rounded-lg overflow-hidden">
                        <Image
                          src={processImageUrl(gpu.image)}
                          alt={gpu.name}
                          width={200}
                          height={200}
                          className="object-contain w-full h-full"
                        />
                      </div>

                      {/* Content Section */}
                      <div className="flex-grow">
                        {/* Header with Title and Price */}
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-bold">{gpu.name}</h3>
                            <p className="text-muted-foreground mt-1">
                              {gpu.manufacturer} | {gpu.chipset}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              ${gpu.price.toFixed(2)}
                            </div>
                            <Button
                              variant={
                                selectedGpu === gpu.id ? "default" : "outline"
                              }
                              className="mt-2 gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddReplace(gpu);
                              }}
                            >
                              {selectedGpu === gpu.id ? (
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

                        {/* Specifications Grid */}
                        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Memory
                            </p>
                            <p className="text-sm">
                              {gpu.memory} {gpu.memoryType}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Clock Speed
                            </p>
                            <p className="text-sm">{gpu.boostClock} Boost</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Power Draw
                            </p>
                            <p className="text-sm">{gpu.tdp}W TDP</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Dimensions
                            </p>
                            <p className="text-sm">{gpu.length}mm Length</p>
                          </div>
                        </div>

                        {/* Compatibility Indicators */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <FeatureBadge
                            icon={
                              gpu.compatibility.powerOk ? Check : AlertTriangle
                            }
                            text={
                              gpu.compatibility.powerOk
                                ? "Power Compatible"
                                : "Power Warning"
                            }
                            variant={
                              gpu.compatibility.powerOk
                                ? "outline"
                                : "destructive"
                            }
                          />
                          <FeatureBadge
                            icon={
                              gpu.compatibility.lengthOk ? Check : AlertTriangle
                            }
                            text={
                              gpu.compatibility.lengthOk
                                ? "Size Compatible"
                                : "Too Large"
                            }
                            variant={
                              gpu.compatibility.lengthOk
                                ? "outline"
                                : "destructive"
                            }
                          />
                          <FeatureBadge
                            icon={Cable}
                            text={gpu.powerConnectors}
                            variant="secondary"
                          />
                        </div>

                        {/* Display Outputs */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <FeatureBadge
                            icon={Monitor}
                            text={`${gpu.outputs.displayPort} DisplayPort`}
                            variant="secondary"
                          />
                          <FeatureBadge
                            icon={Monitor}
                            text={`${gpu.outputs.hdmi} HDMI`}
                            variant="secondary"
                          />
                        </div>

                        {/* AI Recommendations */}
                        {gpu.isRecommended && (
                          <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                            <Badge variant="secondary" className="mb-2">
                              AI Recommended
                            </Badge>
                            <ul className="text-sm space-y-1">
                              {gpu.reasons?.map((reason, idx) => (
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
                  fetchGpus(newPage);
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
                  fetchGpus(newPage);
                }}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
