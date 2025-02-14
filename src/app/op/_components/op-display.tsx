import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OpDisplayProps = {
  code: string;
  boxesPacked: number;
  boxesCount: number;
  itemsPacked: number;
  itemsCount: number;
  statusMessage: string;
  statusVariant: "secondary" | "warning" | "destructive" | "success";
  displayMessage: string;
  displayColor: "blue" | "red" | "green";
  startDate: Date;
  endDate?: Date;
};

const OpDisplay = ({
  code,
  boxesPacked,
  boxesCount,
  itemsPacked,
  itemsCount,
  statusMessage,
  statusVariant,
  displayMessage,
  displayColor,
  startDate,
  endDate,
}: OpDisplayProps) => {
  return (
    <div className="flex md:gap-6 items-stretch flex-wrap text-sm xl:text-xl exl:text-2xl">
      <div className="flex flex-col p-1 gap-2 uppercase w-1/2 md:w-auto">
        <div className="font-bold">
          <span className="mr-1">Código da OP:</span>
          <span className="text-blue-600">{code}</span>
        </div>
        <div className="font-bold">
          <span className="font-bold mr-1">Itens:</span>
          <span className="text-blue-600">
            {itemsPacked || 0} / {itemsCount}
          </span>
        </div>
        <div className="font-bold">
          <span className="mr-1">Caixas:</span>
          <span className="text-blue-600">
            {boxesPacked || 0} / {boxesCount}
          </span>
        </div>
      </div>
      <div
        className={cn(
          "text-white font-bold text-lg lg:text-2xl flex-auto w-full md:w-auto h-16 md:h-28 flex justify-center items-center order-last md:order-none mt-6 md:mt-0 bg-blue-600",
          "bg-" + displayColor + "-600"
        )}
      >
        {displayMessage}
      </div>
      <div className="flex flex-col items-end p-1 gap-2 uppercase w-1/2 md:w-auto">
        <div>
          <span className="font-bold mr-1">Início:</span>
          <span>
            {startDate.toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <div>
          <span className="font-bold mr-1">Fim:</span>
          <span>
            {endDate?.toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
            }) || "-"}
          </span>
        </div>
        <div>
          <span className="font-bold mr-1">Status:</span>
          <Badge variant={statusVariant}>{statusMessage}</Badge>
        </div>
      </div>
    </div>
  );
};

export default OpDisplay;
