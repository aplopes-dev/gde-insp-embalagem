import { FilterClauseType } from "../types/filter";

export function getOwnFilterClauses(clauses: FilterClauseType[]) {
  let whereClauses: any = {};
  const ownClauses = clauses.filter((clause) => !clause.value.relation);
  if (ownClauses.length > 0) {
    for (let index = 0; index < ownClauses.length; index++) {
      whereClauses = {
        ...whereClauses,
        [ownClauses[index].id]: {
          [ownClauses[index].value.operator]: ownClauses[index].value.value,
        },
      };
    }
  }
  return whereClauses;
}
