"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Settings2,
  Edit2,
  DownloadIcon,
  Cpu,
  MonitorIcon,
  MemoryStick,
  HardDrive,
  Box,
  Zap,
  Fan,
  Gauge,
  DollarSign,
  Percent,
  ChevronRight,
  Sparkles,
  Clock,
  Boxes,
  Waves,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePCBuilderStore } from "@/hooks/usePCBuilderStore";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { generatePDF } from "@/utils/pdfGenerator";
// Custom Bento Grid Components
const BentoGrid = ({
  className,
  children,
  id, // Add id to props
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) => {
  return (
    <div
      id={id} // Add id here
      className={cn("grid grid-cols-1 md:grid-cols-6 gap-6", className)}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  className,
  title,
  Icon,
  children,
}: {
  className?: string;
  title: string;
  Icon?: any;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-xl group/bento min-h-[200px] hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-6 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent flex flex-col",
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-neutral-500" />}
          <h3 className="font-semibold text-neutral-600 dark:text-neutral-200">
            {title}
          </h3>
        </div>
      </div>
      {children}
    </div>
  );
};

function getBadgeIcon(key: string, componentType: string) {
  switch (key) {
    case "socket":
      return <Cpu className="h-3 w-3" />;
    case "cores":
      return <Boxes className="h-3 w-3" />;
    case "speed":
    case "clock":
      return <Clock className="h-3 w-3" />;
    case "memory":
    case "modules":
      return <MemoryStick className="h-3 w-3" />;
    case "capacity":
      return <HardDrive className="h-3 w-3" />;
    case "wattage":
    case "tdp":
      return <Zap className="h-3 w-3" />;
    case "efficiency":
      return <Sparkles className="h-3 w-3" />;
    case "form":
    case "formFactor":
      return <Box className="h-3 w-3" />;
    case "noise":
      return <Waves className="h-3 w-3" />;
    default:
      return null;
  }
}

function formatSpecValue(key: string, value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.join(", ");
    return Object.values(value).join(", ");
  }
  return String(value);
}

function ComponentContent({
  component,
  route,
  formatPrice,
}: {
  component: any;
  route: string;
  formatPrice: (price: number) => string;
}) {
  const router = useRouter();

  if (!component) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full min-h-[180px] bg-secondary/5 rounded-lg cursor-pointer hover:bg-secondary/10 transition-colors"
        onClick={() => router.push(route)}
      >
        <p className="text-sm text-muted-foreground">Click to add component</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-4 relative group">
        <div className="relative w-20 h-20 bg-secondary/10 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={component.image}
            alt={component.name}
            fill
            className="object-contain"
            sizes="80px"
            crossOrigin="anonymous"
            loading="eager"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.src = "/FrameForge.png";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{component.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {formatPrice(component.price)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0"
          onClick={() => router.push(route)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {component.specifications &&
          Object.entries(component.specifications)
            .slice(0, 3)
            .map(
              ([key, value]) =>
                value && (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="bg-secondary/10 text-foreground/80 flex items-center gap-1"
                  >
                    {getBadgeIcon(key, component.type)}
                    {formatSpecValue(key, value)}
                  </Badge>
                )
            )}
      </div>
    </div>
  );
}

export default function PCComponentSummary() {
  const router = useRouter();
  const { components, budget, totalSpent, preferences } = usePCBuilderStore();
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleDownload = async () => {
    try {
      // Ensure we're capturing the exact grid element
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `PC-Build-${timestamp}.png`;

      // Pre-load all images
      const element = document.getElementById("pc-build-grid");
      if (element) {
        const images = Array.from(element.getElementsByTagName("img"));
        await Promise.all(
          images.map(
            (img) =>
              new Promise((resolve) => {
                if (img.complete) resolve(null);
                else {
                  img.onload = () => resolve(null);
                  img.onerror = () => resolve(null);
                }
              })
          )
        );
      }

      await generatePDF("pc-build-grid", filename);
    } catch (error) {
      console.error("Error capturing grid:", error);
    }
  };

  const percentageUsed = Math.round((totalSpent / budget) * 100);
  const componentsCount = Object.values(components).filter(
    (comp) => comp !== null
  ).length;

  const gridItems = [
    {
      className: "col-span-6",
      title: "Build Overview",
      Icon: Gauge,
      component: null,
      content: (
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <DollarSign className="h-8 w-8 mx-auto text-primary" />
            <p className="text-xl font-semibold">{formatPrice(totalSpent)}</p>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </div>
          <div className="text-center">
            <Percent className="h-8 w-8 mx-auto text-primary" />
            <p className="text-xl font-semibold">{percentageUsed}%</p>
            <p className="text-sm text-muted-foreground">Budget Used</p>
          </div>
          <div className="text-center">
            <Box className="h-8 w-8 mx-auto text-primary" />
            <p className="text-xl font-semibold">{componentsCount}/8</p>
            <p className="text-sm text-muted-foreground">Components</p>
          </div>
        </div>
      ),
    },
    {
      className: "col-span-3",
      title: "CPU",
      Icon: Cpu,
      component: components.cpu,
      route: "/pc-builder/cpu",
    },
    {
      className: "col-span-3",
      title: "Graphics Card",
      Icon: MonitorIcon,
      component: components.gpu,
      route: "/pc-builder/gpu",
    },
    {
      className: "col-span-2",
      title: "Motherboard",
      Icon: Settings2,
      component: components.motherboard,
      route: "/pc-builder/motherboard",
    },
    {
      className: "col-span-2",
      title: "Memory",
      Icon: MemoryStick,
      component: components.memory,
      route: "/pc-builder/memory",
    },
    {
      className: "col-span-2",
      title: "Storage",
      Icon: HardDrive,
      component: components.storage,
      route: "/pc-builder/storage",
    },
    {
      className: "col-span-2",
      title: "Case",
      Icon: Box,
      component: components.case,
      route: "/pc-builder/case",
    },
    {
      className: "col-span-2",
      title: "Power Supply",
      Icon: Zap,
      component: components.psu,
      route: "/pc-builder/psu",
    },
    {
      className: "col-span-2",
      title: "CPU Cooler",
      Icon: Fan,
      component: components.cpuCooler,
      route: "/pc-builder/cooler",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your PC Build</h1>
            <p className="text-muted-foreground">
              {formatPrice(totalSpent)} of {formatPrice(budget)} Budget
            </p>
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-black text-white"
            onClick={handleDownload}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
            {isGeneratingPDF ? "Generating..." : "Download"}
          </Button>
        </div>

        <BentoGrid id="pc-build-grid">
          {" "}
          {/* Make sure this ID is added */}
          {gridItems.map((item, idx) => (
            <BentoCard
              key={idx}
              className={cn(item.className)}
              title={item.title}
              Icon={item.Icon}
            >
              {item.content ? (
                item.content
              ) : (
                <ComponentContent
                  component={item.component}
                  route={item.route}
                  formatPrice={formatPrice}
                />
              )}
            </BentoCard>
          ))}
        </BentoGrid>
      </div>
    </div>
  );
}
