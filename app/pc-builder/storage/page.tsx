// /app/pc-builder/storage/page.tsx
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
  HardDrive,
  Zap,
  Database,
  Cable,
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
  supportedInterfaces: {
    m2: boolean;
    sata: boolean;
  };
  recommendedTypes: string[];
  features: string[];
}

interface StorageDevice {
  id: string;
  name: string;
  image: string;
  manufacturer: string;
  price: number;
  capacity: string;
  pricePerGB: string;
  type: string;
  cache: string;
  formFactor: string;
  interface: string;
  isNVMe: boolean;
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

export default function StorageListing() {
  const router = useRouter();
  const { budget, setComponent, components } = usePCBuilderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [storageDevices, setStorageDevices] = useState<StorageDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );

  const fetchStorage = async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget,
          page,
          itemsPerPage: ITEMS_PER_PAGE,
          searchTerm: searchTerm.trim(),
          motherboard: components.motherboard,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setStorageDevices(data.storage || []);
      setTotalPages(Math.ceil((data.totalCount || 0) / ITEMS_PER_PAGE));
      setSearchCriteria(data.searchCriteria);
    } catch (error) {
      console.error("Error fetching storage:", error);
      setError("Failed to load storage devices. Please try again.");
      setStorageDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (budget && components.motherboard) {
      setCurrentPage(1);
      fetchStorage(1);
    }
  }, [budget, components.motherboard]);

  useEffect(() => {
    if (components.storage) {
      setSelectedStorage(components.storage.id);
    }
  }, [components.storage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchStorage(1);
  };

  const handleAddReplace = (storage: StorageDevice) => {
    if (selectedStorage === storage.id) {
      setSelectedStorage(null);
      setComponent("storage", null);
    } else {
      setSelectedStorage(storage.id);
      setComponent("storage", {
        id: storage.id,
        name: storage.name,
        price: storage.price,
        image: processImageUrl(storage.image),
        type: "storage",
        specifications: {
          capacity: storage.capacity,
          type: storage.type,
          formFactor: storage.formFactor,
          interface: storage.interface,
          isNVMe: storage.isNVMe,
        },
      });
    }
  };

  const renderFeatures = (storage: StorageDevice) => {
    const features = [];

    if (storage.type) {
      features.push(
        <FeatureBadge
          key="type"
          icon={storage.type === "SSD" ? Zap : HardDrive}
          text={storage.type}
          variant="default"
        />
      );
    }

    if (storage.capacity) {
      features.push(
        <FeatureBadge key="capacity" icon={Database} text={storage.capacity} />
      );
    }

    if (storage.interface) {
      features.push(
        <FeatureBadge
          key="interface"
          icon={Cable}
          text={storage.interface}
          variant="secondary"
        />
      );
    }

    if (storage.isNVMe) {
      features.push(
        <FeatureBadge key="nvme" icon={Zap} text="NVMe" variant="secondary" />
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

  const nextRoute = "/pc-builder/case";
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Select Storage</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                AI-recommended storage for your ${budget} build
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
                onClick={() => selectedStorage && router.push(nextRoute)}
                className="flex-1 sm:flex-none gap-2"
                disabled={!selectedStorage}
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
            placeholder="Search storage devices..."
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
              {searchCriteria.supportedInterfaces.m2 && (
                <Badge variant="secondary">M.2 Compatible</Badge>
              )}
              {searchCriteria.supportedInterfaces.sata && (
                <Badge variant="secondary">SATA Compatible</Badge>
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
        {!loading && !error && storageDevices.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No storage devices found matching your criteria. Try adjusting
              your search or budget.
            </p>
          </Card>
        )}

        {/* Storage Device Listings */}
        {!loading && !error && storageDevices.length > 0 && (
          <div className="space-y-6">
            {storageDevices.map((storage) => (
              <div
                key={storage.id}
                className={`
                relative group
                transition-all duration-300 ease-in-out
                ${
                  selectedStorage === storage.id
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:shadow-md"
                }
              `}
              >
                <Card
                  className="p-6 cursor-pointer"
                  onClick={() => handleAddReplace(storage)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-secondary/10 rounded-lg overflow-hidden">
                      <Image
                        src={processImageUrl(storage.image)}
                        alt={storage.name}
                        width={200}
                        height={200}
                        className="object-contain w-full h-full"
                      />
                    </div>

                    {/* Content Section */}
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold">{storage.name}</h3>
                          <p className="text-muted-foreground mt-1">
                            {storage.manufacturer} | {storage.capacity}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${storage.price.toFixed(2)}
                          </div>
                          {storage.pricePerGB && (
                            <div className="text-sm text-muted-foreground">
                              ${storage.pricePerGB}/GB
                            </div>
                          )}
                          <Button
                            variant={
                              selectedStorage === storage.id
                                ? "default"
                                : "outline"
                            }
                            className="mt-2 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddReplace(storage);
                            }}
                          >
                            {selectedStorage === storage.id ? (
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
                        {renderFeatures(storage)}
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 text-sm text-muted-foreground">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {storage.formFactor && (
                            <span>Form Factor: {storage.formFactor}</span>
                          )}
                          {storage.cache && <span>Cache: {storage.cache}</span>}
                        </div>
                      </div>

                      {/* AI Recommendations */}
                      {storage.isRecommended && (
                        <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                          <Badge variant="secondary" className="mb-2">
                            AI Recommended
                          </Badge>
                          <ul className="text-sm space-y-1">
                            {storage.reasons?.map((reason, idx) => (
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
                fetchStorage(newPage);
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
                fetchStorage(newPage);
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
