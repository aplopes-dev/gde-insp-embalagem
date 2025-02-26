"use client";

import DebouncedInput from "@/components/data-table-debounce-text-filter";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PackagingJerpDto, ProductJerpDto } from "../_types/op-jerp-dto";
import { getOpFromNexinToProduceById } from "../actions";

const OpLoadForm = () => {
  const textStyleClasses =
    "uppercase xl:h-16 exl:h-24 text-sm xl:text-2xl exl:text-4xl";
  const [opValue, setOpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    opValue && handleRegistration(opValue);
  }, [opValue]);

  function redirectAction(uri: string) {
    router.push(`${uri}`);
  }

  const handleRegistration = (opId: string) => {
    setIsLoading(true);
    getOpFromNexinToProduceById(opId)
      .then((res) => {
        setIsLoading(false);
        opIsValid(res) && redirectAction(`/op/${res.id}`);
      })
      .catch((_) => {
        setIsLoading(false);
        toast({
          title: "Erro",
          description: "Falha ao carregar OP",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="flex">
      <div className="flex flex-col w-full">
        <DebouncedInput
          autoFocus
          disabled={isLoading}
          value={opValue}
          onChange={setOpValue}
          debounceTime={500}
          placeholder="Código da OP"
          className={textStyleClasses}
        />
      </div>
    </div>
  );
};

function opIsValid({
  quantidadeAProduzir,
}: {
  id: number;
  numero: number;
  produto: ProductJerpDto;
  quantidadeAProduzir: number;
  embalagens: PackagingJerpDto[];
}) {
  if (!quantidadeAProduzir || quantidadeAProduzir <= 0) {
    toast({
      title: "Alerta",
      description: "Não existem itens pendentes para embalagem",
    });
    return false;
  }
  return true;
}

export default OpLoadForm;
