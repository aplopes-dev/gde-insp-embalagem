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
    case 1:
      return "success";
    default:
      return "secondary";
  }
}

function getStatusName(status?: number) {
  switch (status) {
    case 1:
      return "Aprovado";
    default:
      return "Pendente";
  }
}

const BlisterDisplay = ({
  blisters,
  targetIndex,
  blisterName,
  itemName,
}: {
  blisters: OpBoxBlisterInspection[];
  targetIndex?: number;
  blisterName: string;
  itemName: string;
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
              <TableCell>{index + 1}</TableCell>
              <TableCell
                className={
                  targetIndex == index && data.isValidItem
                    ? `bg-green-300/20`
                    : ""
                }
              >
                {blisterName}
              </TableCell>
              <TableCell
                className={
                  targetIndex == index && data.isValidQuantity
                    ? `bg-green-300/20`
                    : ""
                }
              >
                {itemName}
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
