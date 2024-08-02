"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { getOpByCode } from "../actions";

const OpLoadForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const textStyleClasses =
    "uppercase xl:h-16 exl:h-24 text-sm xl:text-2xl exl:text-4xl";

  function redirectAction(uri: string) {
    router.push(`${uri}`);
  }

  const {
    register,
    handleSubmit,
    formState: { isDirty, isValid, errors },
  } = useForm({
    defaultValues: {
      op: "",
    },
  });

  const registerOptions = {
    op: { required: "Código obrigatório" },
  };

  const handleRegistration = ({ op }: any) => {
    setIsLoading(true);
    getOpByCode(op)
      .then((res) => {
        // opIsValid(res) && redirectAction(`/op/${res.Numero}`);
        setIsLoading(false);
      })
      .catch((_) => {
        toast({
          title: "Erro",
          description: "Falha ao carregar OP",
          variant: "destructive",
        });
        setIsLoading(false);
      });
  };
  const handleError = () => {};

  return (
    <form
      className="w-full"
      onSubmit={handleSubmit(handleRegistration, handleError)}
    >
      <div className="flex">
        <div className="flex flex-col w-full">
          <Input
            disabled={isLoading}
            type="text"
            {...register("op", registerOptions.op)}
            className={cn(textStyleClasses, "rounded-none rounded-l-lg")}
            placeholder="Código da OP"
          />
          <small className="text-red-500 p-2">
            {errors?.op && errors.op.message}
          </small>
        </div>
        <Button
          disabled={!isDirty || !isValid || isLoading}
          type="submit"
          className={cn(textStyleClasses, "rounded-none rounded-r-lg")}
        >
          {isLoading && (
            <Loader2
              className={cn(
                "h-4 w-4 lg:h-8 lg:w-8 exl:h-12 exl:w-12 animate-spin mr-2"
              )}
            />
          )}
          Carregar
        </Button>
      </div>
    </form>
  );
};

function opIsValid({
  QuantidadeAProduzir,
}: {
  id: number;
  Numero: number;
  Produto: string;
  QuantidadeAProduzir: number;
  Embalagens: string[];
}) {
  if (!QuantidadeAProduzir || QuantidadeAProduzir <= 0) {
    toast({
      title: "Alerta",
      description: "Não existem itens à serem embalados",
    });
    return false;
  }
  return true;
}

export default OpLoadForm;
