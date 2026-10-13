// Assistente: pergunta os dados no terminal, cria scripts/revisao/.env e
// testa o login. Uso: node scripts/revisao/configurar.mjs
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const DESTINO = path.join(AQUI, '.env');

function lerEnv(arquivo) {
  if (!fs.existsSync(arquivo)) return {};
  const vars = {};
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return vars;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let escondendo = false;
const escreverOriginal = rl._writeToOutput.bind(rl);
rl._writeToOutput = (texto) => {
  if (escondendo && !texto.includes('\n')) escreverOriginal('*');
  else escreverOriginal(texto);
};

const linhas = rl[Symbol.asyncIterator]();

async function perguntar(texto, { padrao, secreto } = {}) {
  const sufixo = padrao ? ' [Enter para usar o atual]' : '';
  process.stdout.write(`${texto}${sufixo}: `);
  if (secreto) escondendo = true;
  const { value } = await linhas.next();
  escondendo = false;
  if (secreto) process.stdout.write('\n');
  return (value ?? '').trim() || padrao || '';
}

const atual = { ...lerEnv(path.join(RAIZ, '.env')), ...lerEnv(DESTINO) };

console.log('\n=== Configurar a revisão em lote do Foco ===\n');
console.log('Você vai precisar de:');
console.log(' 1. O endereço do Supabase (Supabase → Project Settings → API → Project URL)');
console.log(' 2. A chave PÚBLICA "anon" (mesma tela; é a mesma VITE_SUPABASE_ANON_KEY do Vercel)');
console.log('    ⚠ NÃO use a chave "service_role" (secreta).');
console.log(' 3. Seu e-mail e senha de admin no app.\n');

const url = await perguntar('Endereço do Supabase (https://....supabase.co)', { padrao: atual.SUPABASE_URL || atual.VITE_SUPABASE_URL });
const chave = await perguntar('Chave pública anon', { padrao: atual.SUPABASE_ANON_KEY || atual.VITE_SUPABASE_ANON_KEY });
const email = await perguntar('Seu e-mail de admin', { padrao: atual.REVISOR_EMAIL });
const senha = await perguntar('Sua senha (não aparece enquanto digita)', { padrao: atual.REVISOR_SENHA, secreto: true });
rl.close();

if (!/^https?:\/\/.+/.test(url) || !chave || !email || !senha) {
  console.error('\n✗ Faltou alguma informação. Rode de novo: node scripts/revisao/configurar.mjs');
  process.exit(1);
}
if (/service_role/.test(Buffer.from(chave.split('.')[1] ?? '', 'base64').toString())) {
  console.error('\n✗ Essa é a chave SECRETA (service_role). Use a chave pública "anon". Nada foi salvo.');
  process.exit(1);
}

fs.writeFileSync(
  DESTINO,
  `# Criado por scripts/revisao/configurar.mjs — não vai para o GitHub.\nSUPABASE_URL=${url}\nSUPABASE_ANON_KEY=${chave}\nREVISOR_EMAIL=${email}\nREVISOR_SENHA=${senha}\n`,
);
console.log('\n✓ Arquivo scripts/revisao/.env criado. Testando o login…');

const supabase = createClient(url, chave, { auth: { persistSession: false } });
const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha });
if (erroLogin) {
  console.error(`✗ Não consegui entrar: ${erroLogin.message}\n  Confira e-mail/senha e rode de novo: node scripts/revisao/configurar.mjs`);
  process.exit(1);
}
const { data, error } = await supabase.rpc('cowork_resumo_pendentes');
if (error) {
  console.error(`✗ Entrei, mas não consegui ler as questões: ${error.message}`);
  process.exit(1);
}
const total = (data ?? []).reduce((t, l) => t + l.pendentes, 0);
if (!data?.length && total === 0) {
  console.log('⚠ Entrei, mas não veio nenhuma questão. Confira se este usuário é admin ou editor no app.');
} else {
  console.log(`✓ Tudo certo! Faltam ${total} questões para revisar.`);
}
console.log('\nPróximo passo: no Claude Code, digite  /revisar-questoes-scripts\n');
