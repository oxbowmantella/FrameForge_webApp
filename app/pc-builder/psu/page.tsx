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
  Zap,
  Power,
  Cable,
  Gauge,
  Plug,
  Battery,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";
import { Card } from "@/components/ui/card";
import { FeatureBadge } from "@/components/ui/feature-badge";

const ITEMS_PER_PAGE = 10;

interface PowerBreakdown {
  basePower: number;
  cpuPower: number;
  gpuPower: number;
  memoryPower: number;
  storagePower: number;
  fansPower: number;
  overhead: number;
}

interface SystemRequirements {
  powerBreakdown: PowerBreakdown;
  totalRequired: number;
  recommended: number;
  connectors: {
    eps8pin: number;
    pcie8pin: number;
    pcie6pin: number;
    sata: number;
    molex: number;
  };
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
  formFactor: string;
  connectors: {
    eps8pin: number;
    pcie8pin: number;
    pcie6pin: number;
    sata: number;
    molex: number;
  };
  score: number;
  isRecommended: boolean;
  reasons: string[];
  powerRequirements: {
    system: number;
    recommended: number;
    provided: number;
    headroom: number;
    breakdown: PowerBreakdown;
  };
}

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

      // Make sure systemRequirements exists before setting
      if (data.systemRequirements) {
        setSystemRequirements(data.systemRequirements);
      }
    } catch (error) {
      console.error("Error fetching power supplies:", error);
      setError("Failed to load power supplies. Please try again.");
      setPowerSupplies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (budget && components.cpu && components.gpu) {
      setCurrentPage(1);
      fetchPowerSupplies(1);
    }
  }, [budget, components.cpu, components.gpu]);

  useEffect(() => {
    if (components.psu) {
      setSelectedPsu(components.psu.id);
    }
  }, [components.psu]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchPowerSupplies(1);
  };

  const handleSelectPSU = (psu: PowerSupply) => {
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
    if (!url) return "";
    return url.startsWith("//") ? `https:${url}` : url;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Check for missing required components
  const missingComponents = [];
  if (!components.cpu) missingComponents.push("CPU");
  if (
    !components.gpu &&
    components.cpu?.specifications &&
    !("integratedGraphics" in components.cpu.specifications)
  ) {
    missingComponents.push("GPU");
  }

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
                {systemRequirements
                  ? `System needs ${systemRequirements.totalRequired}W minimum, recommending ${systemRequirements.recommended}W for optimal performance`
                  : "Calculating power requirements..."}
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
                onClick={() =>
                  selectedPsu && router.push("/pc-builder/storage")
                }
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

        {components.cpu && ( // Only show if we have a CPU selected
          <Card className="p-4 mb-8 bg-secondary/10">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <h3 className="font-medium mb-2">Power Requirements</h3>
                <div className="flex flex-wrap gap-2">
                  {systemRequirements ? (
                    <>
                      <FeatureBadge
                        icon={Power}
                        text={`${systemRequirements.totalRequired}W Required`}
                        variant="default"
                      />
                      <FeatureBadge
                        icon={Battery}
                        text={`${systemRequirements.recommended}W Recommended`}
                        variant="outline"
                      />
                    </>
                  ) : (
                    <FeatureBadge
                      icon={Power}
                      text="Calculating requirements..."
                      variant="outline"
                    />
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">CPU & GPU Power</h3>
                <div className="flex flex-wrap gap-2">
                  {systemRequirements ? (
                    <>
                      <FeatureBadge
                        icon={Plug}
                        text={`CPU: ${systemRequirements.powerBreakdown.cpuPower}W`}
                      />
                      <FeatureBadge
                        icon={Plug}
                        text={`GPU: ${systemRequirements.powerBreakdown.gpuPower}W`}
                      />
                    </>
                  ) : (
                    <FeatureBadge
                      icon={Plug}
                      text="Loading power data..."
                      variant="outline"
                    />
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Efficiency Recommendation</h3>
                <FeatureBadge
                  icon={Zap}
                  text="80+ Gold or better recommended"
                  variant="secondary"
                />
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
                  onClick={() => handleSelectPSU(psu)}
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
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold">{psu.name}</h3>
                            {psu.isRecommended && (
                              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                <Star className="w-3 h-3 mr-1" />
                                Recommended
                              </Badge>
                            )}
                          </div>
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
                              handleSelectPSU(psu);
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

                      {/* Features */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <FeatureBadge
                          icon={Power}
                          text={`${psu.wattage}W`}
                          variant="default"
                        />
                        <FeatureBadge
                          icon={Zap}
                          text={psu.efficiency}
                          variant="secondary"
                        />
                        <FeatureBadge
                          icon={Cable}
                          text={psu.modular}
                          variant="outline"
                        />
                        <FeatureBadge
                          icon={Gauge}
                          text={`${Math.round(
                            (psu.powerRequirements.headroom /
                              psu.powerRequirements.system) *
                              100
                          )}% Headroom`}
                          variant={
                            psu.powerRequirements.headroom > 100
                              ? "default"
                              : "outline"
                          }
                        />
                      </div>

                      {/* Connectors */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {psu.connectors.eps8pin > 0 && (
                          <FeatureBadge
                            icon={Cable}
                            text={`${psu.connectors.eps8pin}x EPS`}
                            variant="secondary"
                          />
                        )}
                        {psu.connectors.pcie8pin > 0 && (
                          <FeatureBadge
                            icon={Cable}
                            text={`${psu.connectors.pcie8pin}x PCIe 8-pin`}
                            variant="secondary"
                          />
                        )}
                        {psu.connectors.pcie6pin > 0 && (
                          <FeatureBadge
                            icon={Cable}
                            text={`${psu.connectors.pcie6pin}x PCIe 6-pin`}
                            variant="secondary"
                          />
                        )}
                      </div>

                      {/* Additional Specs */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Form Factor:
                          </span>
                          <p className="font-medium">{psu.formFactor}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Length:</span>
                          <p className="font-medium">{psu.length}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            SATA Ports:
                          </span>
                          <p className="font-medium">{psu.connectors.sata}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Molex:</span>
                          <p className="font-medium">{psu.connectors.molex}</p>
                        </div>
                      </div>

                      {/* AI Recommendations */}
                      <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                        <ul className="text-sm space-y-1">
                          {psu.reasons?.map((reason, idx) => (
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

        {/* Bottom Padding for Mobile Navigation */}
        <div className="h-24 lg:h-0" />
      </div>
    </div>
  );
}
