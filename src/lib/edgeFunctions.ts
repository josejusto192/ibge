import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Erro de Edge Function com o status HTTP e a mensagem real devolvida pela
// função — o supabase-js só expõe "Edge Function returned a non-2xx status
// code", e o corpo com o motivo fica escondido em error.context.
export class EdgeFunctionError extends Error {
  readonly funcao: string;
  readonly status: number | null;

  constructor(funcao: string, status: number | null, message: string) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.funcao = funcao;
    this.status = status;
  }
}

export async function invokeEdgeFunction<T>(funcao: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(funcao, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const response = error.context as Response;
      const detalhe = await response
        .json()
        .then((json: { error?: string }) => json?.error)
        .catch(() => null);
      throw new EdgeFunctionError(funcao, response.status, detalhe || `HTTP ${response.status}`);
    }
    throw new EdgeFunctionError(funcao, null, error instanceof Error ? error.message : String(error));
  }
  if (data?.error) throw new EdgeFunctionError(funcao, 200, data.error);
  return data as T;
}
