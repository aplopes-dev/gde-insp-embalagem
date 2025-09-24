// DTOs para integração com JERP
export interface JerpUserDTO {
  inscription: string; // identificador único do colaborador no JERP
  nome: string;
  cargo: string; // ex.: Operador, Supervisor, Administrador
}

export interface JerpLookupResponse {
  ok: boolean;
  user?: JerpUserDTO;
  error?: string;
}

