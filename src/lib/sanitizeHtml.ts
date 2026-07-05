import DOMPurify from 'dompurify';

// O enunciado/comentário vem como HTML raspado de terceiros (TecConcursos) e,
// hoje, a tabela `questoes` tem policies de RLS que permitem escrita por
// `anon` — então este conteúdo não é totalmente confiável. Sanitiza antes de
// injetar no DOM (bloqueia <script>, event handlers, etc.) e descarta
// atributos de estilo/fonte do HTML original para não brigar com o design
// do app (mantém só a semântica: negrito, itálico, sublinhado, links, imagens).
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'a', 'img', 'ul', 'ol', 'li'];
const FORBID_ATTR = ['style', 'class', 'align', 'border', 'width', 'height'];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, FORBID_ATTR });
}
