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
  // Aula de apoio opcional (migration 019) — só aparece no caderno de erros.
  aula_id: number | null;
};

// Shape explícita retornada por get_modulo_questoes() — só o que o app do
// aluno precisa (nunca inclui os campos internos de revisão/admin).
export type TrilhaConfigRow = {
  trilha_id: number;
  concurso: string | null;
  cargo_alvo: string | null;
  bancas: string[];
  banca_alvo: string | null;
  banca_alvo_pct: number;
  orgaos: string[];
  cargos: string[];
  niveis: string[];
  ano_min: number | null;
  ano_max: number | null;
  apenas_certo_errado: boolean;
  // TEMPORÁRIO (migration 029): remover antes do lançamento
  permitir_nao_revisadas: boolean;
  questoes_por_sessao: number;
  revisoes_por_sessao: number;
  atualizado_em: string;
};

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
          // Último dia (local) em que respondeu questão — base da ofensiva (migration 026).
          ultimo_estudo: string | null;
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
          is_editor: boolean;
          termos_aceitos_em: string | null;
          // Asaas (migration 020) — asaas_* só o servidor escreve.
          cpf: string | null;
          asaas_customer_id: string | null;
          asaas_sincronizado_em: string | null;
          asaas_sync_erro: string | null;
          // Acesso (migration 021): assinatura_ativa = cortesia OU acesso_ate
          // no futuro — calculado pelo banco, nunca gravado pelo app.
          assinatura_cortesia: boolean;
          acesso_ate: string | null;
          // Origem do cadastro (migration 032)
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          origem_referrer: string | null;
          origem_pagina: string | null;
          origem_em: string | null;
        };
        Insert: {
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          origem_referrer?: string | null;
          origem_pagina?: string | null;
          origem_em?: string | null;
          id: string;
          nome?: string | null;
          email: string;
          streak?: number;
          ultimo_acesso?: string | null;
          ultimo_estudo?: string | null;
          whatsapp?: string | null;
          faixa_etaria?: string | null;
          ja_prestou_concurso?: boolean | null;
          nivel_preparo?: string | null;
          prazo_prova?: string | null;
          meta_diaria?: number;
          xp?: number;
          trilha_ativa_id?: number | null;
          termos_aceitos_em?: string | null;
          cpf?: string | null;
        };
        Update: {
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          origem_referrer?: string | null;
          origem_pagina?: string | null;
          origem_em?: string | null;
          nome?: string | null;
          assinatura_cortesia?: boolean;
          streak?: number;
          ultimo_acesso?: string | null;
          ultimo_estudo?: string | null;
          whatsapp?: string | null;
          faixa_etaria?: string | null;
          ja_prestou_concurso?: boolean | null;
          nivel_preparo?: string | null;
          prazo_prova?: string | null;
          meta_diaria?: number;
          xp?: number;
          trilha_ativa_id?: number | null;
          is_admin?: boolean;
          is_editor?: boolean;
          termos_aceitos_em?: string | null;
          cpf?: string | null;
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
          xp_concedido: boolean;
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
          tipo: 'questoes' | 'aula' | 'inteligente';
          video_url: string | null;
          aula_id: number | null;
          disciplina: string | null;
          assuntos: string[];
          meta_questoes: number;
          dominio_alvo: number;
          secao_id: number | null;
          licoes: number;
        };
        Insert: {
          trilha_id: number;
          titulo: string;
          ordem?: number;
          tipo?: 'questoes' | 'aula' | 'inteligente';
          video_url?: string | null;
          aula_id?: number | null;
          disciplina?: string | null;
          assuntos?: string[];
          meta_questoes?: number;
          dominio_alvo?: number;
          secao_id?: number | null;
          licoes?: number;
        };
        Update: {
          titulo?: string;
          ordem?: number;
          tipo?: 'questoes' | 'aula' | 'inteligente';
          video_url?: string | null;
          aula_id?: number | null;
          disciplina?: string | null;
          assuntos?: string[];
          meta_questoes?: number;
          dominio_alvo?: number;
          secao_id?: number | null;
          licoes?: number;
        };
        Relationships: [];
      };
      // Assinaturas via Asaas (migration 021). Só o servidor escreve em
      // assinaturas/pagamentos; o aluno lê os próprios.
      planos: {
        Row: {
          id: number;
          nome: string;
          descricao: string | null;
          valor: number;
          ciclo: string;
          ativo: boolean;
          ordem: number;
          criado_em: string;
        };
        Insert: {
          nome: string;
          descricao?: string | null;
          valor: number;
          ciclo?: string;
          ativo?: boolean;
          ordem?: number;
        };
        Update: {
          nome?: string;
          descricao?: string | null;
          valor?: number;
          ciclo?: string;
          ativo?: boolean;
          ordem?: number;
        };
        Relationships: [];
      };
      assinaturas: {
        Row: {
          id: number;
          asaas_subscription_id: string;
          usuario_id: string | null;
          plano_id: number | null;
          status: string;
          billing_type: string | null;
          valor: number | null;
          ciclo: string | null;
          proximo_vencimento: string | null;
          evento_em: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      pagamentos: {
        Row: {
          id: number;
          asaas_payment_id: string;
          asaas_subscription_id: string | null;
          usuario_id: string | null;
          status: string;
          billing_type: string | null;
          valor: number | null;
          vencimento: string | null;
          pago_em: string | null;
          invoice_url: string | null;
          evento_em: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      // Tickets de reporte de questão e suporte (migration 025). O aluno só
      // cria e lê os próprios; status/resposta só a equipe muda.
      tickets: {
        Row: {
          id: number;
          usuario_id: string | null;
          tipo: 'questao' | 'suporte';
          questao_id: string | null;
          motivo: string;
          mensagem: string | null;
          status: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
          resposta: string | null;
          atendido_por: string | null;
          criado_em: string;
          atualizado_em: string;
          resolvido_em: string | null;
        };
        Insert: {
          usuario_id: string;
          tipo: 'questao' | 'suporte';
          questao_id?: string | null;
          motivo: string;
          mensagem?: string | null;
        };
        Update: {
          status?: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
          resposta?: string | null;
        };
        Relationships: [];
      };
      // Biblioteca de aulas (migration 019): cadastradas sem trilha, depois
      // usadas em módulos tipo 'aula' ou como aula de apoio de uma questão.
      aulas: {
        Row: {
          id: number;
          titulo: string;
          descricao: string | null;
          video_url: string;
          criado_em: string;
        };
        Insert: {
          titulo: string;
          descricao?: string | null;
          video_url: string;
        };
        Update: {
          titulo?: string;
          descricao?: string | null;
          video_url?: string;
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
      // Revisão espaçada e trilha inteligente (migration 028).
      respostas: {
        Row: {
          id: number;
          usuario_id: string;
          questao_id: string;
          letra: string | null;
          acertou: boolean;
          origem: string;
          respondido_em: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      // Seções da trilha inteligente (migration 030)
      trilha_secoes: {
        Row: { id: number; trilha_id: number; titulo: string; ordem: number };
        Insert: { trilha_id: number; titulo: string; ordem?: number };
        Update: { titulo?: string; ordem?: number };
        Relationships: [];
      };
      trilha_config: {
        Row: TrilhaConfigRow;
        Insert: Partial<TrilhaConfigRow> & { trilha_id: number };
        Update: Partial<TrilhaConfigRow>;
        Relationships: [];
      };
      trilha_questoes_regras: {
        Row: { trilha_id: number; questao_id: string; regra: 'obrigatoria' | 'excluida'; modulo_id: number | null };
        Insert: { trilha_id: number; questao_id: string; regra: 'obrigatoria' | 'excluida'; modulo_id?: number | null };
        Update: { regra?: 'obrigatoria' | 'excluida'; modulo_id?: number | null };
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
          secao_nome: string | null;
          tipo: 'manual' | 'inteligente';
        };
        Insert: {
          nome: string;
          slug: string;
          descricao?: string | null;
          ativa?: boolean;
          ordem?: number;
          secao_nome?: string | null;
          tipo?: 'manual' | 'inteligente';
        };
        Update: {
          nome?: string;
          slug?: string;
          descricao?: string | null;
          ativa?: boolean;
          ordem?: number;
          secao_nome?: string | null;
          tipo?: 'manual' | 'inteligente';
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
      client_errors: {
        Row: {
          id: number;
          usuario_id: string | null;
          mensagem: string;
          stack: string | null;
          contexto: string | null;
          url: string | null;
          user_agent: string | null;
          criado_em: string;
        };
        Insert: {
          usuario_id?: string | null;
          mensagem: string;
          stack?: string | null;
          contexto?: string | null;
          url?: string | null;
          user_agent?: string | null;
        };
        Update: Record<string, never>;
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
          tutor_prompt_extra: string | null;
          tutor_limite_diario: number;
          tutor_limite_diario_gratis: number;
          atualizado_em: string;
        };
        Insert: {
          id?: number;
          modelo?: string;
          api_key?: string | null;
          prompt_extra?: string | null;
          tutor_prompt_extra?: string | null;
          tutor_limite_diario?: number;
          tutor_limite_diario_gratis?: number;
          atualizado_em?: string;
        };
        Update: {
          modelo?: string;
          api_key?: string | null;
          prompt_extra?: string | null;
          tutor_prompt_extra?: string | null;
          tutor_limite_diario?: number;
          tutor_limite_diario_gratis?: number;
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
      admin_get_configuracoes_ia: {
        Args: Record<string, never>;
        Returns: {
          modelo: string;
          prompt_extra: string | null;
          tutor_prompt_extra: string | null;
          tutor_limite_diario: number;
          tutor_limite_diario_gratis: number;
          api_key_configurada: boolean;
          atualizado_em: string;
        }[];
      };
      admin_filtros_questoes: {
        Args: Record<string, never>;
        Returns: {
          bancas: string[] | null;
          disciplinas: string[] | null;
          cargos: string[] | null;
          niveis: string[] | null;
          orgaos: string[] | null;
        }[];
      };
      responder_questao: {
        Args: { p_questao_id: string; p_letra: string; p_origem?: string };
        Returns: {
          acertou: boolean;
          xp_ganho: number;
          xp: number;
          streak: number;
          ultimo_estudo: string;
          ofensiva_nova: number | null;
          revisao_etapa: number | null;
          proxima_revisao: string | null;
          dominio: number;
        }[];
      };
      meus_creditos_tutor: {
        Args: Record<string, never>;
        Returns: { limite: number; usados: number; restantes: number; assinante: boolean }[];
      };
      contar_minhas_questoes_erradas: {
        Args: { p_trilha_id: number };
        Returns: number;
      };
      admin_dashboard_stats: {
        Args: Record<string, never>;
        Returns: {
          total_questoes: number;
          questoes_revisadas: number;
          total_alunos: number | null;
          alunos_ativos_hoje: number | null;
          erros_7d: number | null;
          tutor_usos_hoje: number | null;
        }[];
      };
      admin_dashboard_trilhas: {
        Args: Record<string, never>;
        Returns: {
          id: number;
          nome: string;
          ativa: boolean;
          modulos: number;
          modulos_sem_questoes: number;
          questoes: number;
        }[];
      };
      admin_nomes_usuarios: {
        Args: { p_ids: string[] };
        Returns: { id: string; nome: string }[];
      };
      get_minhas_questoes_erradas: {
        Args: { p_trilha_id: number };
        Returns: (ModuloQuestaoRow & { aula_titulo: string | null; aula_video_url: string | null })[];
      };
      contar_revisoes_pendentes: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_revisoes_pendentes: {
        Args: { p_limite?: number };
        Returns: (ModuloQuestaoRow & { aula_titulo: string | null; aula_video_url: string | null; revisao_etapa: number })[];
      };
      get_revisoes_para_sessao: {
        Args: { p_trilha_id: number; p_limite: number; p_excluir?: string[] };
        Returns: (ModuloQuestaoRow & { motivo: string })[];
      };
      montar_sessao_inteligente: {
        Args: { p_modulo_id: number; p_revisao?: boolean };
        Returns: (ModuloQuestaoRow & { motivo: string })[];
      };
      avaliar_etapa: {
        Args: { p_modulo_id: number };
        Returns: {
          dominio: number;
          respondidas: number;
          acertos: number;
          meta: number;
          alvo: number;
          estoque: number;
          concluida: boolean;
          concluiu_agora: boolean;
        }[];
      };
      progresso_trilha_inteligente: {
        Args: { p_trilha_id: number };
        Returns: { modulo_id: number; licoes: number; licoes_feitas: number; estoque: number }[];
      };
      concluir_licao: {
        Args: { p_modulo_id: number };
        Returns: { licoes_feitas: number; licoes: number; unidade_concluida: boolean; concluiu_agora: boolean }[];
      };
      admin_sugerir_estrutura: {
        Args: { p_trilha_id: number };
        Returns: { disciplina: string; assunto: string; estoque: number; banca_alvo: number }[];
      };
      // Onboarding e painel Público (migration 031)
      registrar_onboarding: {
        Args: { p_sessao: string; p_etapa: string; p_utm_source?: string | null; p_utm_campaign?: string | null };
        Returns: undefined;
      };
      plano_onboarding: {
        Args: { p_trilha_id: number };
        Returns: { unidades: number; licoes: number; questoes: number }[];
      };
      admin_aluno_detalhe: {
        Args: { p_id: string };
        Returns: Json;
      };
      admin_publico: {
        Args: { p_dias?: number };
        Returns: Json;
      };
      meu_dominio: {
        Args: Record<string, never>;
        Returns: { disciplina: string; assunto: string; dominio: number; respostas: number; acertos: number }[];
      };
      admin_assuntos: {
        Args: { p_disciplina: string };
        Returns: { assunto: string; total: number; revisadas: number }[];
      };
      admin_contar_estoque: {
        Args: { p_trilha_id: number; p_disciplina: string; p_assuntos: string[] };
        Returns: { total: number; banca_alvo: number; nao_revisadas: number }[];
      };
      admin_estoque_trilha: {
        Args: { p_trilha_id: number };
        Returns: { modulo_id: number; total: number; banca_alvo: number; obrigatorias: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
