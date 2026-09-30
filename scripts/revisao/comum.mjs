// Utilidades dos scripts de revisão em lote (ver docs/REVISAO-CLAUDE-CODE.md).
// Entram no Supabase com o login de um admin/editor do app — nenhuma chave
// secreta fica no computador. Configuração em scripts/revisao/.env (não vai
// para o GitHub).
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(AQUI, '..', '..');
export const TRABALHO = path.join(RAIZ, 'revisao-trabalho');
export const LOTE = path.join(TRABALHO, 'lote');
export const FEITAS = path.join(TRABALHO, 'feitas');

function lerEnv(arquivo) {
  if (!fs.existsSync(arquivo)) return {};
  const vars = {};
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return vars;
}

export function args() {
  const saida = {};
  const lista = process.argv.slice(2);
  for (let i = 0; i < lista.length; i++) {
    if (!lista[i].startsWith('--')) continue;
    const chave = lista[i].slice(2);
    const valor = lista[i + 1] && !lista[i + 1].startsWith('--') ? lista[++i] : 'sim';
    saida[chave] = valor;
  }
  return saida;
}

export async function conectar() {
  const env = { ...lerEnv(path.join(RAIZ, '.env')), ...lerEnv(path.join(AQUI, '.env')), ...process.env };
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const chave = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const email = env.REVISOR_EMAIL;
  const senha = env.REVISOR_SENHA;
  if (!url || !chave || !email || !senha) {
    console.error(
      'Configuração faltando. Crie scripts/revisao/.env com:\n' +
        '  SUPABASE_URL=https://SEU-PROJETO.supabase.co\n' +
        '  SUPABASE_ANON_KEY=... (a mesma chave pública do app)\n' +
        '  REVISOR_EMAIL=seu e-mail de admin no app\n' +
        '  REVISOR_SENHA=sua senha\n' +
        '(veja scripts/revisao/.env.exemplo)',
    );
    process.exit(1);
  }
  const supabase = createClient(url, chave, { auth: { persistSession: false } });
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    console.error(`Não foi possível entrar com ${email}: ${error.message}`);
    process.exit(1);
  }
  return supabase;
}

export function pastasDoLote() {
  if (!fs.existsSync(LOTE)) return [];
  return fs
    .readdirSync(LOTE, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(LOTE, d.name))
    .sort();
}
