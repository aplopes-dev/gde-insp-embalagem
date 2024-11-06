import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";

type DebouncedInputProps = {
  value: string;
  onChange: (value: string) => void;
  debounceTime?: number; // tempo em milissegundos para o debounce, padrão 300ms
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  debounceTime = 300,
  placeholder = "Digite aqui...",
  disabled,
  className,
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
      className={className || "h-8 lg:w-[250px]"}
    />
  );
};

export default DebouncedInput;
