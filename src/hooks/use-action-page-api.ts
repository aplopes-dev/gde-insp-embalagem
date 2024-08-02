import { FilterPaginationParams } from "@/types/filter";
import { useEffect, useState } from "react";

export function useActionPageApi({
  pagination: { limit = 10, skip = 0 } = {},
  sort: { field = "id", order = "asc" } = {},
  filters = [],
  getAction = async (params: FilterPaginationParams): Promise<any> => {},
} = {}) {
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);

    const res = getAction({ limit, skip, field, order, filters });
    const abort = () => {};

    
    
    res.then(([_data, _count]: any) => {
      console.log("_data");
      console.log(_data);
      setData(_data);
      setCount(_count);
      setLoading(false);
    });

    return () => abort();
  }, [limit, skip, field, order, setData, setLoading, filters]);

  return [data, count, loading];
}
