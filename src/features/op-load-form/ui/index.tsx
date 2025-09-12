"use client";

import DebouncedInput from "@/components/data-table-debounce-text-filter";
import { toast } from "@/components/ui/use-toast";
import { useNavigatorOnLine } from "@/hooks/use-navigatior-online";
import { validateOpJerpToProduce } from "@/usecases/op-jerp/validate-op-jerp-to-produce";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const OpLoadForm = () => {
  const router = useRouter();
  const [opValue, setOpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isOnline = useNavigatorOnLine();



  const handleInputChange = useCallback(async (opCode: string) => {
    setIsLoading(true);
    try {

      if (!isOnline) throw new Error("Sem conexão com a internet!");
      const response = await fetch(`/api/op-jerp/${opCode}`);

      if (!response.ok) {
        const { error, errorData } = await response.json();
        console.error(error);
        console.error(errorData);
        throw new Error(errorData.message || error);
      }

      const reqData = await response.json();
      validateOpJerpToProduce(reqData);
      router.push(`/op/${reqData.id}`);
      setIsLoading(false);
    } catch (error: any) {      
      toast({
        title: "Erro ao carregar OP JERP",
        description: error?.message || error,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [isOnline, router]);

  useEffect(() => {
    opValue && handleInputChange(opValue);
  }, [opValue, handleInputChange]);

  return (
    <div className="flex">
      <div className="flex flex-col w-full">
        <DebouncedInput
          autoFocus
          disabled={isLoading}
          value={opValue}
          onChange={setOpValue}
          debounceTime={1500}
          placeholder="Insira o ID da OP"
        />
      </div>
    </div>
  );
};

export default OpLoadForm;
