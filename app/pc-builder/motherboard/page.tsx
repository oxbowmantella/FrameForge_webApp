"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Cpu,
  Wifi,
  MemoryStick,
  Usb,
  HardDrive,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  CircuitBoard,
  MemoryStickIcon,
  Database,
} from "lucide-react";

// Types
interface Motherboard {
  id: string;
  name: string;
  price: number;
  image: string;
  manufacturer: string;
  socket: string;
  formFactor: string;
  chipset: string;
  memoryMax: string;
  memoryType: string;
  memorySlots: string;
  m2Slots: string;
  wirelessNetworking: string;
  pciSlots: string;
  sataSlots: string;
  usb32Gen2Headers: string;
  usb32Gen1Headers: string;
  specifications: string;
  score: number;
  isRecommended: boolean;
  reasons: string[];
}

interface SearchCriteria {
  priceRange: {
    min: number;
    max: number;
  };
  mustHaveFeatures: string[];
  recommendedSockets: string[];
  recommendedFormFactors: string[];
}

interface APIResponse {
  motherboards: Motherboard[];
  totalCount: number;
  page: number;
  itemsPerPage: number;
  searchCriteria: SearchCriteria;
}

// Feature Badge Component
const FeatureBadge = ({
  icon: Icon,
  text,
  variant = "outline",
  tooltip,
}: {
  icon?: React.ComponentType<any>;
  text: string;
  variant?: "outline" | "default" | "secondary";
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

// Constants
const ITEMS_PER_PAGE = 10;

export default function MotherboardSelector() {
  const router = useRouter();
  const { budget, setComponent, components, preferences } = usePCBuilderStore();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [motherboards, setMotherboards] = useState<Motherboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );

  // Helper function to process image URLs
  const processImageUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith("//")) {
      return `https:${url}`;
    }
    return url;
  };

  // Fetch motherboards from API
  const fetchMotherboards = async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/motherboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget,
          cpuBrand: preferences.cpuBrand,
          selectedCPU: components.cpu
            ? {
                socket: components.cpu.specifications.socket,
                specifications: {
                  tdp: components.cpu.specifications.tdp,
                  integratedGraphics:
                    components.cpu.specifications.integratedGraphics,
                  memoryType: components.cpu.specifications.memoryType,
                  coreCount: components.cpu.specifications.coreCount,
                },
              }
            : null,
          page,
          itemsPerPage: ITEMS_PER_PAGE,
          searchTerm: searchTerm.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: APIResponse = await response.json();
      setMotherboards(data.motherboards || []);
      setTotalPages(Math.ceil((data.totalCount || 0) / ITEMS_PER_PAGE));
      setSearchCriteria(data.searchCriteria);
    } catch (error) {
      console.error("Error fetching motherboards:", error);
      setError("Failed to load motherboards. Please try again.");
      setMotherboards([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect hooks
  useEffect(() => {
    if (budget) {
      setCurrentPage(1);
      fetchMotherboards(1);
    }
  }, [budget, components.cpu]);

  useEffect(() => {
    if (components.motherboard) {
      setSelectedBoard(components.motherboard.id);
    }
  }, [components.motherboard]);

  // Event handlers
  const handleSearch = () => {
    setCurrentPage(1);
    fetchMotherboards(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelect = (motherboard: Motherboard) => {
    if (selectedBoard === motherboard.id) {
      setSelectedBoard(null);
      setComponent("motherboard", null);
    } else {
      setSelectedBoard(motherboard.id);
      setComponent("motherboard", {
        id: motherboard.id,
        name: motherboard.name,
        price: motherboard.price,
        image: processImageUrl(motherboard.image),
        type: "motherboard",
        specifications: {
          socket: motherboard.socket,
          formFactor: motherboard.formFactor,
          chipset: motherboard.chipset,
          manufacturer: motherboard.manufacturer,
          memoryType: motherboard.memoryType,
          memoryMax: motherboard.memoryMax,
          memorySlots: parseInt(motherboard.memorySlots, 10),
          m2Slots: motherboard.m2Slots.split(",").length,
          pciSlots: parseInt(motherboard.pciSlots, 10),
          sataSlots: motherboard.sataSlots,
        },
      });
    }
  };

  const handleBack = () => router.push("/pc-builder/cpu");
  const handleNext = () => {
    if (selectedBoard) router.push("/pc-builder/cooler");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Select Motherboard
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {components.cpu
                  ? `Compatible with ${components.cpu.name}`
                  : `Budget Range: $${searchCriteria?.priceRange.min.toFixed(
                      0
                    )} - $${searchCriteria?.priceRange.max.toFixed(0)}`}
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
                disabled={!selectedBoard}
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
            placeholder="Search motherboards..."
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
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Budget: ${searchCriteria.priceRange.min.toFixed(0)} - $
                  {searchCriteria.priceRange.max.toFixed(0)}
                </Badge>
                {components.cpu && (
                  <Badge variant="secondary" className="gap-1">
                    <Cpu className="w-3 h-3" />{" "}
                    {components.cpu.specifications.socket}
                  </Badge>
                )}
                {searchCriteria.recommendedFormFactors.map((form, idx) => (
                  <Badge key={idx} variant="secondary">
                    Form Factor: {form}
                  </Badge>
                ))}
              </div>
              {components.cpu && (
                <p className="text-sm text-muted-foreground">
                  Showing motherboards compatible with {components.cpu.name}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 text-center text-red-500 mb-6">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            {error}
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && motherboards.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No motherboards found matching your criteria. Try adjusting your
              search or budget.
            </p>
          </Card>
        )}

        {/* Motherboard Listings */}
        {!loading && !error && motherboards.length > 0 && (
          <div className="space-y-6">
            {motherboards.map((board) => (
              <div
                key={board.id}
                className={`
                  relative group
                  transition-all duration-300 ease-in-out
                  ${
                    selectedBoard === board.id
                      ? "ring-2 ring-primary shadow-lg"
                      : "hover:shadow-md"
                  }
                `}
              >
                <Card
                  className="p-6 cursor-pointer"
                  onClick={() => handleSelect(board)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-secondary/10 rounded-lg overflow-hidden">
                      <Image
                        src={processImageUrl(board.image)}
                        alt={board.name}
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
                            <h3 className="text-2xl font-bold">{board.name}</h3>
                            {board.isRecommended && (
                              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                <Star className="w-3 h-3 mr-1" />
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mt-1">
                            {board.manufacturer} | {board.chipset}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${board.price.toFixed(2)}
                          </div>
                          <Button
                            variant={
                              selectedBoard === board.id ? "default" : "outline"
                            }
                            className="mt-2 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(board);
                            }}
                          >
                            {selectedBoard === board.id ? (
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

                      {/* Compatibility Score */}
                      {components.cpu && (
                        <div className="mt-4">
                          <Badge
                            variant={
                              board.score >= 80 ? "default" : "secondary"
                            }
                            className="mb-2"
                          >
                            Compatibility Score: {board.score}/100
                          </Badge>
                        </div>
                      )}
                      {/* Main Features */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        <FeatureBadge
                          icon={Cpu}
                          text={board.socket}
                          variant="default"
                          tooltip="CPU Socket Type"
                        />
                        <FeatureBadge
                          icon={CircuitBoard}
                          text={board.formFactor}
                          variant="secondary"
                          tooltip="Motherboard Form Factor"
                        />
                        <FeatureBadge
                          icon={MemoryStickIcon}
                          text={`${board.memoryType}`}
                          variant="outline"
                          tooltip="Memory Type"
                        />
                        <FeatureBadge
                          icon={Database}
                          text={`${board.memoryMax} Max RAM`}
                          variant="outline"
                          tooltip="Maximum RAM Support"
                        />
                        <FeatureBadge
                          icon={MemoryStickIcon}
                          text={`${board.memorySlots} DIMM Slots`}
                          variant="secondary"
                          tooltip="Number of RAM Slots"
                        />
                        {board.wirelessNetworking &&
                          board.wirelessNetworking !== "None" && (
                            <FeatureBadge
                              icon={Wifi}
                              text={board.wirelessNetworking}
                              variant="secondary"
                              tooltip="Wireless Connectivity"
                            />
                          )}
                        <FeatureBadge
                          icon={HardDrive}
                          text={`${board.m2Slots.split(",").length} M.2 Slots`}
                          variant="outline"
                          tooltip="M.2 Storage Slots"
                        />
                        <FeatureBadge
                          icon={Database}
                          text={`${board.sataSlots} SATA Ports`}
                          variant="outline"
                          tooltip="SATA Storage Connections"
                        />
                        {parseInt(board.usb32Gen2Headers) > 0 && (
                          <FeatureBadge
                            icon={Usb}
                            text={`USB 3.2 Gen 2 x${board.usb32Gen2Headers}`}
                            variant="secondary"
                            tooltip="High-Speed USB Headers"
                          />
                        )}
                      </div>

                      {/* Additional Information */}
                      <div className="mt-4 space-y-2">
                        {board.specifications && (
                          <p className="text-sm text-muted-foreground">
                            {board.specifications}
                          </p>
                        )}
                      </div>

                      {/* Compatibility and Recommendations */}
                      {board.reasons && board.reasons.length > 0 && (
                        <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {board.isRecommended && (
                              <Star className="w-4 h-4 text-green-500" />
                            )}
                            <p className="font-medium">
                              {board.isRecommended
                                ? "AI Recommended Choice"
                                : "Compatibility Details"}
                            </p>
                          </div>
                          <ul className="text-sm space-y-1">
                            {board.reasons.map((reason, idx) => (
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
                fetchMotherboards(newPage);
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
                fetchMotherboards(newPage);
              }}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Bottom Padding for Mobile Navigation */}
        <div className="h-24 lg:h-0" />
      </div>
    </div>
  );
}
