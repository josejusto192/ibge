export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Alternativa {
  letra: string;
  texto: string;
  html: string | null;
  correta: boolean;
}

export interface Database {
  public: {
    Tables: {
      // Tabela já existente no Supabase (fornecida pelo cliente) — id é uuid, não number.
      questoes: {
        Row: {
          id: string;
          tec_id: string | null;
          enunciado: string | null;
          enunciado_html: string | null;
          tem_imagem: boolean;
          gabarito: string | null;
          gabarito_letra: string | null;
          comentario: string | null;
          comentario_html: string | null;
          banca: string | null;
          ano: number | null;
          orgao: string | null;
          orgao_nome: string | null;
          cargo: string | null;
          disciplina: string;
          assunto: string | null;
          nivel: string | null;
          nivel_escolaridade: string | null;
          tipo: string | null;
          anulada: boolean;
          desatualizada: boolean;
          area: string | null;
          alternativas: Alternativa[];
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      usuarios: {
        Row: {
          id: string;
          nome: string | null;
          email: string;
          assinatura_ativa: boolean;
          streak: number;
          ultimo_acesso: string | null;
          created_at: string;
          whatsapp: string | null;
          faixa_etaria: string | null;
          ja_prestou_concurso: boolean | null;
          nivel_preparo: string | null;
          prazo_prova: string | null;
          meta_diaria: number;
          xp: number;
          trilha_ativa_id: number | null;
        };
        Insert: {
          id: string;
          nome?: string | null;
          email: string;
          assinatura_ativa?: boolean;
          streak?: number;
          ultimo_acesso?: string | null;
          whatsapp?: string | null;
          faixa_etaria?: string | null;
          ja_prestou_concurso?: boolean | null;
          nivel_preparo?: string | null;
          prazo_prova?: string | null;
          meta_diaria?: number;
          xp?: number;
          trilha_ativa_id?: number | null;
        };
        Update: {
          nome?: string | null;
          assinatura_ativa?: boolean;
          streak?: number;
          ultimo_acesso?: string | null;
          whatsapp?: string | null;
          faixa_etaria?: string | null;
          ja_prestou_concurso?: boolean | null;
          nivel_preparo?: string | null;
          prazo_prova?: string | null;
          meta_diaria?: number;
          xp?: number;
          trilha_ativa_id?: number | null;
        };
        Relationships: [];
      };
      progresso_questoes: {
        Row: {
          id: number;
          usuario_id: string;
          questao_id: string;
          acertou: boolean;
          respondido_em: string;
        };
        Insert: {
          usuario_id: string;
          questao_id: string;
          acertou: boolean;
          respondido_em?: string;
        };
        Update: {
          acertou?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'progresso_questoes_questao_id_fkey';
            columns: ['questao_id'];
            isOneToOne: false;
            referencedRelation: 'questoes';
            referencedColumns: ['id'];
          },
        ];
      };
      progresso_modulos: {
        Row: {
          usuario_id: string;
          trilha_id: number;
          disciplina: string;
          acertos: number;
          total: number;
          concluido_em: string;
        };
        Insert: {
          usuario_id: string;
          trilha_id: number;
          disciplina: string;
          acertos: number;
          total: number;
        };
        Update: {
          acertos?: number;
          total?: number;
        };
        Relationships: [];
      };
      trilhas: {
        Row: {
          id: number;
          nome: string;
          slug: string;
          descricao: string | null;
          ativa: boolean;
          ordem: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      trilha_disciplinas: {
        Row: {
          id: number;
          trilha_id: number;
          disciplina: string;
          ordem: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      indicacoes: {
        Row: {
          id: string;
          indicador_id: string;
          indicado_user_id: string | null;
          status: 'pendente' | 'assinou';
          credito_gerado: number;
          criado_em: string;
          confirmado_em: string | null;
        };
        Insert: {
          indicador_id: string;
          indicado_user_id: string;
          status?: 'pendente' | 'assinou';
        };
        Update: {
          status?: 'pendente' | 'assinou';
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      resolve_referral_code: {
        Args: { p_code: string };
        Returns: string | null;
      };
      get_ranking: {
        Args: { p_limit?: number };
        Returns: { id: string; nome: string; xp: number; streak: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
