import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { OpBoxBlisterInspection } from "../types/op-box-inspection-dto";

function getStatusColor(status?: number) {
  switch (status) {
    case 0:
      return "gray";
    case 1:
      return "green";
    case 2:
      return "red";
    default:
      return "gray";
  }
}

function getStatusVariant(status?: number) {
  switch (status) {
    case 0:
      return "secondary";
    case 1:
      return "success";
    case 3:
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusName(status?: number) {
  switch (status) {
    case 0:
      return "Pendente";
    case 1:
      return "Aprovado";
    case 3:
      return "Reprovado";
    default:
      return "Pendente";
  }
}

const BlisterDisplay = ({
  blisters,
  targetIndex,
}: {
  blisters: OpBoxBlisterInspection[];
  targetIndex?: number;
}) => {
  return (
    <div className="flex flex-col">
      <Table>
        <TableHeader>
          <TableRow className="h-8">
            <TableHead className="w-[12.5%]">Ordem</TableHead>
            <TableHead className="w-[25%]">Blister</TableHead>
            <TableHead className="w-[25%]">Item</TableHead>
            <TableHead className="w-[25%]">Quantidade</TableHead>
            <TableHead className="w-[12.5%] text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blisters.map((data, index) => (
            <TableRow
              className={cn(
                `bg-${getStatusColor(data.status)}-300/20`,
                targetIndex == index ? "border-4 border-blue-500" : ""
              )}
              key={data.id}
            >
              <TableCell>{data.id}</TableCell>
              <TableCell
                className={
                  targetIndex == index && data.isValidItem
                    ? `bg-green-300/20`
                    : ""
                }
              >
                BLF042
              </TableCell>
              <TableCell
                className={
                  targetIndex == index && data.isValidQuantity
                    ? `bg-green-300/20`
                    : ""
                }
              >
                L-FSD-LE-042
              </TableCell>
              <TableCell
                className={
                  targetIndex == index && data.isValidQuantity
                    ? `bg-green-300/20`
                    : ""
                }
              >
                {data.quantity}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={getStatusVariant(data.status)}>
                  {getStatusName(data.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={5}></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default BlisterDisplay;
