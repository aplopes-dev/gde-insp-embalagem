"use client";

import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const PASSWORD_PATTERN = "^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?\":{}|<>_\-\[\]\\/+=~`]).{8,}$";

type Props = {
  name?: string;
  placeholder?: string;
  className?: string;
};

export default function PasswordFieldWithHint({ name = "password", placeholder = "senha", className }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Input
        required
        name={name}
        type="password"
        placeholder={placeholder}
        className={cn(className)}
        pattern={PASSWORD_PATTERN}
        title="Mín. 8. Pelo menos: 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Política de senha">
            <Info className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="text-sm max-w-xs">
          <div className="font-medium mb-1">Política de senha</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mínimo 8 caracteres</li>
            <li>Pelo menos 1 letra maiúscula e 1 minúscula</li>
            <li>Pelo menos 1 número e 1 caractere especial</li>
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

