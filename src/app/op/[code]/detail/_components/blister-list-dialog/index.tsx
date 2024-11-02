import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OpBox, OpBoxBlister } from "@prisma/client";
import { useEffect, useState } from "react";
import { getOpBoxWithBlistersById } from "../../actions";

type BlisterListDialogProps = {
  activeKey: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const BlisterListDialog = ({
  activeKey,
  isOpen,
  onOpenChange,
}: BlisterListDialogProps) => {
  const [data, setData] = useState<OpBox & { OpBoxBlister: OpBoxBlister[] }>();

  const loadData = async () => {
    const opData = await getOpBoxWithBlistersById(activeKey);
    opData && setData(opData);
  };

  useEffect(() => {
    if (isOpen) {
      setData(undefined);
      loadData();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Caixa</DialogTitle>
          <DialogDescription>
            Código: <strong>{data?.code}</strong>
          </DialogDescription>
        </DialogHeader>
        {data && (
          <Table>
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="w-[50%]">Blister</TableHead>
                <TableHead className="w-[50%]">Quantidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.OpBoxBlister.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BlisterListDialog;
