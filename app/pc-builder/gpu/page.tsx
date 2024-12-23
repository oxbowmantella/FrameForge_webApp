"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Info,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ITEMS_PER_PAGE = 10;

// Helper Components
const FeatureBadge = ({
  icon: Icon,
  text,
  variant = "outline",
  tooltip,
}: {
  icon?: React.ComponentType<any>;
  text: string;
  variant?: "outline" | "default" | "secondary" | "destructive";
  tooltip?: string;
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
        <p>{tooltip || text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const IntegratedGraphicsCard = ({
  igpuInfo,
  onSkip,
  onContinue,
}: {
  igpuInfo: any;
  onSkip: () => void;
  onContinue: () => void;
}) => {
  const alertStyle = igpuInfo.sufficient
    ? "border-blue-500/50 dark:border-blue-500/50"
    : "border-yellow-500/50 dark:border-yellow-500/50";

  return (
    <Alert className={`mb-6 ${alertStyle}`}>
      <Info className="h-5 w-5" />
      <AlertTitle className="text-lg font-semibold mb-2">
        Integrated Graphics Available: {igpuInfo.name}
      </AlertTitle>
      <AlertDescription>
        <p className="text-muted-foreground mb-4">{igpuInfo.recommendation}</p>

        <div className="bg-secondary/20 rounded-lg p-4 mb-4">
          <h4 className="font-medium mb-2">Performance Analysis:</h4>
          <ul className="space-y-2">
            {igpuInfo.performanceInsights?.map(
              (insight: string, index: number) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground flex gap-2"
                >
                  <span>•</span>
                  <span>{insight}</span>
                </li>
              )
            )}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {igpuInfo.sufficient && (
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1 sm:flex-none gap-2"
            >
              <Check className="w-4 h-4" /> Use Integrated Graphics
            </Button>
          )}
          <Button
            variant={igpuInfo.sufficient ? "default" : "default"}
            onClick={onContinue}
            className="flex-1 sm:flex-none gap-2"
          >
            {igpuInfo.sufficient
              ? "Browse Dedicated GPUs"
              : "Select Dedicated GPU"}{" "}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default function GPUSelection() {
  const router = useRouter();
  const { budget, setComponent, components } = usePCBuilderStore();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGpu, setSelectedGpu] = useState<string | null>(null);
  const [gpus, setGpus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [igpuInfo, setIgpuInfo] = useState<any>(null);
  const [showGpuList, setShowGpuList] = useState(false);

  // Fetch GPUs from API
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
      setIgpuInfo(data.integratedGraphics);

      // Show GPU list immediately if integrated graphics isn't sufficient
      if (data.integratedGraphics && !data.integratedGraphics.sufficient) {
        setShowGpuList(true);
      }
    } catch (error) {
      console.error("Error fetching GPUs:", error);
      setError("Failed to load graphics cards. Please try again.");
      setGpus([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect Hooks
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

  // Event Handlers
  const handleSearch = () => {
    setCurrentPage(1);
    fetchGpus(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSkipGpu = () => {
    setComponent("gpu", null);
    router.push("/pc-builder/psu");
  };

  const handleShowGpuList = () => {
    setShowGpuList(true);
  };

  const handleSelectGpu = (gpu: any) => {
    if (selectedGpu === gpu.id) {
      setSelectedGpu(null);
      setComponent("gpu", null);
    } else {
      setSelectedGpu(gpu.id);
      setComponent("gpu", {
        id: gpu.id,
        name: gpu.name,
        price: gpu.price,
        image: gpu.image.startsWith("//") ? `https:${gpu.image}` : gpu.image,
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

  const handleNext = () => {
    if (selectedGpu) {
      router.push("/pc-builder/memory");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Graphics Card Selection
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Choose the right GPU for your ${budget} build
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
                onClick={handleNext}
                className="flex-1 sm:flex-none gap-2"
                disabled={
                  !selectedGpu && (!igpuInfo?.sufficient || showGpuList)
                }
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Integrated Graphics Info */}
        {igpuInfo?.available && !showGpuList && (
          <IntegratedGraphicsCard
            igpuInfo={igpuInfo}
            onSkip={handleSkipGpu}
            onContinue={handleShowGpuList}
          />
        )}

        {/* GPU Selection Content */}
        {(showGpuList || !igpuInfo?.available) && (
          <>
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

            {/* Error State */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            )}

            {/* GPU Listings */}
            {!loading &&
              !error &&
              gpus.map((gpu) => (
                <Card
                  key={gpu.id}
                  className={`mb-6 p-6 cursor-pointer transition-all duration-300 ${
                    selectedGpu === gpu.id
                      ? "ring-2 ring-primary"
                      : "hover:shadow-lg"
                  }`}
                  onClick={() => handleSelectGpu(gpu)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* GPU Image */}
                    <div className="w-full lg:w-48 h-48 relative bg-secondary/10 rounded-lg overflow-hidden">
                      <Image
                        src={
                          gpu.image.startsWith("//")
                            ? `https:${gpu.image}`
                            : gpu.image
                        }
                        alt={gpu.name}
                        fill
                        className="object-contain"
                      />
                    </div>

                    {/* GPU Details */}
                    <div className="flex-grow">
                      <div className="flex flex-wrap justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-2xl font-bold">{gpu.name}</h3>
                          <p className="text-muted-foreground">
                            {gpu.manufacturer} | {gpu.chipset}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            ${gpu.price.toFixed(2)}
                          </p>
                          <Button
                            variant={
                              selectedGpu === gpu.id ? "default" : "outline"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectGpu(gpu);
                            }}
                            className="mt-2"
                          >
                            {selectedGpu === gpu.id ? (
                              <>
                                <Check className="mr-2 h-4 w-4" /> Selected
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" /> Select
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Specifications */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Memory
                          </p>
                          <p>
                            {gpu.memory} {gpu.memoryType}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Core Clock
                          </p>
                          <p>{gpu.coreClock}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            TDP
                          </p>
                          <p>{gpu.tdp}W</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Length
                          </p>
                          <p>{gpu.length}mm</p>
                        </div>
                      </div>

                      {/* Features and Compatibility */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {gpu.brandFeatures.map(
                          (feature: string, index: number) => (
                            <FeatureBadge
                              key={index}
                              text={feature}
                              variant="secondary"
                            />
                          )
                        )}
                      </div>

                      {/* Performance Insights */}
                      {gpu.insights && (
                        <div className="bg-secondary/10 rounded-lg p-4">
                          <h4 className="font-medium mb-2">
                            Performance Insights:
                          </h4>
                          <ul className="space-y-1">
                            {gpu.insights.map(
                              (insight: string, index: number) => (
                                <li
                                  key={index}
                                  className="text-sm text-muted-foreground flex gap-2"
                                >
                                  <span>•</span>
                                  <span>{insight}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
              <div className="flex justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    fetchGpus(newPage);
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                <span className="flex items-center">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    fetchGpus(newPage);
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
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
              onClick={handleNext}
              className="flex-1"
              disabled={!selectedGpu && (!igpuInfo?.sufficient || showGpuList)}
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
