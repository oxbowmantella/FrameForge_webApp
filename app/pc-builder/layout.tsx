"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronUp, ChevronDown } from "lucide-react";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";
import { PCPart } from "@/types/pc-builder";

// Helper function to format price
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Types for our components
interface BudgetSectionProps {
  usedBudget: number;
  totalBudget: number;
  budgetPercentage: number;
}

interface Part {
  category: string;
  name: string;
  price: string;
  image: string;
}

interface PartsListProps {
  parts: Part[];
  usedBudget: number;
  totalBudget: number;
}

// Budget Section Component
function BudgetSection({
  usedBudget,
  totalBudget,
  budgetPercentage,
}: BudgetSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Budget</span>
        <span className="text-sm font-medium">
          {formatPrice(usedBudget)} / {formatPrice(totalBudget)}
        </span>
      </div>
      <Progress
        value={budgetPercentage}
        className="h-2"
        // Add color variants based on percentage
        variant={budgetPercentage > 100 ? "destructive" : "default"}
      />
      <p className="text-xs text-muted-foreground">
        {formatPrice(totalBudget - usedBudget)} remaining
      </p>
    </div>
  );
}

// Parts List Component
function PartsList({ parts, usedBudget, totalBudget }: PartsListProps) {
  return (
    <>
      <ScrollArea className="h-[calc(50vh-100px)] lg:h-[calc(100vh-300px)]">
        <div className="space-y-4">
          {parts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <p className="text-muted-foreground text-sm mb-2">
                Your parts list is empty
              </p>
              <p className="text-xs text-muted-foreground">
                Start selecting components to build your PC
              </p>
            </div>
          ) : (
            parts.map((part, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors duration-200 w-full"
              >
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image
                    src={part.image}
                    alt={part.name}
                    fill
                    className="object-contain rounded-md"
                    sizes="(max-width: 48px) 100vw, 48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {part.category}
                  </p>
                  <p className="text-sm font-medium truncate" title={part.name}>
                    {part.name}
                  </p>
                  <p className="text-sm font-bold text-primary truncate">
                    {part.price}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="border-t pt-4 mt-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total</span>
          <span className="font-bold text-lg">{formatPrice(usedBudget)}</span>
        </div>
        {usedBudget > 0 && (
          <p className="text-xs text-muted-foreground text-right mt-1">
            {Math.round((usedBudget / totalBudget) * 100)}% of budget used
          </p>
        )}
      </div>
    </>
  );
}

// Main Layout Component
export default function PCBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [gifKey, setGifKey] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Subscribe to specific store values instead of the whole store
  const budget = usePCBuilderStore((state) => state.budget);
  const selectedType = usePCBuilderStore((state) => state.selectedType);
  const components = usePCBuilderStore((state) => state.components);
  const totalSpent = usePCBuilderStore((state) => state.totalSpent);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Update GIF key on route change
  useEffect(() => {
    setGifKey((prev) => prev + 1);
  }, [pathname]);

  // Calculate budget percentage
  const budgetPercentage = budget > 0 ? (totalSpent / budget) * 100 : 0;

  // Convert components object to array for display
  const selectedParts = Object.entries(components)
    .filter(([_, component]) => component !== null)
    .map(([type, component]) => ({
      category:
        type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, " $1"),
      name: (component as PCPart).name,
      price: formatPrice((component as PCPart).price),
      image: "/mascot.gif", // You might want to update this with actual component images
    }));

  // Get description text based on state
  const getDescriptionText = () => {
    if (!budget) {
      return "Start by selecting a PC category to begin building your dream PC.";
    }

    if (selectedType) {
      return `Building ${selectedType} - Budget: ${formatPrice(budget)}`;
    }

    return `Budget set to ${formatPrice(budget)}`;
  };

  // Don't render until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      {/* Main Content Area */}
      <div className="p-4 lg:p-10">
        <div className="relative flex flex-col lg:flex-row lg:gap-6">
          {/* Left Section */}
          <div className="w-full lg:w-4/5">
            {/* Top Section with Gif and Text */}
            <div className="flex items-center gap-4 p-3 lg:p-4 rounded-lg mb-4 lg:mb-6 bg-secondary/5">
              <div className="w-12 h-12 lg:w-16 lg:h-16 relative flex-shrink-0">
                <Image
                  key={gifKey}
                  src="/mascot.gif"
                  alt="PC Builder Mascot"
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 48px, 64px"
                />
              </div>
              <div className="flex-1">
                <h2 className="text-xl lg:text-2xl font-bold mb-1 lg:mb-2">
                  Build Your Dream PC
                </h2>
                <p className="text-sm lg:text-base text-muted-foreground">
                  {getDescriptionText()}
                </p>
              </div>
            </div>

            {/* Component Selection Area */}
            <div className="bg-secondary/10 rounded-lg p-4 lg:p-6">
              {children}
            </div>
          </div>

          {/* Desktop Right Section - Fixed Position */}
          <div className="hidden lg:block lg:w-1/5">
            <div className="fixed right-10 w-[calc(20%-2.5rem)] h-[calc(100vh-120px)]">
              <Card className="h-full">
                <CardHeader className="space-y-4">
                  <BudgetSection
                    usedBudget={totalSpent}
                    totalBudget={budget}
                    budgetPercentage={budgetPercentage}
                  />
                </CardHeader>
                <CardContent>
                  <PartsList
                    parts={selectedParts}
                    usedBudget={totalSpent}
                    totalBudget={budget}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Panel */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t">
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="w-full p-2 flex items-center justify-between bg-primary text-primary-foreground"
        >
          <span className="font-medium">
            Parts List ({formatPrice(totalSpent)})
          </span>
          {isPanelOpen ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out
            ${isPanelOpen ? "max-h-[70vh]" : "max-h-0"}`}
        >
          <Card className="rounded-none border-x-0">
            <CardHeader className="space-y-4">
              <BudgetSection
                usedBudget={totalSpent}
                totalBudget={budget}
                budgetPercentage={budgetPercentage}
              />
            </CardHeader>
            <CardContent>
              <PartsList
                parts={selectedParts}
                usedBudget={totalSpent}
                totalBudget={budget}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
