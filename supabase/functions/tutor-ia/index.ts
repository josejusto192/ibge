// Edge Function: Tutor de IA do aluno. Chamada pelo botão "Perguntar para a
// IA" na tela de questão (só aparece depois de responder). Recebe a dúvida
// do aluno + o histórico da conversa e responde usando como contexto o
// enunciado, as alternativas, o gabarito, o comentário oficial (revisado) e
// se o aluno acertou ou errou — nunca inventa nada fora disso.
//
// Reaproveita o mesmo modelo/chave do Gemini configurados em
// configuracoes_ia (usados também pelo "Revisar com IA"), mas com
// diretrizes de prompt próprias de tutor — nunca de revisor de comentário.
// A api_key nunca é enviada ao navegador do aluno: só esta função (rodando
// com service_role) a lê.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

function stripHtml(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface HistoricoMsg {
  role: 'user' | 'ai';
  text: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autenticado' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Não autenticado' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let body: {
    questao_id?: string;
    duvida?: string;
    historico?: HistoricoMsg[];
    alternativa_selecionada?: string | null;
    acertou?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400);
  }

  const { questao_id: questaoId, duvida, historico, alternativa_selecionada: alternativaSelecionada, acertou } = body;
  if (!questaoId || !duvida?.trim()) return json({ error: 'questao_id e duvida são obrigatórios' }, 400);

  const { data: questao, error: qErr } = await admin
    .from('questoes')
    .select('enunciado, alternativas, gabarito_letra, comentario, comentario_revisado, disciplina')
    .eq('id', questaoId)
    .single();
  if (qErr || !questao) return json({ error: 'Questão não encontrada' }, 404);

  const { data: config } = await admin.from('configuracoes_ia').select('modelo, api_key, tutor_prompt_extra').eq('id', 1).single();
  if (!config?.api_key) return json({ error: 'Tutor de IA ainda não configurado. Peça para o admin configurar em Configurações.' }, 400);

  const alternativasTexto = (questao.alternativas ?? [])
    .map((a: { letra: string; texto: string }) => `${a.letra}) ${a.texto}${a.letra === questao.gabarito_letra ? '  ← correta' : ''}`)
    .join('\n');

  const comentario = stripHtml(questao.comentario_revisado || questao.comentario);
  const historicoTexto = (historico ?? [])
    .map((m) => `${m.role === 'user' ? 'Aluno' : 'Tutor'}: ${m.text}`)
    .join('\n');

  const extra = config.tutor_prompt_extra ? `\n\nDiretrizes adicionais do professor:\n${config.tutor_prompt_extra}` : '';

  const prompt = `Você é um tutor de IA paciente e didático, ajudando um aluno de concurso público a entender uma questão que ele acabou de responder. Baseie-se só nas informações abaixo — nunca invente lei, dado ou explicação que não esteja no comentário oficial. Responda em texto simples, sem HTML nem markdown, em no máximo dois parágrafos curtos.${extra}

## Questão (${questao.disciplina})
${stripHtml(questao.enunciado)}

Alternativas:
${alternativasTexto}

Gabarito: ${questao.gabarito_letra}

## O aluno
Alternativa marcada: ${alternativaSelecionada ?? 'não informada'}
Resultado: ${acertou ? 'ACERTOU' : 'ERROU'}

## Comentário/explicação oficial da questão
${comentario || '(sem comentário cadastrado)'}

## Conversa até agora
${historicoTexto || '(início da conversa)'}
Aluno: ${duvida}

Responda à última mensagem do aluno.`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.modelo}:generateContent?key=${config.api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
  } catch (err) {
    return json({ error: `Falha de rede ao chamar o Gemini: ${String(err)}` }, 502);
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return json({ error: `Gemini retornou erro: ${errText}` }, 502);
  }

  const geminiJson = await geminiRes.json();
  const reply: string = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!reply.trim()) return json({ error: 'A IA não retornou conteúdo.' }, 502);

  return json({ reply: reply.trim() });
});
