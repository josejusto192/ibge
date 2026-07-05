export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Alternativa = {
  letra: string;
  texto: string;
  html: string | null;
  correta: boolean;
};

export type QuestaoRow = {
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
  // Revisão do comentário (migration 005) — o original vem raspado de
  // terceiros e não pode ser exibido ao aluno sem reescrita.
  comentario_revisado: string | null;
  comentario_revisado_html: string | null;
  revisado: boolean;
  revisado_em: string | null;
  revisado_metodo: 'ia' | 'manual' | null;
  revisado_por: string | null;
};

// Shape explícita retornada por get_modulo_questoes() — só o que o app do
// aluno precisa (nunca inclui os campos internos de revisão/admin).
export type ModuloQuestaoRow = {
  id: string;
  enunciado: string | null;
  enunciado_html: string | null;
  tem_imagem: boolean;
  gabarito_letra: string | null;
  comentario: string | null;
  comentario_html: string | null;
  banca: string | null;
  ano: number | null;
  orgao: string | null;
  orgao_nome: string | null;
  cargo: string | null;
  disciplina: string;
  nivel_escolaridade: string | null;
  tipo: string | null;
  anulada: boolean;
  desatualizada: boolean;
  alternativas: Alternativa[];
}

export type Database = {
  public: {
    Tables: {
      // Tabela já existente no Supabase (fornecida pelo cliente) — id é uuid, não number.
      // Só admin pode ler (RLS) — o aluno acessa via get_modulo_questoes().
      questoes: {
        Row: QuestaoRow;
        Insert: Partial<QuestaoRow> & { disciplina: string };
        Update: Partial<QuestaoRow>;
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
          is_admin: boolean;
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
          is_admin?: boolean;
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
      // Nó do caminho da trilha. Título livre — não é mais 1:1 com uma disciplina.
      modulos: {
        Row: {
          id: number;
          trilha_id: number;
          titulo: string;
          ordem: number;
        };
        Insert: {
          trilha_id: number;
          titulo: string;
          ordem?: number;
        };
        Update: {
          titulo?: string;
          ordem?: number;
        };
        Relationships: [];
      };
      // Curadoria: quais questões (e em que ordem) compõem cada módulo.
      modulo_questoes: {
        Row: {
          modulo_id: number;
          questao_id: string;
          ordem: number;
        };
        Insert: {
          modulo_id: number;
          questao_id: string;
          ordem?: number;
        };
        Update: {
          ordem?: number;
        };
        Relationships: [];
      };
      progresso_modulos: {
        Row: {
          usuario_id: string;
          modulo_id: number;
          acertos: number;
          total: number;
          concluido_em: string;
        };
        Insert: {
          usuario_id: string;
          modulo_id: number;
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
        Insert: {
          nome: string;
          slug: string;
          descricao?: string | null;
          ativa?: boolean;
          ordem?: number;
        };
        Update: {
          nome?: string;
          slug?: string;
          descricao?: string | null;
          ativa?: boolean;
          ordem?: number;
        };
        Relationships: [];
      };
      // trilha_disciplinas: não usada mais pelo app (ver migration 004) —
      // segue existindo no banco mas foi removida daqui de propósito (não é
      // consultada por nenhum código, então não precisa de tipo).
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
      // Configuração do revisor de IA (Google Gemini) — só admin lê/escreve.
      // Linha única fixa (id sempre 1).
      configuracoes_ia: {
        Row: {
          id: number;
          modelo: string;
          api_key: string | null;
          prompt_extra: string | null;
          atualizado_em: string;
        };
        Insert: {
          id?: number;
          modelo?: string;
          api_key?: string | null;
          prompt_extra?: string | null;
          atualizado_em?: string;
        };
        Update: {
          modelo?: string;
          api_key?: string | null;
          prompt_extra?: string | null;
          atualizado_em?: string;
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
      get_modulo_questoes: {
        Args: { p_modulo_id: number };
        Returns: ModuloQuestaoRow[];
      };
      get_meu_desempenho_por_disciplina: {
        Args: Record<string, never>;
        Returns: { disciplina: string; acertos: number; total: number }[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
