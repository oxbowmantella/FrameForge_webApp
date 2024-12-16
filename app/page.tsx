"use client";
import { AnimatedFFLogo } from "@/components/AnimatedFFLogo";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const handleSignIn = async () => {
    router.push("/pc-builder");
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center bg-background px-4 overflow-x-hidden">
      <div className="w-full max-w-[1400px] mx-auto">
        <div className="flex min-h-[calc(100vh-80px)] flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 py-6 lg:py-16">
          <motion.div
            className="w-full max-w-[300px] sm:max-w-[400px] lg:max-w-none lg:w-auto lg:flex-grow flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
              scale: {
                type: "spring",
                stiffness: 300,
                damping: 20,
              },
            }}
          >
            <AnimatedFFLogo className="w-full h-full" />
          </motion.div>

          <motion.div
            className="flex flex-col items-center lg:items-start justify-center gap-6 lg:gap-8 w-full lg:max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex flex-col items-center lg:items-start gap-4 w-full">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground text-center lg:text-left tracking-tight">
                FrameForge
              </h1>
              <p className="text-base sm:text-lg lg:text-2xl text-muted-foreground text-center lg:text-left max-w-[90%] sm:max-w-none">
                Build your Dream Battle Station aided by our custom AI.
              </p>
            </div>

            <div className="flex flex-col items-center lg:items-start gap-4 w-full">
              <motion.div
                className="w-full sm:max-w-md lg:max-w-none"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={handleSignIn}
                  variant="outline"
                  size="lg"
                  className="w-full lg:w-auto px-6 py-6 lg:px-16 bg-black text-white dark:bg-white dark:text-black text-lg sm:text-xl font-medium"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Initiating Battle station build process..."
                    : "Start Building"}
                </Button>
              </motion.div>
              <p className="text-sm sm:text-base lg:text-lg text-center lg:text-left text-muted-foreground px-4 sm:px-0">
                No credit card required. Click the button above to get started.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
