"use client";

import Header from "@/app/_components/header";
import ConfirmationDialog from "@/components/confirmation-dialog";
import { toast } from "@/components/ui/use-toast";
import { ObjectValidation } from "@/types/validation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import BlisterDisplay from "../_components/blister-display";
import BoxDisplay from "../_components/box-display";
import OpDisplay from "../_components/op-display";
import {
  OpBoxBlisterInspection,
  OpBoxInspectionDto,
  OpInspectionDto,
} from "../types/op-box-inspection-dto";
import {
  persistBoxStatusWithBlisters,
  syncAndGetOpToProduceByCode,
} from "./actions";

export default function PackagingInspection({
  params: { code },
}: {
  params: {
    code: string;
  };
}) {
  const [data, setData] = useState<OpInspectionDto>();
  const [displayMessage, setDisplayMessage] = useState("");
  const [message, setMessage] = useState<ObjectValidation>();
  const [step, setStep] = useState(0); // 0 - box, 1 - blister, 2 - quantity, 3 - print
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);

  const [targetBlister, setTargetBlister] = useState<number>();

  const [quantityInBox, setQuantityInBox] = useState<number>(0);
  const [checkedQuantity, setCheckedQuantity] = useState<number>(0);
  const [box, setBox] = useState<OpBoxInspectionDto>();
  const [blisters, setBlisters] = useState<OpBoxBlisterInspection[]>([]);
  const [displayColor, setDisplayColor] = useState<"blue" | "red" | "green">(
    "blue"
  );

  const loadData = async () => {
    const opData = await syncAndGetOpToProduceByCode(code);
    setData(opData);
    if (opData.nextBox?.OpBoxBlister) {
      setBlisters(opData.nextBox?.OpBoxBlister);
      const itemQuantity = opData.nextBox.OpBoxBlister.reduce(
        (total, blister) => total + blister.quantity,
        0
      );
      const checkQuantity =
        opData.nextBox.OpBoxBlister?.filter((bl) => bl.packedAt).reduce(
          (total, blister) => total + blister.quantity,
          0
        ) || 0;
      setQuantityInBox(itemQuantity);
      setCheckedQuantity(checkQuantity);
      delete opData["nextBox"]["OpBoxBlister"];
      setBox(opData.nextBox);
    }
  };

  // useEffect(() => {
  //   loadData().catch((err: Error) => {
  //     console.log(err);
  //     toast({
  //       title: "Erro",
  //       description: err.message,
  //       variant: "destructive",
  //     });
  //   });
  // }, []);

  useEffect(() => {
    let socket: any;
    loadData()
      .then((_) => {
        socket = io("http://localhost:3001");
        socket.on("notifyUser", (message: any) => {
          setMessage(message);
        });
      })
      .catch((err: Error) => {
        console.log(err);
        toast({
          title: "Erro",
          description: err.message,
          variant: "destructive",
        });
      });
    return () => {
      socket?.off("notifyUser");
      socket?.disconnect();
    };
  }, []);
  // }, [data]);

  useEffect(() => {
    if (message)
      switch (step) {
        case 0:
          inspectBox(message);
          break;
        case 1:
          inspectBlister(message);
          break;
        case 2:
          inspectQuantity(message);
          break;
      }
  }, [message]);

  function inspectBox(message: ObjectValidation) {
    if (message.type == "box") {
      console.log(data);
      if (message.code == `${data?.boxType?.id}`) {
        setStep(1);
        box &&
          setBox({
            ...box,
            status: 1,
          });
        setTargetBlister(0);
        setDisplayMessage("Caixa válida");
        setDisplayColor("green");
      } else {
        setDisplayMessage("Modelo de caixa inválido.");
        setDisplayColor("blue");
      }
    } else {
      setDisplayMessage("Tipo de objeto inválido. Insira uma caixa.");
      setDisplayColor("red");
    }
  }

  function inspectQuantity(message: ObjectValidation) {
    if (message.type == "product") {
      //TODO: Consider that the last blister may have different amounts
      const pendingQuantity = quantityInBox - checkedQuantity;
      if (
        (message.count == data!.blisterType.slots &&
          message.count <= pendingQuantity) ||
        message.count == pendingQuantity
      ) {
        setDisplayMessage("Blister válido");
        setDisplayColor("green");
        const index = targetBlister || 0;
        if (blisters[index + 1]) {
          setTargetBlister(index + 1);
          setStep(1);
        } else {
          setTargetBlister(undefined);
          setStep(3);
          setOpenConfirmDialog(true);
        }
        setCheckedQuantity(checkedQuantity + message.count);
        setBlisters(
          blisters.map((bl, i) =>
            i == index
              ? {
                  ...bl,
                  isValidQuantity: true,
                  status: 1,
                  packedAt: new Date(),
                }
              : bl
          )
        );
      } else {
        setDisplayMessage("Quantidade de itens incorreta.");
        setDisplayColor("blue");
      }
    } else {
      setDisplayMessage("Tipo de objeto inválido. Insira produtos.");
      setDisplayColor("red");
    }
  }

  function inspectBlister(message: ObjectValidation) {
    if (message.type == "blister") {
      if (message.code == `${data?.blisterType.id}`) {
        setDisplayMessage("Blister válido");
        setDisplayColor("green");
        const index = targetBlister || 0;
        setBlisters(
          blisters.map((bl, i) =>
            i == index ? { ...bl, isValidItem: true } : bl
          )
        );
        setStep(2);
      } else {
        setDisplayMessage("Modelo de blister inválido.");
        setDisplayColor("blue");
      }
    } else {
      setDisplayMessage("Tipo de objeto inválido. Insira um blister.");
      setDisplayColor("red");
    }
  }

  async function persistBoxInspection() {
    if (box) {
      await persistBoxStatusWithBlisters(
        box,
        blisters,
        data!.opId,
        data?.pendingBoxes == 1
      )
        .then((_) => {
          toast({
            title: "Sucesso",
            description: "Inspeção de caixa finalizada com sucesso!",
          });
        })
        .catch((err) => {
          console.log(err);
          toast({
            title: "Erro",
            description: err.message,
            variant: "destructive",
          });
        });
      await loadData();
      setStep(0);
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

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="flex justify-center">
        {data && (
          <div className="m-2 lg:m-4 xl:m-6 exl:m-10 w-full exl:w-[80%] flex flex-col gap-8">
            <OpDisplay
              code={data.opCode}
              boxesCount={data.totalBoxes}
              boxesPacked={data.totalBoxes - data.pendingBoxes}
              displayMessage={displayMessage}
              displayColor={displayColor}
              statusMessage={getStatusName(data?.status) || ""}
              statusVariant={getStatusVariant(data?.status) || "secondary"}
              startDate={data?.createdAt || new Date()}
              endDate={data?.finishedAt}
            />
            <div>
              <h3 className="font-bold uppercase">Caixa</h3>
              <BoxDisplay
                name="CX202"
                isTarget={step == 0}
                description="20x40x20cm"
                displayColor="blue"
                statusText={getStatusName(box?.status) || ""}
                statusVariant={getStatusVariant(box?.status) || "secondary"}
              />
            </div>
            <div>
              <div className="flex gap-4">
                <div>
                  <strong>Blister:</strong> {data.blisterType.name}
                </div>
                <div>
                  <strong>Item:</strong> {data.productType.name}
                </div>
                <div>
                  <strong>Quantidade na Caixa:</strong> {quantityInBox}
                </div>
                <div>
                  <strong>Quantidade verificada:</strong> {checkedQuantity}
                  {/* <strong>Quantidade verificada:</strong> {verifiedQuantity} */}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold uppercase">Embalagem</h3>
              <BlisterDisplay blisters={blisters} targetIndex={targetBlister} />
            </div>
          </div>
        )}
      </div>
      <ConfirmationDialog
        title="Confirmação"
        message="Deseja confirmar a inspeção e imprimir aetiqueta?"
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
        confirmationAction={persistBoxInspection}
        onOpenChange={setOpenConfirmDialog}
        open={openConfirmDialog}
      />
    </div>
  );
}
