/** Envelope de resposta usado por toda a API do backend — genuinamente cross-cutting, fica em core. */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: { msg: string; path: string }[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number;
}
