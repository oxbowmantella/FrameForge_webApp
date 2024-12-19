// /app/pc-builder/cooler/page.tsx
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
  Thermometer,
  Ruler,
  Fan,
  Volume2,
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

interface CoolerPerformance {
  tdpRating: string;
  noiseLevel: string;
  airflow: string;
}

interface CoolerCompatibility {
  socketOk: boolean;
  heightOk: boolean;
  tdpOk: boolean;
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
}

interface Requirements {
  socketType: string;
  maxHeight: number;
  tdpRequired: number;
  recommendedType: "Liquid" | "Air";
  noisePreference: string;
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

// Helper to determine noise level rating
const getNoiseLevelRating = (noiseLevel: number): string => {
  if (noiseLevel <= 20) return "Silent";
  if (noiseLevel <= 25) return "Quiet";
  if (noiseLevel <= 30) return "Balanced";
  if (noiseLevel <= 35) return "Moderate";
  return "Loud";
};

// Helper to determine performance tier
const getPerformanceTier = (cooler: Cooler): string => {
  const baseScore = cooler.isWaterCooled ? 4 : 2;
  let score = baseScore;

  // Add points for features
  if (cooler.performance.tdpRating.includes("+")) score += 1;
  if (cooler.noiseLevel <= 25) score += 1;
  if (cooler.fanRPM.includes("2000")) score += 1;

  // Map score to tier
  const tiers = ["Entry", "Standard", "Performance", "High-End", "Enthusiast"];
  return tiers[Math.min(score - 1, tiers.length - 1)];
};

export default function CoolerListing() {
  const router = useRouter();
  const { budget, setComponent, components } = usePCBuilderStore();
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

  useEffect(() => {
    if (budget && components.cpu && components.case) {
      setCurrentPage(1);
      fetchCoolers(1);
    }
  }, [budget, components.cpu, components.case]);

  useEffect(() => {
    if (components.cooler) {
      setSelectedCooler(components.cooler.id);
    }
  }, [components.cooler]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCoolers(1);
  };

  const handleAddReplace = (cooler: Cooler) => {
    if (selectedCooler === cooler.id) {
      setSelectedCooler(null);
      setComponent("cooler", null);
    } else {
      setSelectedCooler(cooler.id);
      setComponent("cooler", {
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
  if (!components.cpu) missingComponents.push("CPU");
  if (!components.case) missingComponents.push("case");

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
                Select CPU Cooler
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                AI-recommended coolers for your ${budget} build
                {components.cpu &&
                  ` - Socket ${components.cpu.specifications.socket}`}
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
                onClick={() => selectedCooler && router.push("/overview")}
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

        {/* System Requirements Card */}
        {requirements && (
          <Card className="p-4 mb-6 bg-secondary/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">CPU Socket</h3>
                <Badge variant="default" className="text-nowrap">
                  {requirements.socketType}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Required TDP</h3>
                <Badge variant="secondary" className="text-nowrap">
                  Min {requirements?.tdpRequired}W
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Max Height</h3>
                <Badge variant="secondary" className="text-nowrap">
                  {requirements?.maxHeight}mm
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Recommended</h3>
                <Badge variant="outline" className="text-nowrap">
                  {requirements.recommendedType} Cooling
                </Badge>
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
        {!loading && !error && coolers.length === 0 && (
          <Card className="p-6 text-center">
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
                  onClick={() => handleAddReplace(cooler)}
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
                      {/* Header with Title and Price */}
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold">{cooler.name}</h3>
                          <p className="text-muted-foreground mt-1">
                            {cooler.manufacturer} | {cooler.type} Cooling
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
                              handleAddReplace(cooler);
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

                      {/* Specifications Grid */}
                      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Performance
                          </p>
                          <p className="text-sm">
                            {getPerformanceTier(cooler)} Tier
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Fan Speed
                          </p>
                          <p className="text-sm">{cooler.fanRPM}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Noise Level
                          </p>
                          <p className="text-sm">
                            {getNoiseLevelRating(cooler.noiseLevel)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Height
                          </p>
                          <p className="text-sm">{cooler.height}mm</p>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <FeatureBadge
                          icon={cooler.isWaterCooled ? Thermometer : Fan}
                          text={`${cooler.type} Cooler`}
                          variant="secondary"
                        />
                        <FeatureBadge
                          icon={Volume2}
                          text={`${getNoiseLevelRating(cooler.noiseLevel)} (${
                            cooler.noiseLevel
                          }dB)`}
                          variant={
                            cooler.noiseLevel <= 25 ? "secondary" : "outline"
                          }
                        />
                        <FeatureBadge
                          icon={Ruler}
                          text={`${cooler.height}mm Height`}
                          variant="outline"
                        />
                      </div>

                      {/* Compatibility Status */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <FeatureBadge
                          icon={
                            cooler.compatibility.socketOk
                              ? Check
                              : AlertTriangle
                          }
                          text={`Socket ${components.cpu?.specifications.socket}`}
                          variant={
                            cooler.compatibility.socketOk
                              ? "outline"
                              : "destructive"
                          }
                        />
                        <FeatureBadge
                          icon={
                            cooler.compatibility.tdpOk ? Check : AlertTriangle
                          }
                          text={`TDP ${cooler.performance.tdpRating}`}
                          variant={
                            cooler.compatibility.tdpOk
                              ? "outline"
                              : "destructive"
                          }
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
                        />
                      </div>

                      {/* AI Recommendations */}
                      {cooler.isRecommended && (
                        <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                          <Badge variant="secondary" className="mb-2">
                            AI Recommended
                          </Badge>
                          <ul className="text-sm space-y-1">
                            {cooler.reasons?.map((reason, idx) => (
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
                fetchCoolers(newPage);
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
                fetchCoolers(newPage);
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
