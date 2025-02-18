"use client";

import DebouncedInput from "@/components/data-table-debounce-text-filter";
import { toast } from "@/components/ui/use-toast";
import { getOpFromCode } from "@/services/jerp";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const OpLoadForm = () => {
  const [opValue, setOpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    opValue && handleRegistration(opValue);
  }, [opValue]);

  function redirectAction(uri: string) {
    router.push(`${uri}`);
  }

  const handleRegistration = async (op: string) => {
    setIsLoading(true);
    try {
      const res = await getOpFromCode(op);
      if (res && opIsValid(res)) {
        redirectAction(`/op/${res.numero}`);
      }
    } catch (error: any) {
      console.error("Erro ao carregar OP:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao carregar OP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  function opIsValid(op?: OpJerpDto): boolean {
    if (!op || !op.quantidadeAProduzir || op.quantidadeAProduzir <= 0) {
      toast({
        title: "Alerta",
        description: "Não existem itens pendentes para embalagem",
      });
      return false;
    }
    return true;
  }

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
        />
      </div>
    </div>
  );
};

export default OpLoadForm;
