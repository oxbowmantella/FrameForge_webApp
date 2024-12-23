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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Plus,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Thermometer,
  Ruler,
  Fan,
  Volume2,
  Zap,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Snowflake,
  Gauge,
  Info,
  Cpu,
} from "lucide-react";

// Constants
const ITEMS_PER_PAGE = 10;

// Interfaces
interface CoolerPerformance {
  tdpRating: string;
  perfImprovement: number;
  noiseLevel: string;
  fanRPM?: string;
  airflow?: string;
}

interface CoolerCompatibility {
  socketOk: boolean;
  heightOk: boolean;
  tdpOk: boolean;
  reasonSocketOk?: string;
  reasonHeightOk?: string;
  reasonTdpOk?: string;
}

interface StockCoolerAssessment {
  hasStockCooler: boolean;
  isStockSufficient: boolean;
  recommendationType: "Critical" | "Beneficial" | "Optional";
  reason: string;
  thermalHeadroom?: number;
  noiseLevel?: number;
}

interface Cooler {
  id: string;
  name: string;
  image: string;
  manufacturer: string;
  price: number;
  height: number;
  fanRPM: string;
  noiseLevel: number;
  isWaterCooled: boolean;
  socket: string;
  color: string;
  type: "Liquid" | "Air";
  performance: CoolerPerformance;
  score: number;
  isRecommended: boolean;
  compatibility: CoolerCompatibility;
  reasons?: string[];
  specifications?: CPUCoolerSpecifications;
}

interface CPUCoolerSpecifications {
  type: "Liquid" | "Air";
  height: number;
  socket: string;
  tdpRating: string;
  noiseLevel: number;
  fanRPM: string;
  isWaterCooled: boolean;
  perfImprovement: number;
}

interface CPUSpecifications {
  tdp: number;
}

interface Requirements {
  socketType: string;
  maxHeight: number;
  tdpRequired: number;
  recommendedType: "Liquid" | "Air";
  noisePreference: string;
  stockCoolerAssessment: StockCoolerAssessment;
  caseAirflow?: "Limited" | "Adequate" | "Good";
}

interface SearchCriteria {
  priceRange: {
    min: number;
    max: number;
  };
  socketType: string;
  maxHeight: number;
  tdpRequired: number;
  recommendedType: "Liquid" | "Air";
  noisePreference: string;
  stockCoolerAssessment: StockCoolerAssessment;
}

// Helper Types
type PerformanceTier =
  | "Entry"
  | "Basic"
  | "Standard"
  | "Performance"
  | "Enthusiast"
  | "Premium";
type NoiseRating = "Silent" | "Very Quiet" | "Quiet" | "Moderate" | "Loud";
type PerformanceImprovement =
  | "Exceptional"
  | "Significant"
  | "Moderate"
  | "Slight"
  | "Minimal";

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

// Utility Functions
const processImageUrl = (url: string): string => {
  if (!url) return "";
  return url.startsWith("//") ? `https:${url}` : url;
};

const calculateThermalHeadroom = (
  coolerTDP: number,
  cpuTDP: number,
  isLiquid: boolean
): number => {
  const baseHeadroom = ((coolerTDP - cpuTDP) / cpuTDP) * 100;
  const liquidBonus = isLiquid ? 20 : 0;
  return Math.min(Math.round(baseHeadroom + liquidBonus), 100);
};

// Performance Rating Helpers
const getPerformanceImprovement = (
  improvement: number
): PerformanceImprovement => {
  if (improvement >= 80) return "Exceptional";
  if (improvement >= 60) return "Significant";
  if (improvement >= 40) return "Moderate";
  if (improvement >= 20) return "Slight";
  return "Minimal";
};

const getNoiseLevelRating = (noiseLevel: number): NoiseRating => {
  if (noiseLevel <= 20) return "Silent";
  if (noiseLevel <= 25) return "Very Quiet";
  if (noiseLevel <= 30) return "Quiet";
  if (noiseLevel <= 35) return "Moderate";
  return "Loud";
};

const getPerformanceTier = (
  cooler: Cooler,
  requirements: Requirements
): PerformanceTier => {
  const tdpHeadroom =
    parseInt(cooler.performance.tdpRating) - requirements.tdpRequired;
  const baseScore = cooler.isWaterCooled ? 4 : 2;
  let score = baseScore;

  // Performance scoring
  if (tdpHeadroom >= 50) score += 2;
  else if (tdpHeadroom >= 25) score += 1;
  if (cooler.noiseLevel <= 25) score += 1;
  if (cooler.performance.perfImprovement >= 50) score += 2;
  else if (cooler.performance.perfImprovement >= 30) score += 1;

  // Map score to tier
  const tiers: PerformanceTier[] = [
    "Entry",
    "Basic",
    "Standard",
    "Performance",
    "Enthusiast",
    "Premium",
  ];
  return tiers[Math.min(score, tiers.length - 1)];
};

// Main Component
export default function CoolerListing() {
  const router = useRouter();
  const { budget, setComponent, components } = usePCBuilderStore();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCooler, setSelectedCooler] = useState<string | null>(null);
  const [coolers, setCoolers] = useState<Cooler[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );
  const [requirements, setRequirements] = useState<Requirements | null>(null);

  // Fetch coolers from API
  const fetchCoolers = async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/cooler", {
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

      setCoolers(data.coolers || []);
      setTotalPages(Math.ceil((data.totalCount || 0) / ITEMS_PER_PAGE));
      setSearchCriteria(data.searchCriteria);
      setRequirements(data.requirements);
    } catch (error) {
      console.error("Error fetching coolers:", error);
      setError("Failed to load CPU coolers. Please try again.");
      setCoolers([]);
    } finally {
      setLoading(false);
    }
  };

  // Add this effect for initial load
  useEffect(() => {
    fetchCoolers(1);
  }, []);

  // Keep this effect for updates based on component changes
  useEffect(() => {
    if (budget && components.cpu && components.case) {
      setCurrentPage(1);
      fetchCoolers(1);
    }
  }, [budget, components.cpu, components.case]);

  useEffect(() => {
    if (components.cooler) {
      setSelectedCooler(components.cpuCooler?.id || null);
    }
  }, [components.cooler]);

  // Event Handlers
  const handleSearch = () => {
    setCurrentPage(1);
    fetchCoolers(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelect = (cooler: Cooler) => {
    if (selectedCooler === cooler.id) {
      setSelectedCooler(null);
      setComponent("cpuCooler", null);
    } else {
      setSelectedCooler(cooler.id);
      setComponent("cpuCooler", {
        id: cooler.id,
        name: cooler.name,
        price: cooler.price,
        image: processImageUrl(cooler.image),
        type: "cooler",
        specifications: {
          type: cooler.type,
          height: cooler.height,
          socket: cooler.socket,
          tdpRating: cooler.performance.tdpRating,
          noiseLevel: cooler.noiseLevel,
          fanRPM: cooler.fanRPM,
          isWaterCooled: cooler.isWaterCooled,
          perfImprovement: cooler.performance.perfImprovement,
        },
      });
    }
  };

  const handleBack = () => router.back();
  const handleNext = () => {
    if (selectedCooler) router.push("/pc-builder/gpu-select");
  };

  // JSX will go here
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Select CPU Cooler
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {components.cpu && "tdp" in components.cpu.specifications
                  ? `Cooling solution for ${components.cpu.name} (${components.cpu.specifications.tdp}W TDP)`
                  : "Select a compatible CPU cooler"}
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
                onClick={handleNext}
                className="flex-1 sm:flex-none gap-2"
                disabled={!selectedCooler}
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
            placeholder="Search CPU coolers..."
            className="flex-grow text-lg p-6"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button className="p-6" variant="outline" onClick={handleSearch}>
            <Search className="h-6 w-6" />
          </Button>
        </div>

        {/* Stock Cooler Assessment */}
        {requirements?.stockCoolerAssessment && (
          <Alert
            variant={
              requirements.stockCoolerAssessment.recommendationType ===
              "Critical"
                ? "destructive"
                : requirements.stockCoolerAssessment.recommendationType ===
                  "Beneficial"
                ? "default"
                : "secondary"
            }
            className="mb-6"
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex">
                <AlertCircle className="h-4 w-4" />
                <div className="ml-4">
                  <AlertTitle>
                    {requirements.stockCoolerAssessment.recommendationType ===
                    "Critical"
                      ? "Aftermarket Cooler Recommended"
                      : requirements.stockCoolerAssessment
                          .recommendationType === "Beneficial"
                      ? "Consider Upgrading Stock Cooler"
                      : "Stock Cooler Assessment"}
                  </AlertTitle>
                  <AlertDescription>
                    {requirements.stockCoolerAssessment.reason}
                  </AlertDescription>
                </div>
              </div>
              {requirements.stockCoolerAssessment.isStockSufficient && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 whitespace-nowrap"
                  onClick={() => {
                    // Update the store with stock cooler info
                    setComponent("cpuCooler", {
                      id: "stock-cooler",
                      name: "Stock CPU Cooler",
                      price: 0,
                      image: "/FrameForge.png",
                      type: "cooler",
                      specifications: {
                        type: "Air",
                        height: 0, // Usually not needed for stock coolers
                        socket:
                          (
                            components.cpu
                              ?.specifications as unknown as CPUCoolerSpecifications
                          )?.socket || "",
                        tdpRating:
                          (
                            components.cpu?.specifications as CPUSpecifications
                          )?.tdp.toString() || "0",
                        noiseLevel: 0,
                        fanRPM: "Default",
                        isWaterCooled: false,
                        perfImprovement: 0,
                      },
                    });
                    // Navigate to next page
                    router.push("/pc-builder/gpu-select");
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Use Stock Cooler
                </Button>
              )}
            </div>
          </Alert>
        )}

        {/* System Requirements */}
        {requirements && (
          <Card className="p-4 mb-6 bg-secondary/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Socket Compatibility
                </h3>
                <Badge variant="default" className="gap-1">
                  <Cpu className="w-3 h-3" /> {requirements.socketType}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Required TDP</h3>
                <Badge variant="secondary" className="gap-1">
                  <Thermometer className="w-3 h-3" /> {requirements.tdpRequired}
                  W
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Case Clearance</h3>
                <Badge variant="secondary" className="gap-1">
                  <Ruler className="w-3 h-3" /> Max {requirements.maxHeight}mm
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Recommended Type</h3>
                <Badge variant="outline" className="gap-1">
                  {requirements.recommendedType === "Liquid" ? (
                    <Snowflake className="w-3 h-3" />
                  ) : (
                    <Fan className="w-3 h-3" />
                  )}
                  {requirements.recommendedType} Cooling
                </Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
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

        {/* No Results */}
        {!loading && !error && coolers.length === 0 && (
          <Card className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              No compatible CPU coolers found. Try adjusting your search
              criteria.
            </p>
          </Card>
        )}

        {/* Cooler Listings */}
        {!loading && !error && coolers.length > 0 && (
          <div className="space-y-6">
            {coolers.map((cooler) => (
              <div
                key={cooler.id}
                className={`
                relative group
                transition-all duration-300 ease-in-out
                ${
                  selectedCooler === cooler.id
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:shadow-md"
                }
              `}
              >
                <Card
                  className="p-6 cursor-pointer"
                  onClick={() => handleSelect(cooler)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-secondary/10 rounded-lg overflow-hidden">
                      <Image
                        src={processImageUrl(cooler.image)}
                        alt={cooler.name}
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
                            <h3 className="text-2xl font-bold">
                              {cooler.name}
                            </h3>
                            {cooler.isRecommended && (
                              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                <Star className="w-3 h-3 mr-1" />
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mt-1">
                            {cooler.manufacturer} |{" "}
                            {getPerformanceTier(cooler, requirements!)}{" "}
                            Performance
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${cooler.price.toFixed(2)}
                          </div>
                          <Button
                            variant={
                              selectedCooler === cooler.id
                                ? "default"
                                : "outline"
                            }
                            className="mt-2 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(cooler);
                            }}
                          >
                            {selectedCooler === cooler.id ? (
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

                      {/* Performance Metrics */}
                      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Cooling Type
                          </p>
                          <p className="text-sm">{cooler.type} Cooling</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            TDP Rating
                          </p>
                          <p className="text-sm">
                            {cooler.performance.tdpRating}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Noise Level
                          </p>
                          <p className="text-sm">
                            {getNoiseLevelRating(cooler.noiseLevel)} (
                            {cooler.noiseLevel}dB)
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Performance Gain
                          </p>
                          <p className="text-sm">
                            {getPerformanceImprovement(
                              cooler.performance.perfImprovement
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Feature Badges */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <FeatureBadge
                          icon={cooler.isWaterCooled ? Snowflake : Fan}
                          text={`${cooler.type} Cooler`}
                          variant="secondary"
                          tooltip={`${cooler.type} cooling solution`}
                        />
                        <FeatureBadge
                          icon={Volume2}
                          text={`${getNoiseLevelRating(
                            cooler.noiseLevel
                          )} Operation`}
                          variant={
                            cooler.noiseLevel <= 25 ? "default" : "outline"
                          }
                          tooltip={`${cooler.noiseLevel}dB noise level`}
                        />
                        <FeatureBadge
                          icon={Gauge}
                          text={cooler.fanRPM}
                          variant="outline"
                          tooltip="Fan Speed Range"
                        />
                        <FeatureBadge
                          icon={Ruler}
                          text={`${cooler.height}mm Height`}
                          variant={
                            cooler.compatibility.heightOk
                              ? "outline"
                              : "destructive"
                          }
                          tooltip={`Maximum cooler height: ${requirements?.maxHeight}mm`}
                        />
                      </div>

                      {/* Compatibility Status */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <FeatureBadge
                          icon={
                            cooler.compatibility.socketOk
                              ? Check
                              : AlertTriangle
                          }
                          text={`Socket ${requirements?.socketType}`}
                          variant={
                            cooler.compatibility.socketOk
                              ? "outline"
                              : "destructive"
                          }
                          tooltip="CPU Socket Compatibility"
                        />
                        <FeatureBadge
                          icon={
                            cooler.compatibility.tdpOk ? Check : AlertTriangle
                          }
                          text={`TDP Support`}
                          variant={
                            cooler.compatibility.tdpOk
                              ? "outline"
                              : "destructive"
                          }
                          tooltip={`Required: ${requirements?.tdpRequired}W`}
                        />
                        <FeatureBadge
                          icon={
                            cooler.compatibility.heightOk
                              ? Check
                              : AlertTriangle
                          }
                          text="Case Fit"
                          variant={
                            cooler.compatibility.heightOk
                              ? "outline"
                              : "destructive"
                          }
                          tooltip={`Max Height: ${requirements?.maxHeight}mm`}
                        />
                      </div>

                      {/* Reasons & Recommendations */}
                      {(cooler.isRecommended ||
                        (cooler.reasons?.length ?? 0) > 0) && (
                        <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {cooler.isRecommended && (
                              <Star className="w-4 h-4 text-green-500" />
                            )}
                            <p className="font-medium">
                              {cooler.isRecommended
                                ? "AI Recommended Choice"
                                : "Compatibility Details"}
                            </p>
                          </div>
                          <ul className="text-sm space-y-1">
                            {cooler.reasons?.map((reason, idx) => (
                              <li
                                key={idx}
                                className="text-muted-foreground flex items-start gap-2"
                              >
                                <span className="mt-1">•</span>
                                <span>{reason}</span>
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
          <div className="flex justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => {
                const newPage = currentPage - 1;
                setCurrentPage(newPage);
                fetchCoolers(newPage);
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
                fetchCoolers(newPage);
              }}
              disabled={currentPage === totalPages}
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
              onClick={handleNext}
              className="flex-1"
              disabled={!selectedCooler}
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
