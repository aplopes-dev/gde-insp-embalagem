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
import Image from "next/image";

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
        <Image
          src={imageSrc}
          alt="Imagem ampliada"
          width={1024}
          height={800}
        />
      </DialogContent>
    </Dialog>
  );
};

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
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

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

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    setImageModalOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
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
                  <TableHead className="w-[50%]">Imagem</TableHead>
                  <TableHead className="w-[50%]">Blister</TableHead>
                  <TableHead className="w-[50%]">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.OpBoxBlister.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Image
                        width={100}
                        height={50}
                        src={`/images/BLISTERS/${data.code}_BL_${item.code}.jpg`}
                        alt="GDE"
                        className="cursor-pointer"
                        onClick={() =>
                          handleImageClick(
                            `/images/BLISTERS/${data.code}_BL_${item.code}.jpg`
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
