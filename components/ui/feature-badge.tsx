import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LucideIcon } from "lucide-react";

interface FeatureBadgeProps {
  icon?: LucideIcon;
  text: string;
  variant?: "outline" | "default" | "secondary";
}

export const FeatureBadge = ({
  icon: Icon,
  text,
  variant = "outline",
}: FeatureBadgeProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant={variant}
            className="flex items-center gap-1 px-3 py-1 cursor-help"
          >
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
};
