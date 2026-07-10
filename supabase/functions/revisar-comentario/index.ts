// Edge Function: revisa (reescreve) o comentário de uma questão usando a
// API do Google Gemini. Só roda no servidor — a chave de API configurada em
// `configuracoes_ia` nunca é enviada ao navegador. Chamada pelo painel admin
// via supabase.functions.invoke('revisar-comentario', { body: { questao_id } }).
//
// Imagens originais são preservadas: extraímos as tags <img> do comentário
// antes de mandar para a IA (viram marcadores [[IMG_n]]) e as recolocamos
// depois — a IA nunca reescreve/inventa a URL da imagem, só o texto ao redor.
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autenticado' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Não autenticado' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: perfil } = await admin.from('usuarios').select('is_admin, is_editor').eq('id', userData.user.id).single();
  if (!perfil?.is_admin && !perfil?.is_editor) return json({ error: 'Só admin ou editor pode revisar questões.' }, 403);

  let questaoId: string | undefined;
  try {
    ({ questao_id: questaoId } = await req.json());
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400);
  }
  if (!questaoId) return json({ error: 'questao_id é obrigatório' }, 400);

  const { data: questao, error: qErr } = await admin
    .from('questoes')
    .select('id, enunciado, gabarito_letra, comentario, comentario_html')
    .eq('id', questaoId)
    .single();
  if (qErr || !questao) return json({ error: 'Questão não encontrada' }, 404);

  const { data: config } = await admin.from('configuracoes_ia').select('*').eq('id', 1).single();
  if (!config?.api_key) return json({ error: 'Configure a chave de API do Gemini em Configurações antes de revisar.' }, 400);

  const originalHtml: string = questao.comentario_html || questao.comentario || '';
  if (!originalHtml.trim()) return json({ error: 'Esta questão não tem comentário original para revisar.' }, 400);

  const images: string[] = [];
  const withPlaceholders = originalHtml.replace(/<img[^>]*>/gi, (match: string) => {
    images.push(match);
    return `[[IMG_${images.length - 1}]]`;
  });

  const systemPrompt =
    'Você é um editor pedagógico revisando o comentário/resolução de uma questão de concurso público. ' +
    'Reescreva o texto abaixo com suas próprias palavras (parafraseie — não copie frases do original), ' +
    'mantendo 100% da informação técnica e do gabarito, em tom claro e didático. ' +
    'Preserve exatamente os marcadores no formato [[IMG_n]] nas posições onde fizerem sentido — ' +
    'não invente, remova ou altere esses marcadores. ' +
    'Responda só com o HTML do comentário reescrito (parágrafos <p>), sem comentários extras nem markdown.';

  const extra = config.prompt_extra ? `\n\nDiretrizes adicionais do professor:\n${config.prompt_extra}` : '';

  const prompt = `${systemPrompt}${extra}

Enunciado da questão: ${questao.enunciado ?? ''}
Gabarito: ${questao.gabarito_letra ?? ''}

Comentário original a reescrever:
${withPlaceholders}`;

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
  let rewritten: string = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!rewritten.trim()) return json({ error: 'A IA não retornou conteúdo.' }, 502);

  rewritten = rewritten.replace(/\[\[IMG_(\d+)\]\]/g, (_match: string, idx: string) => images[Number(idx)] ?? '');
  const plainText = rewritten
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const { error: updateError } = await admin
    .from('questoes')
    .update({
      comentario_revisado_html: rewritten,
      comentario_revisado: plainText,
      revisado: true,
      revisado_em: new Date().toISOString(),
      revisado_metodo: 'ia',
      revisado_por: userData.user.id,
    })
    .eq('id', questaoId);

  if (updateError) return json({ error: updateError.message }, 500);

  return json({ comentario_revisado_html: rewritten, comentario_revisado: plainText });
});
