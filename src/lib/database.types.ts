export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      questoes: {
        Row: {
          id: number
          tec_id: string | null
          enunciado_html: string
          alternativas: Alternativa[]
          gabarito_letra: string
          comentario_html: string | null
          disciplina: string
          assunto: string | null
          banca: string | null
          ano: number | null
          orgao: string | null
          tem_imagem: boolean
          anulada: boolean
          desatualizada: boolean
        }
      }
      usuarios: {
        Row: {
          id: string
          nome: string | null
          email: string
          assinatura_ativa: boolean
          streak: number
          ultimo_acesso: string | null
          created_at: string
        }
        Insert: {
          id: string
          nome?: string | null
          email: string
          assinatura_ativa?: boolean
          streak?: number
          ultimo_acesso?: string | null
        }
        Update: {
          nome?: string | null
          assinatura_ativa?: boolean
          streak?: number
          ultimo_acesso?: string | null
        }
      }
      progresso_questoes: {
        Row: {
          id: number
          usuario_id: string
          questao_id: string
          acertou: boolean
          respondido_em: string
        }
        Insert: {
          usuario_id: string
          questao_id: string
          acertou: boolean
          respondido_em?: string
        }
      }
      trilhas: {
        Row: {
          id: number
          nome: string
          slug: string
          descricao: string | null
          ativa: boolean
          ordem: number
        }
      }
      trilha_disciplinas: {
        Row: {
          id: number
          trilha_id: number
          disciplina: string
          ordem: number
        }
      }
    }
  }
}

export interface Alternativa {
  letra: string
  texto: string
  html: string | null
  correta: boolean
}
