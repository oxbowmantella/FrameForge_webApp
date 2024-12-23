"use client";
import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Settings2,
  Edit2,
  HomeIcon,
  DownloadIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";
import Image from "next/image";

const PCComponentSummary = () => {
  const router = useRouter();
  const { components, budget, totalSpent } = usePCBuilderStore();

  // Helper function to format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Helper function to format specification values
  const formatSpecValue = (value: any): string => {
    if (value === null || value === undefined) return "";

    // Handle objects (like dimensions)
    if (typeof value === "object") {
      if ("length" in value && "width" in value && "height" in value) {
        return `${value.length}mm × ${value.width}mm × ${value.height}mm`;
      }
      return Object.values(value).join(", ");
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    // Convert other types to string
    return String(value);
  };

  // Component categories in display order with their routes
  const componentOrder = [
    { key: "cpu", label: "CPU", route: "/pc-builder/cpu" },
    {
      key: "motherboard",
      label: "Motherboard",
      route: "/pc-builder/motherboard",
    },
    { key: "memory", label: "Memory", route: "/pc-builder/memory" },
    { key: "gpu", label: "Graphics Card", route: "/pc-builder/gpu" },
    { key: "storage", label: "Storage", route: "/pc-builder/storage" },
    { key: "case", label: "Case", route: "/pc-builder/case" },
    { key: "psu", label: "Power Supply", route: "/pc-builder/psu" },
    { key: "cooler", label: "CPU Cooler", route: "/pc-builder/cooler" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Your PC Build</h1>
            <p className="text-muted-foreground">
              Total: {formatPrice(totalSpent)} of {formatPrice(budget)} Budget
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => {}}
            className="flex items-center gap-2 bg-black text-white"
          >
            <DownloadIcon className="h-4 w-4" /> Download
          </Button>
        </div>

        {/* Components Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {componentOrder.map(({ key, label, route }) => {
            const component = components[key];

            return (
              <Card
                key={key}
                className={`transition-all duration-300 relative group ${
                  component ? "border-primary/20" : "border-dashed"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{label}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {component && (
                      <Badge variant="secondary">
                        {formatPrice(component.price)}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => router.push(route)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {component ? (
                    <div className="flex gap-4">
                      <div className="relative w-24 h-24 bg-secondary/10 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={component.image}
                          alt={component.name}
                          fill
                          className="object-contain"
                          sizes="(max-width: 96px) 100vw, 96px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {component.name}
                        </p>
                        {component.specifications && (
                          <div className="mt-2 space-y-1">
                            {Object.entries(component.specifications).map(
                              ([key, value]) =>
                                value && (
                                  <p
                                    key={key}
                                    className="text-xs text-muted-foreground truncate"
                                  >
                                    {key.charAt(0).toUpperCase() + key.slice(1)}
                                    : {formatSpecValue(value)}
                                  </p>
                                )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center h-24 bg-secondary/5 rounded-lg cursor-pointer hover:bg-secondary/10 transition-colors"
                      onClick={() => router.push(route)}
                    >
                      <p className="text-sm text-muted-foreground">
                        No {label} Selected
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to add
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PCComponentSummary;
