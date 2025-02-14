"use client"

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function LoadingContent({
  loading,
  className,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {loading && (
        <div className="absolute w-full h-full flex justify-center items-center z-10">
          <Loader2 className="h-24 w-24 animate-spin" />
        </div>
      )}
      <div className={cn(loading && "opacity-50")}>{children}</div>
    </div>
  );
}
