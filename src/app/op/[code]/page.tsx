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
  finalizeAndRemovePendingRelationsByOpCode,
  persistBoxStatusWithBlisters,
  persistWithOpBreak,
  syncAndGetOpToProduceByCode,
} from "./actions";
import { Button } from "@/components/ui/button";

export default function PackagingInspection({
  params: { code },
}: {
  params: {
    code: string;
  };
}) {
  const [data, setData] = useState<OpInspectionDto>();
  const [displayMessage, setDisplayMessage] = useState("");
  const [inspection, setInspection] = useState<ObjectValidation>();
  const [step, setStep] = useState(0); // 0 - box, 1 - blister, 2 - quantity, 3 - print
  const [openRestartDialog, setOpenRestartDialog] = useState<boolean>(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);
  const [openForceFinalizationDialog, setOpenForceFinalizationDialog] =
    useState<boolean>(false);

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
    setDisplayColor("blue");
    if (opData.finishedAt) {
      setDisplayMessage("OP Finalizada");
    } else if (opData.nextBox?.OpBoxBlister) {
      setDisplayMessage("");
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

  useEffect(() => {
    let socket: any;
    loadData()
      .then((_) => {
        socket = io("http://localhost:3001");
        socket.on("notifyUser", (message: any) => {
          setInspection(message);
          console.log(message);
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

  useEffect(() => {
    if (!data?.finishedAt && inspection)
      switch (step) {
        case 0:
          inspectBox(inspection);
          break;
        case 1:
          inspectBlister(inspection);
          break;
        case 2:
          inspectQuantity(inspection);
          break;
      }
  }, [inspection]);

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
      await printTag();
      await reload();
    }
  }

  async function reload() {
    await loadData();
    setTargetBlister(undefined);
    setStep(0);
  }

  async function printTag() {
    toast({
      title: "Informação",
      description: "Imprimindo etiqueta",
    });
  }

  async function forceOpFinalization() {
    const issetPackedBlister = blisters.find((bl) => bl.packedAt);
    const boxesPacked = Number(data?.totalBoxes) - Number(data?.pendingBoxes);

    if (boxesPacked == 0) {
      const issetValidBLister = blisters.find((bl) => bl.status == 1);
      if (box?.status != 1 || !issetValidBLister) {
        toast({
          title: "Erro",
          variant: "destructive",
          description:
            "Não é possível finalizar a operação, pois não há itens embalados",
        });
      } else {
        //TODO: Persist box, partial blisters and remove pending
        await persistWithOpBreak(box, blisters, data!.opId)
          .then((_) => {
            toast({
              title: "Sucesso",
              description: "OP finalizada com sucesso!",
            });
          })
          .catch((err) => {
            toast({
              title: "Erro",
              description: err.message,
              variant: "destructive",
            });
          });
        await reload();
      }
    } else {
      if (box?.status == 0) {
        await finalizeAndRemovePendingRelationsByOpCode(data!.opId)
          .then((_) => {
            toast({
              title: "Sucesso",
              description: "OP finalizada com sucesso!",
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
        await reload();
      } else if (box?.status == 1 && !issetPackedBlister) {
        toast({
          title: "Erro",
          variant: "destructive",
          description: "A caixa está vazia, insira ao menos um blister!",
        });
      } else {
        //TODO: Persist box, partial blisters and remove pending
        await persistWithOpBreak(box!, blisters, data!.opId)
          .then((_) => {
            toast({
              title: "Sucesso",
              description: "OP finalizada com sucesso!",
            });
          })
          .catch((err) => {
            toast({
              title: "Erro",
              description: err.message,
              variant: "destructive",
            });
          });
        await reload();
      }
    }
  }

  function getStatusVariant(status?: number) {
    switch (status) {
      case 1:
        return "success";
      case 2:
        return "destructive";
      default:
        return "secondary";
    }
  }

  function getStatusName(status?: number) {
    switch (status) {
      case 1:
        return "Concluído";
      case 2:
        return "Quebra de OP";
      default:
        return "Pendente";
    }
  }

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="flex justify-center">
        {data && (
          <div className="m-2 lg:m-4 xl:m-6 exl:m-10 w-full exl:w-[80%] flex flex-col">
            <OpDisplay
              code={data.opCode}
              boxesCount={data.totalBoxes}
              boxesPacked={data.totalBoxes - data.pendingBoxes}
              itemsCount={data.quantityToProduce}
              itemsPacked={data.itemsPacked}
              displayMessage={displayMessage}
              displayColor={displayColor}
              statusMessage={getStatusName(data?.status) || ""}
              statusVariant={getStatusVariant(data?.status) || "secondary"}
              startDate={data?.createdAt || new Date()}
              endDate={data?.finishedAt}
            />
            {!data.finishedAt && (
              <>
                <div className="flex justify-end gap-6 mt-8">
                  <Button
                    disabled={step != 3}
                    className="bg-green-700 hover:bg-green-600"
                    onClick={() => setOpenConfirmDialog(true)}
                  >
                    Finalizar e Imprimir
                  </Button>
                  <Button
                    className="bg-blue-700 hover:bg-blue-600"
                    disabled={box?.status != 1}
                    onClick={() => setOpenRestartDialog(true)}
                  >
                    Reiniciar inspeção da caixa
                  </Button>
                  <Button
                    className="bg-red-700 hover:bg-red-600"
                    variant={"destructive"}
                    onClick={() => setOpenForceFinalizationDialog(true)}
                  >
                    Finalizar com quebra
                  </Button>
                </div>
                <div className="mt-2">
                  <h3 className="font-bold uppercase">Caixa</h3>
                  <BoxDisplay
                    name={data.boxType.name}
                    isTarget={step == 0}
                    description={data.boxType.description}
                    displayColor="blue"
                    statusText={getStatusName(box?.status) || ""}
                    statusVariant={getStatusVariant(box?.status) || "secondary"}
                  />
                </div>
                <div className="mt-8">
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
                    </div>
                  </div>
                </div>
                <div className="mt-8">
                  <h3 className="font-bold uppercase">Embalagem</h3>
                  <BlisterDisplay
                    blisters={blisters}
                    targetIndex={targetBlister}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <ConfirmationDialog
        title="Reiniciar Inspeção"
        message="Deseja realmente reiniciar a inspeção desta caixa?"
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
        confirmationAction={reload}
        onOpenChange={setOpenRestartDialog}
        open={openRestartDialog}
      />
      <ConfirmationDialog
        title="Finalizar Inspeção"
        message="Deseja confirmar a inspeção e imprimir a etiqueta?"
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
        confirmationAction={persistBoxInspection}
        onOpenChange={setOpenConfirmDialog}
        open={openConfirmDialog}
      />
      <ConfirmationDialog
        title="Finalizar com quebra de OP"
        message="Deseja realmente aprovar a Quebra de OP? A OP será finalizada desconsiderando peças pendentes."
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
        confirmationAction={forceOpFinalization}
        onOpenChange={setOpenForceFinalizationDialog}
        open={openForceFinalizationDialog}
      />
    </div>
  );
}
