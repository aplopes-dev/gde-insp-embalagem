import { useCallback, useState } from "react";

export function usePagination(initialSize = 10) {
  const [pagination, setPagination] = useState({
    pageSize: initialSize,
    pageIndex: 0,
  });
  const { pageSize, pageIndex } = pagination;

  const onPaginationChange = useCallback((updater: any) => {
    setPagination((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  }, []);

  return {
    // table state
    onPaginationChange,
    pagination,
    // API
    limit: pageSize,
    skip: pageSize * pageIndex,
  };
}
