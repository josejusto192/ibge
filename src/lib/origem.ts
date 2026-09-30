// De onde a pessoa veio (UTMs do link, site de origem e página de entrada).
// Capturado na chegada ao app, antes de qualquer redirecionamento, e
// guardado no aparelho até o cadastro (por 30 dias). Vale o último link COM
// UTM; voltar direto, por outro site ou pelo app instalado não apaga a origem.

export interface Origem {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  origem_referrer: string | null;
  origem_pagina: string | null;
  origem_em: string;
  ref: string | null;
}

const CHAVE = 'foco:origem';
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;
const UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

const limpar = (v: string | null, max = 120) => {
  const t = v?.trim();
  return t ? t.slice(0, max) : null;
};

export function lerOrigem(): Origem | null {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (!salvo) return null;
    const o = JSON.parse(salvo) as Origem;
    if (Date.now() - new Date(o.origem_em).getTime() > VALIDADE_MS) return null;
    return o;
  } catch {
    return null;
  }
}

export function capturarOrigem() {
  try {
    const params = new URLSearchParams(window.location.search);
    const temUtm = UTMS.some((k) => params.get(k));
    // clique de anúncio sem UTM também conta como origem
    const clid = params.get('gclid') ? 'google' : params.get('fbclid') ? 'facebook' : params.get('ttclid') ? 'tiktok' : null;
    let referrer: string | null = null;
    try {
      const r = document.referrer ? new URL(document.referrer) : null;
      if (r && r.host !== window.location.host) referrer = r.host.replace(/^www\./, '');
    } catch {
      referrer = null;
    }
    const ref = limpar(params.get('ref'), 40);

    const atual = lerOrigem();
    // já tem uma origem válida e este acesso não traz nada novo: mantém
    if (atual && !temUtm && !clid) {
      if (ref && !atual.ref) localStorage.setItem(CHAVE, JSON.stringify({ ...atual, ref }));
      return;
    }
    // sem UTM, sem clique de anúncio e sem site de origem: nada a guardar
    if (!temUtm && !clid && !referrer && !ref) return;
    if (atual && atual.utm_source && !temUtm) return;

    const nova: Origem = {
      utm_source: limpar(params.get('utm_source'), 80)?.toLowerCase() ?? clid ?? (referrer ? `site:${referrer}` : null),
      utm_medium: limpar(params.get('utm_medium'), 80)?.toLowerCase() ?? (clid ? 'cpc' : referrer ? 'referral' : null),
      utm_campaign: limpar(params.get('utm_campaign')),
      utm_content: limpar(params.get('utm_content')),
      utm_term: limpar(params.get('utm_term')),
      origem_referrer: referrer,
      origem_pagina: limpar(window.location.pathname, 200),
      origem_em: new Date().toISOString(),
      ref: ref ?? atual?.ref ?? null,
    };
    localStorage.setItem(CHAVE, JSON.stringify(nova));
  } catch {
    // sem storage: segue sem origem
  }
}
