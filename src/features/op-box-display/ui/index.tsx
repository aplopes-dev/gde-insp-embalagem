import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/shared/utils/tw-merge";
import { InspectionStatus } from "@/types/op-box-inspection-dto";

const BoxInspectionDisplay = ({
  name,
  description,
  status,
  isTarget,
}: {
  name: string;
  description: string;
  isTarget?: boolean;
  status?: InspectionStatus;
}) => {
  function getOpBoxStatusBadge(status: InspectionStatus) {
    let label;
    let variant: "secondary" | "success" = "secondary";
    switch (status) {
      case InspectionStatus.VALID:
        label = "Validado";
        variant = "success";
        break;
      case InspectionStatus.PENDING:
        label = "Pendente";
        break;
    }
    console.log("status");
    console.log(status);

    return (
      <Badge className="xl:p-2" variant={variant}>
        {label}
      </Badge>
    );
  }

  return (
    <Card className="mt-2">
      <CardContent
        className={cn(
          "p-1 flex justify-between items-center",
          isTarget ? "border-4 border-blue-500" : ""
        )}
      >
        <div className="flex gap-8 uppercase">
          <strong>{name}</strong>
          <span>{description}</span>
        </div>
        {(status || status === InspectionStatus.PENDING) &&
          getOpBoxStatusBadge(status)}
      </CardContent>
    </Card>
  );
};

export default BoxInspectionDisplay;
