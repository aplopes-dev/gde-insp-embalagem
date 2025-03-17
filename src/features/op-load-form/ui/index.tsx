"use client";

import DebouncedInput from "@/components/data-table-debounce-text-filter";
import { toast } from "@/components/ui/use-toast";
import { validateOpJerpToProduce } from "@/usecases/op-jerp/validate-op-jerp-to-produce";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const OpLoadForm = () => {
  const router = useRouter();
  const [opValue, setOpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function redirectAction(uri: string) {
    router.push(`${uri}`);
  }

  useEffect(() => {
    opValue && handleInputChange(opValue);
  }, [opValue]);

  const handleInputChange = async (opCode: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/op-jerp/${opCode}`);
      if (!res.ok) throw new Error("Falha ao carregar OP");
      const reqData = await res.json();
      validateOpJerpToProduce(reqData);
      redirectAction(`/op/${reqData.id}`);
      setIsLoading(false);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar OP JERP",
        description: error?.message || error,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

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
