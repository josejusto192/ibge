// Aceita qualquer URL "normal" do YouTube (inclusive vídeo não listado —
// não listado só significa que não aparece em busca/canal, a URL direta
// funciona igual para embed).
const YOUTUBE_ID_PATTERNS = [/youtu\.be\/([\w-]{11})/, /[?&]v=([\w-]{11})/, /youtube\.com\/embed\/([\w-]{11})/];

export function extractYoutubeId(url: string): string | null {
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
}
