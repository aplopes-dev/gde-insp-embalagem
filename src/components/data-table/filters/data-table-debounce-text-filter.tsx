import { Input } from "@/components/ui/input";
import { FilterOperatorType, FilterType } from "@/types/filter";
import { Column } from "@tanstack/react-table";
import { useEffect, useState } from "react";

interface DataTableDebounceTextFilterProps<TData, TValue> {
  title: string;
  placeholder: string;
  column?: Column<TData, TValue>;
  debounce?: number;
  operator?: FilterOperatorType;
}

export default function DataTableDebounceTextFilter<TData, TValue>({
  column,
  title,
  placeholder,
  operator = "contains",
  debounce = 500,
}: DataTableDebounceTextFilterProps<TData, TValue>) {
  const initialValue = column?.getFilterValue() as FilterType;
  const [value, setValue] = useState<FilterType>();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    setValue(
      event.target.value
        ? {
            operator,
            value: event.target.value,
          }
        : undefined
    );

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      value !== initialValue && column?.setFilterValue(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <Input
      title={title}
      placeholder={placeholder}
      value={value?.value || ""}
      onChange={handleInputChange}
      className="h-8 lg:w-[250px]"
    />
  );
}
