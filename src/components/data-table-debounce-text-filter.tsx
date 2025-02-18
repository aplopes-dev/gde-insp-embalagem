import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";

type DebouncedInputProps = {
  value: string;
  onChange: (value: string) => void;
  debounceTime?: number; // tempo em milissegundos para o debounce, padrão 300ms
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  debounceTime = 300,
  placeholder = "Digite aqui...",
  disabled,
  autoFocus,
}) => {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, debounceTime);

    // Limpa o timeout se o usuário continuar digitando antes do debounceTime
    return () => clearTimeout(handler);
  }, [inputValue, debounceTime, onChange, value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  return (
    <Input
      disabled={disabled}
      value={inputValue}
      onChange={handleChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="uppercase xl:h-16 exl:h-24 text-sm xl:text-2xl exl:text-4xl"
    />
  );
};

export default DebouncedInput;
