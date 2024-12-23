"use client";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Logo from "./Logo";

const pcComponents = [
  {
    title: "Processors (CPU)",
    href: "/components/cpu",
    description:
      "Latest generation processors from Intel and AMD for gaming and productivity.",
  },
  {
    title: "Graphics Cards",
    href: "/components/gpu",
    description:
      "High-performance GPUs for gaming, rendering, and computational tasks.",
  },
  {
    title: "Motherboards",
    href: "/components/motherboard",
    description:
      "Feature-rich motherboards supporting the latest CPU generations.",
  },
  {
    title: "Memory (RAM)",
    href: "/components/ram",
    description:
      "High-speed DDR4 and DDR5 memory modules for optimal performance.",
  },
  {
    title: "Storage",
    href: "/components/storage",
    description:
      "SSDs and HDDs for fast boot times and ample storage capacity.",
  },
  {
    title: "Power Supplies",
    href: "/components/psu",
    description: "Reliable and efficient power supplies for your gaming rig.",
  },
];

const builds = [
  {
    title: "Gaming PC",
    href: "/builds/gaming",
    description: "High-performance builds optimized for latest gaming titles.",
  },
  {
    title: "Workstation",
    href: "/builds/workstation",
    description:
      "Professional builds for content creation and heavy workloads.",
  },
  {
    title: "Budget Builds",
    href: "/builds/budget",
    description:
      "Cost-effective configurations without compromising performance.",
  },
];

export function Navbar() {
  return (
    <div className="w-full">
      <div className="max-w-8xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo className="h-16 w-16" />
          </Link>

          {/* Desktop Navigation Menu */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 z-100">
            <NavigationMenu>
              <NavigationMenuList className="gap-8">
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-lg font-orbitron">
                    PC Builder
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <a
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                            href="/pc-builder"
                          >
                            <Logo className="h-12 w-12" />
                            <div className="mb-2 mt-4 text-lg font-medium">
                              Start Building
                            </div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              Create your custom PC build with our interactive
                              builder. Choose from a wide range of compatible
                              components.
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <ListItem href="/guides" title="Building Guides">
                        Step-by-step guides for assembling your perfect PC.
                      </ListItem>
                      <ListItem
                        href="/compatibility"
                        title="Compatibility Checker"
                      >
                        Ensure all your chosen components work together.
                      </ListItem>
                      <ListItem href="/price-tracker" title="Price Tracker">
                        Track prices and find the best deals on components.
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-lg font-orbitron">
                    Components
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {pcComponents.map((component) => (
                        <ListItem
                          key={component.title}
                          title={component.title}
                          href={"#"}
                        >
                          {component.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="#" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "text-lg font-orbitron"
                      )}
                    >
                      Feed
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Mobile Menu */}
          <div className="lg:hidden flex items-center">
            <Sheet>
              <SheetTrigger className="p-2">
                <Menu className="h-6 w-6" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-8 pt-10">
                  <div className="flex flex-col gap-6">
                    <h3 className="text-lg font-orbitron">PC Builder</h3>
                    <div className="flex flex-col gap-4 pl-4">
                      <Link
                        href="/pc-builder"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Start Building
                      </Link>
                      <Link
                        href="/guides"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Building Guides
                      </Link>
                      <Link
                        href="/compatibility"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Compatibility Checker
                      </Link>
                      <Link
                        href="/price-tracker"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Price Tracker
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <h3 className="text-lg font-orbitron">Components</h3>
                    <div className="flex flex-col gap-4 pl-4">
                      {pcComponents.map((component) => (
                        <Link
                          key={component.title}
                          href={component.href}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {component.title}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <Link
                    href="/community"
                    className="text-lg font-orbitron hover:text-foreground transition-colors"
                  >
                    Feed
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
