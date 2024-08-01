import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ops = [
  {
    codigo: 421551,
    data: "16/06/24 - 14:36PM",
    dataEmbalagem: "17/06/24 - 10:14AM",
    peca: "LD3211",
    quantidade: 100,
    cliente: "ASCAR DO BRASIL - LTDA",
    status: "FINALIZED",
  },
  {
    codigo: 421552,
    data: "16/06/24 - 14:36PM",
    dataEmbalagem: "17/06/24 - 10:14AM",
    peca: "LD3211",
    quantidade: 100,
    cliente: "ASCAR DO BRASIL - LTDA",
    status: "FINALIZED",
  },
  {
    codigo: 421553,
    data: "16/06/24 - 14:36PM",
    dataEmbalagem: "17/06/24 - 10:14AM",
    peca: "LD3211",
    quantidade: 100,
    cliente: "ASCAR DO BRASIL - LTDA",
    status: "FINALIZED",
  },
  {
    codigo: 421554,
    data: "16/06/24 - 14:36PM",
    dataEmbalagem: "17/06/24 - 10:14AM",
    peca: "LD3211",
    quantidade: 100,
    cliente: "ASCAR DO BRASIL - LTDA",
    status: "WITH_BREAK",
  },
  {
    codigo: 421555,
    data: "16/06/24 - 14:36PM",
    dataEmbalagem: "17/06/24 - 10:14AM",
    peca: "LD3211",
    quantidade: 100,
    cliente: "ASCAR DO BRASIL - LTDA",
    status: "FINALIZED",
  },
  {
    codigo: 421556,
    data: "16/06/24 - 14:36PM",
    dataEmbalagem: "17/06/24 - 10:14AM",
    peca: "LD3211",
    quantidade: 100,
    cliente: "ASCAR DO BRASIL - LTDA",
    status: "FINALIZED",
  },
  {
    codigo: 421557,
    data: "16/06/24 - 14:36PM",
    dataEmbalagem: "17/06/24 - 10:14AM",
    peca: "LD3211",
    quantidade: 100,
    cliente: "ASCAR DO BRASIL - LTDA",
    status: "WITH_BREAK",
  },
  {
    codigo: 421558,
    data: "16/06/24 - 14:36PM",
    dataEmbalagem: "17/06/24 - 10:14AM",
    peca: "LD3211",
    quantidade: 100,
    cliente: "ASCAR DO BRASIL - LTDA",
    status: "FINALIZED",
  },
  {
    codigo: 421559,
    data: "16/06/24 - 14:36PM",
    dataEmbalagem: "17/06/24 - 10:14AM",
    peca: "LD3211",
    quantidade: 100,
    cliente: "ASCAR DO BRASIL - LTDA",
    status: "FINALIZED",
  },
  {
    codigo: 421560,
    data: "16/06/24 - 14:36PM",
    dataEmbalagem: "17/06/24 - 10:14AM",
    peca: "LD3211",
    quantidade: 100,
    cliente: "ASCAR DO BRASIL - LTDA",
    status: "FINALIZED",
  },
];

export default function DailyOpList() {
  return (
    <Table className="text-sm lg:text-xl">
      <TableHeader className="sticky top-[-1px] bg-secondary">
        <TableRow>
          <TableHead className="w-[10%]">Código</TableHead>
          <TableHead className="w-[20%]">Criação da OP</TableHead>
          <TableHead className="w-[20%]">Embalagem</TableHead>
          <TableHead className="w-[10%]">Peça</TableHead>
          <TableHead className="w-[10%]">Quantidade</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ops.map((data) => (
          <TableRow
            className={
              data.status == "FINALIZED" ? "bg-green-300/20" : "bg-red-300/20"
            }
            key={data.codigo}
          >
            <TableCell>{data.codigo}</TableCell>
            <TableCell>{data.data}</TableCell>
            <TableCell>{data.dataEmbalagem}</TableCell>
            <TableCell>{data.peca}</TableCell>
            <TableCell>{data.quantidade}</TableCell>
            <TableCell>{data.cliente}</TableCell>
            <TableCell className="text-right">
              {data.status == "FINALIZED" ? (
                <Badge className="xl:text-3xl xl:p-2" variant="success">
                  Finalizada
                </Badge>
              ) : (
                <Badge className="xl:text-3xl xl:p-2" variant="destructive">
                  Com quebra
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
