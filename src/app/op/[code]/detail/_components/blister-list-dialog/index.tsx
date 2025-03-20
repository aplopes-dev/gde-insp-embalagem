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
import Image from "next/image";
import { useEffect, useState } from "react";
import RePrintTagDialog from "../../../_components/reprint-tag-dialog";
import { getOpBoxWithBlistersById } from "../../actions";
import { Button } from "@/components/ui/button";

const ImageModal = ({
  imageSrc,
  isOpen,
  onClose,
}: {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal>
      <DialogContent className="p-0 w-[1024px] h-[800px] flex items-center">
        <Image src={imageSrc} alt="Imagem ampliada" width={1024} height={800} />
      </DialogContent>
    </Dialog>
  );
};

type BlisterListDialogProps = {
  activeKey: number;
  isOpen: boolean;
  opCode: string;
  onOpenChange: (open: boolean) => void;
};

const BlisterListDialog = ({
  activeKey,
  isOpen,
  opCode,
  onOpenChange,
}: BlisterListDialogProps) => {
  const [data, setData] = useState<any>();
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [reprintOpen, setReprintOpen] = useState(false);
  const [boxQuantity, setBoxQuantity] = useState(0);

  const loadData = async () => {
    const opData = await getOpBoxWithBlistersById(activeKey);
    const qtd = opData?.OpBoxBlister.reduce((acc, i) => acc + i.quantity, 0) || 0;
    setBoxQuantity(qtd)
    console.log(opData);

    opData && setData(opData);
  };

  useEffect(() => {
    if (isOpen) {
      setData(undefined);
      loadData();
    }
  }, [isOpen]);

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    setImageModalOpen(true);
  };

  const formatDateISO = (date: Date) => {
    // Convert the date to ISO string
    const isoString = date.toISOString();
    // Split at the "T" character to get the date part
    const formattedDate = isoString.split("T")[0];
    return formattedDate;
  };

  function getImageBoxIndex(boxCode: string) {
    const imageBoxIndex = (boxCode as string).split("_")[0]
    return imageBoxIndex
  }

  function getPrintBoxCode(boxCode: string) {
    const imageBoxIndex = (boxCode as string)?.split("_")[1]
    return imageBoxIndex
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Caixa</DialogTitle>
            <DialogDescription>
              Código: <strong>{data?.packedAt ? getPrintBoxCode(data?.code) : data?.code}</strong>
              {data?.packedAt && <Button className="ml-2" onClick={() => setReprintOpen(true)}>Reimprimir</Button>}
            </DialogDescription>
          </DialogHeader>
          {data && (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="w-[50%]">Imagem</TableHead>
                    <TableHead className="w-[50%]">Blister</TableHead>
                    <TableHead className="w-[50%]">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.OpBoxBlister.map((item: any, index: number) => {

                    return <TableRow key={item.id}>
                      <TableCell>
                        {data.packedAt && <Image
                          width={100}
                          height={50}
                          src={`/api/images/OP_${opCode}_BOX_${getImageBoxIndex(data.code)}_BL_${item.code
                            }.jpg?path=${formatDateISO(data.packedAt!)}`}
                          alt="GDE"
                          className="cursor-pointer"
                          onClick={() =>
                            handleImageClick(
                              `/api/images/OP_${opCode}_BOX_${getImageBoxIndex(data.code)}_BL_${item.code
                              }.jpg?path=${formatDateISO(data.packedAt!)}`
                            )
                          }
                        />}
                      </TableCell>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                    </TableRow>
                  })}
                </TableBody>
              </Table>
              <RePrintTagDialog
                isOpen={reprintOpen}
                onOpenChange={setReprintOpen}
                batchCode={data.op.code}
                itemDescription={data.op.product.description}
                itemName={data.op.product.code}
                printConfig={{
                  quantity: boxQuantity,
                  barcode: getPrintBoxCode(data.code),
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <ImageModal
        imageSrc={selectedImage}
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
      />
    </>
  );
};

export default BlisterListDialog;
