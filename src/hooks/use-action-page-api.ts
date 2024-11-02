import { FilterPaginationParams } from "@/types/filter";
import { useEffect, useState } from "react";

export function useActionPageApi({
  pagination: { limit = 10, skip = 0 } = {},
  sort: { field = "", order = "" } = {},
  filters = [] as any[],
  getAction = async (params: FilterPaginationParams): Promise<any> => {},
  defautlFilters = [] as any[],
} = {}) {
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    filters = defautlFilters.concat(filters)
    const res = getAction({ limit, skip, field, order, filters });
    const abort = () => {};

    res.then(([_data, _count]: any) => {
      setData(_data);
      setCount(_count);
      setLoading(false);
    });

    return () => abort();
  }, [limit, skip, field, order, setData, setLoading, filters]);

  return [data, count, loading];
}
