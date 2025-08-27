"use client"

import { FilterPaginationParams } from "@/types/filter";
import { useEffect, useMemo, useState } from "react";

type GetActionFn = (params: FilterPaginationParams) => Promise<any> | any;

export function useActionPageApi({
  pagination: { limit = 10, skip = 0 } = {},
  sort: { field = "", order = "" } = {},
  filters = [] as any[],
  getAction = (async (_params: FilterPaginationParams) => [[], 0]) as GetActionFn,
  defautlFilters = [] as any[],
} = {}) {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const combinedFilters = useMemo(
    () => ([] as any[]).concat(defautlFilters ?? [], filters ?? []),
    [defautlFilters, filters]
  );

  useEffect(() => {
    let aborted = false;
    setLoading(true);

    Promise.resolve(
      getAction({ limit, skip, field, order, filters: combinedFilters })
    )
      .then((res: any) => {
        if (aborted) return;
        if (Array.isArray(res)) {
          const [_data, _count] = res;
          setData(Array.isArray(_data) ? _data : []);
          setCount(typeof _count === "number" ? _count : Array.isArray(_data) ? _data.length : 0);
        } else if (res && typeof res === "object") {
          const _data = (res as any).data ?? [];
          const _count = (res as any).count ?? (Array.isArray(_data) ? _data.length : 0);
          setData(Array.isArray(_data) ? _data : []);
          setCount(typeof _count === "number" ? _count : 0);
        } else {
          setData([]);
          setCount(0);
        }
      })
      .catch(() => {
        if (aborted) return;
        setData([]);
        setCount(0);
      })
      .finally(() => {
        if (aborted) return;
        setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [limit, skip, field, order, combinedFilters, getAction]);

  return [data, count, loading] as const;
}
