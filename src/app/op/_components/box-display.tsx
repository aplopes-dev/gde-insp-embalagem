import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const BoxDisplay = ({
  name,
  description,
  displayColor = "blue",
  statusVariant = "secondary",
  statusText,
  isTarget,
  isPending,
}: {
  name: string;
  description: string;
  displayColor: "blue" | "red" | "green";
  statusVariant: "secondary" | "warning" | "destructive" | "success";
  statusText: string;
  isTarget?: boolean;
  isPending?: boolean;
}) => {
  const [bgContent, setBgContent] = useState("");

  function getStatusColor(status: string) {
    switch (status) {
      case "red":
        return "bg-red-600";
      case "green":
        return "bg-green-600";
      case "blue":
        return "bg-blue-600";
    }
  }

  useEffect(() => {
    setBgContent(getStatusColor(displayColor) || "");
  }, [displayColor]);

  return (
    <Card className="mt-2">
      <CardContent
        className={cn(
          "p-1 flex justify-between items-center",
          isTarget ? "border-4 border-blue-500" : "",
          isPending ? bgContent : ""
        )}
      >
        <div className="flex gap-8 uppercase">
          <strong>{name}</strong>
          <span>{description}</span>
        </div>
        <Badge className="xl:p-2" variant={statusVariant}>
          {statusText}
        </Badge>
      </CardContent>
    </Card>
  );
};

export default BoxDisplay;
