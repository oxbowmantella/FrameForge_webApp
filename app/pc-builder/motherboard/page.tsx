"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { AnimatedFFLogo } from "@/components/AnimatedFFLogo";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

// Dummy data for motherboards
const motherboardData = [
  {
    id: 1,
    name: "ROG MAXIMUS Z790 HERO",
    specs:
      "Intel Z790 (LGA 1700) ATX gaming motherboard with 20 + 1 power stages, DDR5, PCIe 5.0",
    price: 599.99,
    recommended: true,
  },
  {
    id: 2,
    name: "MPG B650 CARBON WIFI",
    specs: "AMD AM5 socket, DDR5 memory support, PCIe 5.0, WiFi 6E",
    price: 329.99,
    recommended: true,
  },
  {
    id: 3,
    name: "GIGABYTE Z690 AORUS MASTER",
    specs: "Intel LGA 1700, DDR5, Direct 19+1+2 Phase VRM Design",
    price: 449.99,
    recommended: false,
  },
  {
    id: 4,
    name: "ASRock B550 Phantom Gaming",
    specs: "AMD AM4, PCIe 4.0, Dual M.2 Slots, 2.5GbE LAN",
    price: 179.99,
    recommended: false,
  },
  {
    id: 5,
    name: "ASUS TUF GAMING B560M-PLUS",
    specs: "Intel LGA 1200, PCIe 4.0, Dual M.2, WiFi 6",
    price: 149.99,
    recommended: false,
  },
];

export default function MotherboardListing() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBoard, setSelectedBoard] = useState(null);

  const handleAddReplace = (boardId) => {
    if (selectedBoard === boardId) {
      setSelectedBoard(null);
    } else {
      setSelectedBoard(boardId);
    }
  };

  const handleNext = () => {
    if (!selectedBoard) {
      alert("Please select a motherboard before proceeding");
      return;
    }
    router.push("/pc-builder/cpu");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header with Navigation */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Select Motherboard
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Choose a compatible motherboard for your build
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="default"
                onClick={() => router.push("/pc-builder")}
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

      {/* Search Section */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-4 mb-8">
          <Input
            type="text"
            placeholder="Search motherboards..."
            className="flex-grow text-lg p-6"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button className="p-6" variant="outline">
            <Search className="h-6 w-6" />
          </Button>
        </div>

        {/* Listings */}
        <div className="space-y-4">
          {motherboardData.map((board) => (
            <div
              key={board.id}
              className={`flex items-center gap-6 p-6 bg-card rounded-lg border transition-all ${
                selectedBoard === board.id
                  ? "ring-2 ring-primary shadow-lg"
                  : "hover:shadow-md"
              }`}
            >
              {/* Image */}
              <div className="w-32 h-32 flex-shrink-0">
                <AnimatedFFLogo className="w-full h-full" />
              </div>

              {/* Info */}
              <div className="flex-grow">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold">{board.name}</h3>
                  {board.recommended && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    >
                      Recommended
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-2">{board.specs}</p>
              </div>

              {/* Price and Action */}
              <div className="flex flex-col items-end gap-4">
                <span className="text-2xl font-bold">${board.price}</span>
                <Button
                  variant={selectedBoard === board.id ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => handleAddReplace(board.id)}
                >
                  {selectedBoard === board.id ? (
                    <>
                      <Check className="h-4 w-4" /> Replace
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 h-4" /> Add to Build
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
