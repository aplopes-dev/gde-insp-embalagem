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
    <div className="flex flex-col max-h-full overflow-y-auto">
      <Table className="table-fixed w-full">
        {/* 🔹 Cabeçalho fixo no topo */}
        <TableHeader className="sticky top-0 z-10 bg-white shadow-md">
          <TableRow className="h-8">
            <TableHead className="w-[12.5%]">Ordem</TableHead>
            <TableHead className="w-[25%]">Blister</TableHead>
            <TableHead className="w-[25%]">Item</TableHead>
            <TableHead className="w-[25%]">Quantidade</TableHead>
            <TableHead className="w-[12.5%] text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Linha selecionada duplicada no topo */}
          {targetIndex !== undefined && (
            <TableRow
              className={cn(
                `border-4 border-blue-500 bg-${getStatusColor(blisters[targetIndex].status)}-300/20`
              )}
            >
              <TableCell>{targetIndex + 1}</TableCell>
              <TableCell className={blisters[targetIndex].isValidItem ? "bg-green-300/20" : ""}>
                {blisterName}
              </TableCell>
              <TableCell className={blisters[targetIndex].isValidQuantity ? "bg-green-300/20" : ""}>
                {itemName}
              </TableCell>
              <TableCell className={blisters[targetIndex].isValidQuantity ? "bg-green-300/20" : ""}>
                {blisters[targetIndex].quantity}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={getStatusVariant(blisters[targetIndex].status)}>
                  {getStatusName(blisters[targetIndex].status)}
                </Badge>
              </TableCell>
            </TableRow>
          )}

          {/* Linhas normais da tabela */}
          {blisters.map((data, index) => (
            <TableRow
              key={data.id}
              className={cn(
                `bg-${getStatusColor(data.status)}-300/20`,
                targetIndex === index ? "hidden" : ""
              )}
            >
              <TableCell>{index + 1}</TableCell>
              <TableCell className={data.isValidItem ? "bg-green-300/20" : ""}>
                {blisterName}
              </TableCell>
              <TableCell className={data.isValidQuantity ? "bg-green-300/20" : ""}>
                {itemName}
              </TableCell>
              <TableCell className={data.isValidQuantity ? "bg-green-300/20" : ""}>
                {data.quantity}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={getStatusVariant(data.status)}>
                  {getStatusName(data.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};



export default BlisterDisplay;
