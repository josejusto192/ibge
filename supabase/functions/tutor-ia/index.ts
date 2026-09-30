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
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

// Nome do mascote (igual a src/lib/mascote.ts no app).
const NOME_MASCOTE = 'Foco';

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

// ---- Imagens da questão (gráficos, tabelas, mapas) ----
// O texto da questão vai sem HTML; sem isto o <img> sumia e o tutor pedia
// ao aluno pra "mandar o gráfico". Cada imagem vira um marcador [Imagem N]
// no texto e é anexada à chamada do Gemini (inline_data), na mesma ordem.
const MAX_IMAGENS = 6;
const MAX_BYTES_IMAGEM = 4 * 1024 * 1024;
// Formatos de imagem aceitos pelo Gemini.
const MIME_ACEITOS = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];

class ColetorImagens {
  srcs: string[] = [];

  // HTML → texto, trocando cada <img> por [Imagem N].
  texto(html: string | null | undefined): string {
    return (html ?? '')
      .replace(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi, (_m, src: string) => {
        let n = this.srcs.indexOf(src) + 1;
        if (!n) {
          this.srcs.push(src);
          n = this.srcs.length;
        }
        return ` [Imagem ${n}] `;
      })
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

type ParteGemini = { text: string } | { inline_data: { mime_type: string; data: string } };

async function baixarImagem(src: string): Promise<{ mime_type: string; data: string } | null> {
  try {
    const dataUri = src.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUri) return MIME_ACEITOS.includes(dataUri[1]) ? { mime_type: dataUri[1], data: dataUri[2] } : null;
    const res = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0 (FocoApp tutor)' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!MIME_ACEITOS.includes(mime)) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES_IMAGEM) return null;
    return { mime_type: mime, data: encodeBase64(bytes) };
  } catch {
    return null;
  }
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

  // Só explica questão de módulo que o aluno pode abrir (1º grátis ou
  // assinante) — senão o chat viraria um jeito de ler conteúdo pago.
  // (erro = migration 027 ainda não rodou: não bloqueia)
  const { data: liberada, error: erroLiberada } = await userClient.rpc('questao_liberada', { p_questao_id: questaoId });
  if (!erroLiberada && !liberada) return json({ error: 'ASSINATURA_NECESSARIA' }, 403);

  const { data: questao, error: qErr } = await admin
    .from('questoes')
    .select('enunciado, enunciado_html, alternativas, gabarito_letra, comentario, comentario_html, comentario_revisado, comentario_revisado_html, disciplina')
    .eq('id', questaoId)
    .single();
  if (qErr || !questao) return json({ error: 'Questão não encontrada' }, 404);

  const { data: config } = await admin
    .from('configuracoes_ia')
    .select('modelo, api_key, tutor_prompt_extra')
    .eq('id', 1)
    .single();
  if (!config?.api_key) return json({ error: 'Tutor de IA ainda não configurado. Peça para o admin configurar em Configurações.' }, 400);

  // Créditos diários (proteção de custo do Gemini): 1 mensagem respondida =
  // 1 crédito, limite diferente pra assinante e não assinante (migration
  // 023, configurável pelo admin). Erro de rede/IA não consome crédito.
  const { data: creditos, error: cErr } = await admin
    .rpc('tutor_creditos', { p_usuario_id: userData.user.id })
    .single<{ limite: number; usados: number; restantes: number; assinante: boolean }>();
  if (cErr || !creditos) return json({ error: 'Não foi possível verificar seus créditos.' }, 500);
  if (creditos.restantes <= 0) {
    return json(
      {
        error: creditos.assinante
          ? `Você usou as ${creditos.limite} mensagens do tutor de hoje. Volte amanhã!`
          : `Você usou suas ${creditos.limite} mensagens grátis do tutor hoje. Assine para conversar mais — ou volte amanhã!`,
        assinante: creditos.assinante,
        creditos_restantes: 0,
      },
      429,
    );
  }

  // Mesma ordem de leitura do aluno: enunciado, alternativas, comentário.
  const coletor = new ColetorImagens();
  const enunciadoTexto = questao.enunciado_html ? coletor.texto(questao.enunciado_html) : stripHtml(questao.enunciado);
  const alternativasTexto = (questao.alternativas ?? [])
    .map((a: { letra: string; texto: string; html?: string | null }) => {
      const texto = a.html ? coletor.texto(a.html) : a.texto;
      return `${a.letra}) ${texto}${a.letra === questao.gabarito_letra ? '  ← correta' : ''}`;
    })
    .join('\n');
  // Comentário revisado (nunca o original raspado quando há revisão).
  const comentarioHtml = questao.comentario_revisado_html ?? (questao.comentario_revisado ? null : questao.comentario_html);
  const comentario = comentarioHtml ? coletor.texto(comentarioHtml) : stripHtml(questao.comentario_revisado || questao.comentario);

  const srcs = coletor.srcs.slice(0, MAX_IMAGENS);
  const imagens = await Promise.all(srcs.map(baixarImagem));
  const faltando = srcs.map((_, i) => i + 1).filter((n) => !imagens[n - 1]);
  const partesImagem: ParteGemini[] = imagens.flatMap((img, i) =>
    img ? [{ text: `[Imagem ${i + 1}]` }, { inline_data: img }] : [],
  );
  const avisoImagens = coletor.srcs.length
    ? `\n\nA questão tem ${coletor.srcs.length} imagem(ns) (gráficos, tabelas ou figuras), marcadas no texto como [Imagem N] e anexadas logo após estas instruções, na mesma numeração. Analise-as como parte da questão.${
        faltando.length || coletor.srcs.length > MAX_IMAGENS
          ? ` Algumas não puderam ser carregadas (${[...faltando, ...coletor.srcs.slice(MAX_IMAGENS).map((_, i) => MAX_IMAGENS + i + 1)].map((n) => `Imagem ${n}`).join(', ')}): explique usando o enunciado e o comentário, sem pedir a imagem ao aluno.`
          : ''
      }`
    : '';
  const historicoTexto = (historico ?? [])
    .map((m) => `${m.role === 'user' ? 'Aluno' : NOME_MASCOTE}: ${m.text}`)
    .join('\n');

  const extra = config.tutor_prompt_extra ? `\n\nDiretrizes adicionais do professor:\n${config.tutor_prompt_extra}` : '';

  const prompt = `Você é o ${NOME_MASCOTE}, o mascote e tutor do app Foco: um tutor de IA paciente, didático e animado, que fala de forma próxima e encorajadora (pode chamar o aluno de "você", sem exagerar em gírias ou emojis), ajudando um aluno de concurso público a entender uma questão que ele acabou de responder. Baseie-se só nas informações abaixo — nunca invente lei, dado ou explicação que não esteja no comentário oficial. Responda em texto simples, sem HTML nem markdown, em no máximo dois parágrafos curtos. Você já recebe tudo o que existe da questão: NUNCA peça ao aluno para enviar imagem, print, gráfico, tabela, enunciado ou qualquer dado da questão.${avisoImagens}${extra}

## Questão (${questao.disciplina})
${enunciadoTexto}

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
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, ...partesImagem] }] }),
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

  await admin.from('tutor_ia_usos').insert({ usuario_id: userData.user.id });

  return json({ reply: reply.trim(), creditos_restantes: creditos.restantes - 1 });
});
