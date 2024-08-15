import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  return (
    <div>
      <h3 className="font-bold uppercase">Caixa</h3>
      <Card className="mt-2">
        <CardContent
          className={cn(
            "p-1 flex justify-between items-center",
            isTarget ? "border-4 border-blue-500" : "",
            isPending ? `bg-${displayColor}-300/20` : ""
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
    </div>
  );
};

export default BoxDisplay;
