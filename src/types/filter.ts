export type FilterOperatorType =
  | "contains"
  | "equals"
  | "endsWith"
  | "starsWith"
  | "gte"
  | "lte"
  | "in";

export type FilterType = {
  operator: FilterOperatorType;
  value: any;
  relation?: boolean;
};

export type FilterClauseType = {
  id: string;
  value: FilterType;
};

export type FilterPaginationParams = {
  limit: number;
  skip: number;
  field: string;
  order: string;
  filters: FilterClauseType[];
};
