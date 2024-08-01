import { Locale, enUS, ptBR } from "date-fns/locale";

export function getDateLocale(code: string): Locale {
  switch (code) {
    case "ptBR":
      return ptBR;
    default:
      return enUS;
  }
}
