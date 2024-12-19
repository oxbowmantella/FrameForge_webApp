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
  Wifi,
  MemoryStick,
  Usb,
  HardDrive,
} from "lucide-react";
import { AnimatedFFLogo } from "@/components/AnimatedFFLogo";
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
  mustHaveFeatures: string[];
  recommendedSockets: string[];
  recommendedFormFactors: string[];
}

interface Motherboard {
  image: any;
  id: string;
  name: string;
  price: number;
  specifications?: string;
  socket?: string;
  formFactor?: string;
  features?: string[];
  chipset?: string;
  manufacturer?: string;
  memoryType?: string;
  memoryMax?: string;
  wirelessNetworking?: string;
  m2Slots?: string;
  usb32Gen2Headers?: string;
  usb32Gen1Headers?: string;
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

export default function MotherboardListing() {
  const router = useRouter();
  const { budget, setComponent, components } = usePCBuilderStore();
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

  const fetchMotherboards = async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/motherboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget,
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
      console.log(data.motherboards);

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

  useEffect(() => {
    if (budget) {
      setCurrentPage(1);
      fetchMotherboards(1);
    }
  }, [budget]);

  useEffect(() => {
    if (components.motherboard) {
      setSelectedBoard(components.motherboard.id);
    }
  }, [components.motherboard]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchMotherboards(1);
  };

  const handleAddReplace = (board: Motherboard) => {
    if (selectedBoard === board.id) {
      setSelectedBoard(null);
      setComponent("motherboard", null);
    } else {
      setSelectedBoard(board.id);
      // Convert the motherboard to PCPart format
      setComponent("motherboard", {
        id: board.id,
        name: board.name,
        price: board.price,
        image: processImageUrl(board.image),
        type: "motherboard",
        specifications: {
          socket: board.socket,
          formFactor: board.formFactor,
          chipset: board.chipset,
          manufacturer: board.manufacturer,
          memoryType: board.memoryType,
          memoryMax: board.memoryMax,
        },
      });
    }
  };

  const renderFeatures = (motherboard: Motherboard) => {
    const features = [];

    if (motherboard.socket) {
      features.push(
        <FeatureBadge
          key="socket"
          icon={Cpu}
          text={motherboard.socket}
          variant="default"
        />
      );
    }

    if (motherboard.formFactor) {
      features.push(
        <FeatureBadge key="formFactor" text={motherboard.formFactor} />
      );
    }

    if (motherboard.memoryType && motherboard.memoryMax) {
      features.push(
        <FeatureBadge
          key="memory"
          icon={MemoryStick}
          text={`${motherboard.memoryType} (Max ${motherboard.memoryMax}GB)`}
        />
      );
    }

    if (motherboard.wirelessNetworking) {
      features.push(
        <FeatureBadge
          key="wifi"
          icon={Wifi}
          text={motherboard.wirelessNetworking}
          variant="secondary"
        />
      );
    }

    if (motherboard.m2Slots) {
      features.push(
        <FeatureBadge
          key="m2"
          icon={HardDrive}
          text={`${motherboard.m2Slots.split(",").length} M.2 Slots`}
        />
      );
    }

    const usbPorts = [];
    if (motherboard.usb32Gen2Headers) usbPorts.push("USB 3.2 Gen 2");
    if (motherboard.usb32Gen1Headers) usbPorts.push("USB 3.2 Gen 1");
    if (usbPorts.length) {
      features.push(<FeatureBadge key="usb" icon={Usb} text={usbPorts[0]} />);
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
              <h1 className="text-3xl sm:text-4xl font-bold">
                Select Motherboard
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                AI-recommended motherboards for your ${budget} build
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
                onClick={() => selectedBoard && router.push("/pc-builder/cpu")}
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
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Budget: ${searchCriteria.priceRange.min} - $
                {searchCriteria.priceRange.max}
              </Badge>
              {searchCriteria.recommendedSockets.map((socket, idx) => (
                <Badge key={idx} variant="secondary">
                  Socket: {socket}
                </Badge>
              ))}
              {searchCriteria.recommendedFormFactors.map((form, idx) => (
                <Badge key={idx} variant="secondary">
                  Form Factor: {form}
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
                  onClick={() => handleAddReplace(board)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-secondary/10 rounded-lg overflow-hidden">
                      <Image
                        src={processImageUrl(board.image)}
                        alt={board.name}
                        width={200}
                        height={200}
                      />
                    </div>

                    {/* Content Section */}
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold">{board.name}</h3>
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
                              handleAddReplace(board);
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

                      {/* Features */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {renderFeatures(board)}
                      </div>

                      {/* Additional Info */}
                      {board.specifications && (
                        <p className="mt-4 text-sm text-muted-foreground">
                          {board.specifications}
                        </p>
                      )}

                      {/* AI Recommendations */}
                      {board.isRecommended && (
                        <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                          <Badge variant="secondary" className="mb-2">
                            AI Recommended
                          </Badge>
                          <ul className="text-sm space-y-1">
                            {board.reasons?.map((reason, idx) => (
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
                fetchMotherboards(newPage);
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
                fetchMotherboards(newPage);
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
