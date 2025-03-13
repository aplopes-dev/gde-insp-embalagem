"use client";

import DebouncedInput from "@/components/data-table-debounce-text-filter";
import { toast } from "@/components/ui/use-toast";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { useEffect, useState } from "react";

type OpLoadFormProps = {
  onLoadOp?: (data: OpJerpDto) => void;
};

const OpLoadForm = ({ onLoadOp }: OpLoadFormProps) => {
  const [opValue, setOpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    opValue && handleInputChange(opValue);
  }, [opValue]);

  const handleInputChange = async (opCode: string) => {
    setIsLoading(true);
    const res = await fetch(`/api/op-jerp/${opCode}`);
    if (!res.ok) {
      const reqData = await res.json();
      if (reqData.error) {
        const { error, errorData } = reqData;
        toast({
          title: error,
          description: errorData,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Falha ao carregar OP",
          variant: "destructive",
        });
      }
    } else {
      const reqData = await res.json();
      onLoadOp && onLoadOp(reqData);
    }
    setIsLoading(false);
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
