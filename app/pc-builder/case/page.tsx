// /app/pc-builder/case/page.tsx
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
  Ruler,
  Usb,
  Fan,
  HardDrive,
  Gauge,
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

interface CaseDimensions {
  length: number;
  width: number;
  height: number;
}

interface DriveBays {
  internal35: string;
  internal25: string;
}

interface CaseCompatibility {
  motherboardOk: boolean;
  gpuClearanceOk: boolean;
  driveSpaceOk: boolean;
  airflowRating: string;
}

interface Case {
  id: string;
  name: string;
  image: string;
  manufacturer: string;
  price: number;
  type: string;
  color: string;
  dimensions: CaseDimensions;
  maxGpuLength: number;
  formFactors: string[];
  driveBays: DriveBays;
  frontPorts: string;
  hasUSBC: boolean;
  score: number;
  isRecommended: boolean;
  compatibility: CaseCompatibility;
  reasons?: string[];
}

interface Requirements {
  motherboardFormFactor?: string;
  minimumClearances?: {
    gpu?: number;
    cpuCooler?: number;
  };
  airflowRequirement?: string;
}

interface SearchCriteria {
  priceRange: {
    min: number;
    max: number;
  };
  motherboardFormFactor: string;
  minimumClearances: {
    gpu: number;
    cpuCooler: number;
  };
  airflowRequirement: string;
  features: string[];
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

// Helper function to format dimensions
const formatDimensions = (dimensions: CaseDimensions): string => {
  return `${dimensions.length} × ${dimensions.width} × ${dimensions.height}mm`;
};

// Helper function to calculate case size rating
const getCaseSizeRating = (dimensions: CaseDimensions): string => {
  const volume = dimensions.length * dimensions.width * dimensions.height;
  if (volume < 30000) return "SFF";
  if (volume < 45000) return "Compact";
  if (volume < 60000) return "Mid-Size";
  return "Full-Size";
};

export default function CaseListing() {
  const router = useRouter();
  const { budget, setComponent, components } = usePCBuilderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );
  const [requirements, setRequirements] = useState<Requirements | null>(null);

  const fetchCases = async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/case", {
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

      setCases(data.cases || []);
      setTotalPages(Math.ceil((data.totalCount || 0) / ITEMS_PER_PAGE));
      setSearchCriteria(data.searchCriteria);
      setRequirements(data.requirements);
    } catch (error) {
      console.error("Error fetching cases:", error);
      setError("Failed to load cases. Please try again.");
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (budget && components.motherboard) {
      setCurrentPage(1);
      fetchCases(1);
    }
  }, [budget, components.motherboard]);

  useEffect(() => {
    if (components.case) {
      setSelectedCase(components.case.id);
    }
  }, [components.case]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCases(1);
  };

  const handleAddReplace = (case_: Case) => {
    if (selectedCase === case_.id) {
      setSelectedCase(null);
      setComponent("case", null);
    } else {
      setSelectedCase(case_.id);
      setComponent("case", {
        id: case_.id,
        name: case_.name,
        price: case_.price,
        image: processImageUrl(case_.image),
        type: "case",
        specifications: {
          dimensions: case_.dimensions,
          maxGpuLength: case_.maxGpuLength,
          formFactors: case_.formFactors,
          driveBays: case_.driveBays,
          frontPorts: case_.frontPorts,
          hasUSBC: case_.hasUSBC,
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
  if (!components.cpu) missingComponents.push("CPU");
  if (!components.memory) missingComponents.push("memory");
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
              <h1 className="text-3xl sm:text-4xl font-bold">Select Case</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                AI-recommended cases for your ${budget} build
                {components.motherboard &&
                  ` - Fits ${components.motherboard.specifications.formFactor} motherboard`}
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
                onClick={() => selectedCase && router.push("/pc-builder/gpu")}
                className="flex-1 sm:flex-none gap-2"
                disabled={!selectedCase}
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
            placeholder="Search cases..."
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
                <h3 className="text-sm font-medium mb-2">Motherboard</h3>
                <Badge variant="default" className="text-nowrap">
                  {requirements.motherboardFormFactor || "ATX"}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Required Clearance</h3>
                <Badge variant="secondary" className="text-nowrap">
                  GPU: {requirements?.minimumClearances?.gpu ?? 300}mm
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Cooling</h3>
                <Badge variant="secondary" className="text-nowrap">
                  {requirements.airflowRequirement || "Standard"} Airflow Needed
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Price Range</h3>
                <Badge variant="outline" className="text-nowrap">
                  ${searchCriteria?.priceRange?.min?.toFixed(0) || 0} - $
                  {searchCriteria?.priceRange?.max?.toFixed(0) || 0}
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
        {!loading && !error && cases.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No compatible cases found. Try adjusting your search criteria.
            </p>
          </Card>
        )}

        {/* Case Listings */}
        {!loading && !error && cases.length > 0 && (
          <div className="space-y-6">
            {cases.map((case_) => (
              <div
                key={case_.id}
                className={`
                relative group
                transition-all duration-300 ease-in-out
                ${
                  selectedCase === case_.id
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:shadow-md"
                }
              `}
              >
                <Card
                  className="p-6 cursor-pointer"
                  onClick={() => handleAddReplace(case_)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-secondary/10 rounded-lg overflow-hidden">
                      <Image
                        src={processImageUrl(case_.image)}
                        alt={case_.name}
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
                          <h3 className="text-2xl font-bold">{case_.name}</h3>
                          <p className="text-muted-foreground mt-1">
                            {case_.manufacturer} | {case_.type}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${case_.price.toFixed(2)}
                          </div>
                          <Button
                            variant={
                              selectedCase === case_.id ? "default" : "outline"
                            }
                            className="mt-2 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddReplace(case_);
                            }}
                          >
                            {selectedCase === case_.id ? (
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

                      {/* Specifications */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Badge variant="default" className="mb-1">
                            Size
                          </Badge>
                          <p className="text-sm">
                            {formatDimensions(case_.dimensions)}
                          </p>
                        </div>
                        <div>
                          <Badge variant="default" className="mb-1">
                            GPU Space
                          </Badge>
                          <p className="text-sm">
                            Up to {case_.maxGpuLength}mm
                          </p>
                        </div>
                        <div>
                          <Badge variant="default" className="mb-1">
                            Storage
                          </Badge>
                          <p className="text-sm">
                            {case_.driveBays.internal35} × 3.5",{" "}
                            {case_.driveBays.internal25} × 2.5"
                          </p>
                        </div>
                        <div>
                          <Badge variant="default" className="mb-1">
                            Form Factors
                          </Badge>
                          <p className="text-sm">
                            {case_.formFactors.join(", ")}
                          </p>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <FeatureBadge
                          icon={Ruler}
                          text={`${getCaseSizeRating(case_.dimensions)} Tower`}
                          variant="secondary"
                        />
                        {case_.hasUSBC && (
                          <FeatureBadge
                            icon={Usb}
                            text="USB-C Front Panel"
                            variant="secondary"
                          />
                        )}
                        <FeatureBadge
                          icon={Fan}
                          text={`${case_.compatibility.airflowRating} Airflow`}
                          variant={
                            case_.compatibility.airflowRating === "Good"
                              ? "secondary"
                              : "outline"
                          }
                        />
                        <FeatureBadge
                          icon={HardDrive}
                          text={`${
                            parseInt(case_.driveBays.internal35) +
                            parseInt(case_.driveBays.internal25)
                          } Drive Bays`}
                          variant="outline"
                        />
                      </div>

                      {/* Compatibility Status */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <FeatureBadge
                          icon={
                            case_.compatibility.motherboardOk
                              ? Check
                              : AlertTriangle
                          }
                          text={`${
                            case_.compatibility.motherboardOk
                              ? "Compatible with"
                              : "Check"
                          } ${
                            components.motherboard?.specifications.formFactor
                          }`}
                          variant={
                            case_.compatibility.motherboardOk
                              ? "outline"
                              : "destructive"
                          }
                        />
                        <FeatureBadge
                          icon={
                            case_.compatibility.gpuClearanceOk
                              ? Check
                              : AlertTriangle
                          }
                          text="GPU Clearance"
                          variant={
                            case_.compatibility.gpuClearanceOk
                              ? "outline"
                              : "destructive"
                          }
                        />
                      </div>

                      {/* AI Recommendations */}
                      {case_.isRecommended && (
                        <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                          <Badge variant="secondary" className="mb-2">
                            AI Recommended
                          </Badge>
                          <ul className="text-sm space-y-1">
                            {case_.reasons?.map((reason, idx) => (
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
                fetchCases(newPage);
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
                fetchCases(newPage);
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
