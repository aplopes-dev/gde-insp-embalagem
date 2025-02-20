"use client";

import DebouncedInput from "@/components/data-table-debounce-text-filter";
import { toast } from "@/components/ui/use-toast";
import { getOpFromCode } from "@/shared/services/jerp";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { useEffect, useState } from "react";

type OpLoadFormProps = {
  onLoadOp?: (data: OpJerpDto) => void;
};

const OpLoadForm = ({ onLoadOp }: OpLoadFormProps) => {
  const [opValue, setOpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    opValue && handleRegistration(opValue);
  }, [opValue]);

  const handleRegistration = async (op: string) => {
    setIsLoading(true);
    try {
      const res = await getOpFromCode(op);
      if (res && onLoadOp) onLoadOp(res);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao carregar OP",
        variant: "destructive",
      });
    } finally {
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
          debounceTime={500}
          placeholder="Código da OP"
        />
      </div>
    </div>
  );
};

export default OpLoadForm;
