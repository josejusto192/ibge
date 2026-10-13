import { youtubeEmbedUrl } from '../../lib/youtube';
import Dialog from '../Dialog';

export default function VideoSheet({
  titulo,
  videoUrl,
  descricao = 'Aula extra · opcional',
  onClose,
}: {
  titulo: string;
  videoUrl: string;
  descricao?: string;
  onClose: () => void;
}) {
  const embedUrl = youtubeEmbedUrl(videoUrl);
  return (
    <Dialog title={titulo} onClose={onClose}>
      <p className="dialog-description">{descricao}</p>
      <div className="overflow-hidden rounded-2xl bg-black aspect-video">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-white">
            O vídeo não está disponível. Tente novamente mais tarde.
          </div>
        )}
      </div>
    </Dialog>
  );
}
