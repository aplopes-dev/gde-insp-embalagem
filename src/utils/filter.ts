import { FilterClauseType } from "../types/filter";

export function getOwnFilterClauses(clauses: FilterClauseType[]) {
  let whereClauses: any = {};
  const ownClauses = clauses.filter((clause) => !clause.value.relation);

  ownClauses.forEach((clause) => {
    const { id, value } = clause;
    const { operator, value: filterValue } = value;

    if (operator && filterValue) {
      if (operator === "equals" && filterValue.gte && filterValue.lte) {
        // Filtro de data no formato de intervalo
        whereClauses[id] = {
          gte: filterValue.gte,
          lte: filterValue.lte,
        };
      } else if (operator === "gte" || operator === "lte") {
        // Filtros de data para "a partir de" ou "antes de"
        whereClauses[id] = { [operator]: filterValue.operatorDate };
      } else if (id === "DomainUser_department_name") {
        // Filtro para o nome do departamento aninhado
        whereClauses = {
          ...whereClauses,
          DomainUser: {
            ...whereClauses.DomainUser,
            department: {
              name: { [operator]: filterValue },
            },
          },
        };
      } else if (id === "secretary_name") {
        whereClauses = {
          ...whereClauses,
          secretary: {
            name: { [operator]: filterValue },
          },
        };
      } else {
        // Outros filtros
        whereClauses[id] = { [operator]: filterValue };
      }
    }
  });

  return whereClauses;
}
