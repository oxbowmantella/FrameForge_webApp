// /app/pc-builder/psu/page.tsx
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
  Zap,
  Battery,
  Cable,
  Power,
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

interface PSUConnectors {
  eps: string;
  pcie8pin: string;
  pcie6pin: string;
  sata: string;
  molex: string;
}

interface SystemRequirements {
  requiredWattage: number;
  requiredConnectors: {
    eps: boolean;
    pcie8pin: number;
    pcie6pin: number;
    sata: number;
    molex: number;
  };
  recommendedWattage: number;
}

interface SearchCriteria {
  priceRange: {
    min: number;
    max: number;
  };
  minimumWattage: number;
  requiredConnectors: {
    eps: boolean;
    pcie8pin: number;
    pcie6pin: number;
    sata: number;
    molex: number;
  };
  features: string[];
}

interface PowerSupply {
  id: string;
  name: string;
  image: string;
  manufacturer: string;
  price: number;
  wattage: number;
  efficiency: string;
  modular: string;
  length: string;
  connectors: PSUConnectors;
  score: number;
  isRecommended: boolean;
  compatibility: {
    wattageOk: boolean;
    connectorsOk: boolean;
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

// Helper function for power supply tier rating
const getPSUTier = (efficiency: string, wattage: number): string => {
  const tierMap: { [key: string]: string } = {
    "80+ Titanium": "S",
    "80+ Platinum": "A",
    "80+ Gold": "B",
    "80+ Silver": "C",
    "80+ Bronze": "D",
  };

  // Bonus tier for high wattage units
  const tier = tierMap[efficiency] || "E";
  if (wattage >= 1000 && tier !== "S") {
    return String.fromCharCode(tier.charCodeAt(0) - 1);
  }
  return tier;
};

export default function PSUListing() {
  const router = useRouter();
  const { budget, setComponent, components } = usePCBuilderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPsu, setSelectedPsu] = useState<string | null>(null);
  const [powerSupplies, setPowerSupplies] = useState<PowerSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );
  const [systemRequirements, setSystemRequirements] =
    useState<SystemRequirements | null>(null);

  const fetchPowerSupplies = async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/psu", {
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

      setPowerSupplies(data.powerSupplies || []);
      setTotalPages(Math.ceil((data.totalCount || 0) / ITEMS_PER_PAGE));
      setSearchCriteria(data.searchCriteria);
      setSystemRequirements(data.systemRequirements);
    } catch (error) {
      console.error("Error fetching power supplies:", error);
      setError("Failed to load power supplies. Please try again.");
      setPowerSupplies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (budget && components.gpu) {
      setCurrentPage(1);
      fetchPowerSupplies(1);
    }
  }, [budget, components.gpu]);

  useEffect(() => {
    if (components.psu) {
      setSelectedPsu(components.psu.id);
    }
  }, [components.psu]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchPowerSupplies(1);
  };

  const handleAddReplace = (psu: PowerSupply) => {
    if (selectedPsu === psu.id) {
      setSelectedPsu(null);
      setComponent("psu", null);
    } else {
      setSelectedPsu(psu.id);
      setComponent("psu", {
        id: psu.id,
        name: psu.name,
        price: psu.price,
        image: processImageUrl(psu.image),
        type: "psu",
        specifications: {
          wattage: psu.wattage,
          efficiency: psu.efficiency,
          modular: psu.modular,
          connectors: psu.connectors,
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
  if (!components.gpu) missingComponents.push("GPU");

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
                Select Power Supply
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                AI-recommended PSUs for your ${budget} build
                {systemRequirements &&
                  ` - Minimum ${systemRequirements.requiredWattage}W required`}
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
                onClick={() => selectedPsu && router.push("/pc-builder/cooler")}
                className="flex-1 sm:flex-none gap-2"
                disabled={!selectedPsu}
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
            placeholder="Search power supplies..."
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
        {systemRequirements && (
          <Card className="p-4 mb-6 bg-secondary/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Required Power</h3>
                <Badge variant="default" className="text-nowrap">
                  Min: {systemRequirements.requiredWattage}W
                </Badge>
                <Badge variant="outline" className="ml-2 text-nowrap">
                  Recommended: {systemRequirements.recommendedWattage}W
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">GPU Power</h3>
                <Badge variant="secondary" className="text-nowrap">
                  {components.gpu?.specifications?.powerConnectors ||
                    "Standard PCIe"}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">CPU Power</h3>
                <Badge variant="secondary" className="text-nowrap">
                  {systemRequirements.requiredConnectors.eps
                    ? "8-pin EPS Required"
                    : "4-pin CPU"}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Recommended Features
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Modular</Badge>
                  <Badge variant="outline">80+ Gold</Badge>
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
        {!loading && !error && powerSupplies.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No compatible power supplies found. Try adjusting your search
              criteria or budget.
            </p>
          </Card>
        )}

        {/* PSU Listings */}
        {!loading && !error && powerSupplies.length > 0 && (
          <div className="space-y-6">
            {powerSupplies.map((psu) => (
              <div
                key={psu.id}
                className={`
                relative group
                transition-all duration-300 ease-in-out
                ${
                  selectedPsu === psu.id
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:shadow-md"
                }
              `}
              >
                <Card
                  className="p-6 cursor-pointer"
                  onClick={() => handleAddReplace(psu)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-secondary/10 rounded-lg overflow-hidden">
                      <Image
                        src={processImageUrl(psu.image)}
                        alt={psu.name}
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
                          <h3 className="text-2xl font-bold">{psu.name}</h3>
                          <p className="text-muted-foreground mt-1">
                            {psu.manufacturer} | {psu.wattage}W |{" "}
                            {psu.efficiency}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${psu.price.toFixed(2)}
                          </div>
                          <Button
                            variant={
                              selectedPsu === psu.id ? "default" : "outline"
                            }
                            className="mt-2 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddReplace(psu);
                            }}
                          >
                            {selectedPsu === psu.id ? (
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

                      {/* Key Specifications */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Badge variant="default" className="mb-1">
                            Power Rating
                          </Badge>
                          <p className="text-sm">
                            {psu.wattage}W | {psu.efficiency}
                          </p>
                        </div>
                        <div>
                          <Badge variant="default" className="mb-1">
                            Form Factor
                          </Badge>
                          <p className="text-sm">
                            {psu.modular} | {psu.length}mm
                          </p>
                        </div>
                        <div>
                          <Badge variant="default" className="mb-1">
                            CPU Power
                          </Badge>
                          <p className="text-sm">{psu.connectors.eps} EPS</p>
                        </div>
                        <div>
                          <Badge variant="default" className="mb-1">
                            GPU Power
                          </Badge>
                          <p className="text-sm">
                            {psu.connectors.pcie8pin} x 8-pin
                          </p>
                        </div>
                      </div>

                      {/* Compatibility Status */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <FeatureBadge
                          icon={
                            psu.compatibility.wattageOk ? Check : AlertTriangle
                          }
                          text={`Wattage: ${
                            psu.compatibility.wattageOk
                              ? "Sufficient"
                              : "Insufficient"
                          }`}
                          variant={
                            psu.compatibility.wattageOk
                              ? "outline"
                              : "destructive"
                          }
                        />
                        <FeatureBadge
                          icon={
                            psu.compatibility.connectorsOk
                              ? Check
                              : AlertTriangle
                          }
                          text={`Connectors: ${
                            psu.compatibility.connectorsOk
                              ? "Compatible"
                              : "Missing Required"
                          }`}
                          variant={
                            psu.compatibility.connectorsOk
                              ? "outline"
                              : "destructive"
                          }
                        />
                        <FeatureBadge
                          icon={Gauge}
                          text={`Tier ${getPSUTier(
                            psu.efficiency,
                            psu.wattage
                          )}`}
                          variant="secondary"
                        />
                      </div>

                      {/* Connectors */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <FeatureBadge
                          icon={Cable}
                          text={`${psu.connectors.sata} SATA`}
                          variant="secondary"
                        />
                        <FeatureBadge
                          icon={Cable}
                          text={`${psu.connectors.molex} Molex`}
                          variant="secondary"
                        />
                      </div>

                      {/* AI Recommendations */}
                      {psu.isRecommended && (
                        <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                          <Badge variant="secondary" className="mb-2">
                            AI Recommended
                          </Badge>
                          <ul className="text-sm space-y-1">
                            {psu.reasons?.map((reason, idx) => (
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
                fetchPowerSupplies(newPage);
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
                fetchPowerSupplies(newPage);
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
