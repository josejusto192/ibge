import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// O enunciado/comentário vem como HTML raspado de terceiros (TecConcursos) e,
// hoje, a tabela `questoes` tem policies de RLS que permitem escrita por
// `anon` — então este conteúdo não é totalmente confiável. Sanitiza antes de
// injetar no DOM (bloqueia <script>, event handlers, etc.) e descarta
// atributos de estilo/fonte do HTML original para não brigar com o design
// do app (mantém só a semântica: negrito, itálico, sublinhado, links, imagens).
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'a', 'img', 'ul', 'ol', 'li'];
const FORBID_ATTR = ['style', 'class', 'align', 'border', 'width', 'height'];

// Fórmulas vêm como <span class="render-latex">\dfrac{3}{4}</span>. A classe
// é descartada na sanitização, então antes ela vira data-latex e, depois de
// sanitizado, o texto da fórmula é desenhado pelo KaTeX (que gera o próprio
// HTML a partir do texto, sem aproveitar nada do HTML original).
const MARCA_LATEX = /<span\b([^>]*)\bclass\s*=\s*(["'])[^"']*\brender-latex\b[^"']*\2/gi;

export function sanitizeHtml(html: string): string {
  const temFormula = /render-latex/i.test(html);
  const preparado = temFormula ? html.replace(MARCA_LATEX, '<span$1 data-latex="1"') : html;
  const limpo = DOMPurify.sanitize(preparado, { ALLOWED_TAGS, FORBID_ATTR });
  if (!temFormula || typeof DOMParser === 'undefined') return limpo;

  const doc = new DOMParser().parseFromString(`<div>${limpo}</div>`, 'text/html');
  const raiz = doc.body.firstElementChild;
  if (!raiz) return limpo;
  raiz.querySelectorAll('span[data-latex]').forEach((el) => {
    const tex = (el.textContent ?? '').replace(/ /g, ' ').trim();
    if (!tex) return;
    try {
      el.innerHTML = katex.renderToString(tex, { throwOnError: false, displayMode: false, strict: 'ignore', output: 'html' });
      el.setAttribute('class', 'formula');
    } catch {
      // fórmula inválida: fica o texto como veio
    }
    el.removeAttribute('data-latex');
  });
  return raiz.innerHTML;
}
