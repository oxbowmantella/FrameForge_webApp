"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronUp, ChevronDown } from "lucide-react";

const dummyParts = [
  {
    category: "Memory",
    name: "CORSAIR VENGEANCE RGB PRO 32 GB",
    price: "140$",
    image: "/mascot.gif",
  },
  {
    category: "CPU",
    name: "INTEL CORE i5-11500H 3.5 GHZ",
    price: "590$",
    image: "/mascot.gif",
  },
  {
    category: "Motherboard",
    name: "ASUS ROG STRIX Z590-E GAMING WIFI",
    price: "130$",
    image: "/mascot.gif",
  },
  {
    category: "Case",
    name: "COOLER MASTER COSMOS C700M",
    price: "545$",
    image: "/mascot.gif",
  },
];

export default function PCBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [gifKey, setGifKey] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const totalBudget = 3500;
  const usedBudget = 1405;
  const budgetPercentage = (usedBudget / totalBudget) * 100;

  useEffect(() => {
    setGifKey((prev) => prev + 1);
  }, [pathname]);

  return (
    <div className="relative flex flex-col h-[calc(100vh-80px)]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-10">
        <div className="h-full flex flex-col lg:flex-row lg:gap-6">
          {/* Left Section */}
          <div className="w-full lg:w-4/5 h-full flex flex-col">
            {/* Top Section with Gif and Text */}
            <div className="flex items-center gap-4 p-3 lg:p-4 rounded-lg mb-4 lg:mb-6">
              <div className="w-12 h-12 lg:w-16 lg:h-16 relative flex-shrink-0">
                <Image
                  key={gifKey}
                  src="/mascot.gif"
                  alt="Mascot"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex-1">
                <h2 className="text-xl lg:text-2xl font-bold mb-1 lg:mb-2">
                  Build Your Dream PC
                </h2>
                <p className="text-sm lg:text-base text-muted-foreground">
                  Start by selecting a PC category to begin building your dream
                  PC.
                </p>
              </div>
            </div>

            {/* Component Selection Area */}
            <div className="flex-1 bg-secondary/10 rounded-lg p-4 lg:p-6">
              {children}
            </div>
          </div>

          {/* Desktop Right Section */}
          <div className="hidden lg:block lg:w-1/5 h-full">
            <Card className="h-full">
              <CardHeader className="space-y-4">
                <BudgetSection
                  usedBudget={usedBudget}
                  totalBudget={totalBudget}
                  budgetPercentage={budgetPercentage}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <PartsList parts={dummyParts} usedBudget={usedBudget} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Panel */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background">
        {/* Panel Toggle Button */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="w-full p-2 flex items-center justify-between bg-primary text-primary-foreground"
        >
          <span className="font-medium">Parts List (${usedBudget})</span>
          {isPanelOpen ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
        </button>

        {/* Expandable Panel Content */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out
            ${isPanelOpen ? "max-h-[70vh]" : "max-h-0"}`}
        >
          <Card className="rounded-none border-x-0">
            <CardHeader className="space-y-4">
              <BudgetSection
                usedBudget={usedBudget}
                totalBudget={totalBudget}
                budgetPercentage={budgetPercentage}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <PartsList parts={dummyParts} usedBudget={usedBudget} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BudgetSection({ usedBudget, totalBudget, budgetPercentage }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Budget</span>
        <span className="text-sm font-medium">
          ${usedBudget} / ${totalBudget}
        </span>
      </div>
      <Progress value={budgetPercentage} className="h-2" />
    </div>
  );
}

function PartsList({ parts, usedBudget }) {
  return (
    <>
      <ScrollArea className="h-[calc(50vh-100px)] lg:h-[calc(100vh-300px)]">
        <div className="space-y-4">
          {parts.map((part, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-secondary/10 rounded-lg hover:bg-zinc-100 w-full"
            >
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src={part.image}
                  alt={part.name}
                  fill
                  className="object-contain rounded-md"
                />
              </div>
              <div className="flex-1 w-0">
                {" "}
                {/* Added w-0 to force text truncation */}
                <p className="text-xs text-muted-foreground truncate w-full">
                  {part.category}
                </p>
                <p
                  className="text-sm font-medium truncate w-full"
                  title={part.name}
                >
                  {part.name}
                </p>
                <p className="text-sm font-bold text-primary truncate w-full">
                  {part.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div>
        <div className="flex justify-between items-center">
          <span className="font-medium">Total</span>
          <span className="font-bold text-lg">${usedBudget}</span>
        </div>
      </div>
    </>
  );
}
