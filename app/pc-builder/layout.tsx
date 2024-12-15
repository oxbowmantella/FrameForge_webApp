"use client";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const totalBudget = 3500;
  const usedBudget = 1405;
  const budgetPercentage = (usedBudget / totalBudget) * 100;

  // Reset GIF animation when route changes
  useEffect(() => {
    setGifKey((prev) => prev + 1);
  }, [pathname]);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-background p-10">
      {/* Left Section - 4/5 width */}
      <div className="w-4/5 h-full p-6 flex flex-col">
        {/* Top Section with Gif and Text */}
        <div className="flex items-center gap-6 p-4 bg-secondary/20 rounded-lg mb-6">
          <div className="w-16 h-16 relative">
            <Image
              key={gifKey} // Add key to force remount
              src="/mascot.gif"
              alt="Mascot"
              fill
              className="object-contain"
              priority // Ensure immediate loading
            />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Build Your Dream PC</h2>
            <p className="text-muted-foreground">
              Select your components carefully to create the perfect battle
              station. Our AI will guide you through the process to ensure
              compatibility and optimal performance.
            </p>
          </div>
        </div>

        {/* Component Selection Area - Will render child routes */}
        <div className="flex-1 bg-secondary/10 rounded-lg p-6">{children}</div>
      </div>

      {/* Right Section - 1/5 width */}
      <div className="w-1/5 h-full">
        <Card className="h-full">
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Budget</span>
                <span className="text-sm font-medium">
                  ${usedBudget} / ${totalBudget}
                </span>
              </div>
              <Progress value={budgetPercentage} className="h-2" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-4">
                {dummyParts.map((part, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-secondary/10 rounded-lg hover:bg-zinc-100"
                  >
                    <div className="relative w-12 h-12">
                      <Image
                        src={part.image}
                        alt={part.name}
                        fill
                        className="object-contain rounded-md"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {part.category}
                      </p>
                      <p className="text-sm font-medium truncate">
                        {part.name}
                      </p>
                      <p className="text-sm font-bold text-primary">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
