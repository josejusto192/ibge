import { X } from '@phosphor-icons/react';
import { youtubeEmbedUrl } from '../../lib/youtube';

export default function VideoSheet({ titulo, videoUrl, onClose }: { titulo: string; videoUrl: string; onClose: () => void }) {
  const embedUrl = youtubeEmbedUrl(videoUrl);

  return (
    <>
      <div onClick={onClose} className="absolute inset-0 z-[28] bg-[rgba(11,31,77,.55)]" />
      <div className="scr absolute inset-x-0 bottom-0 z-[29] max-h-[88%] overflow-y-auto rounded-t-[26px] bg-surface pb-6 animate-sheet-up">
        <div className="relative p-[18px_18px_0]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-[1] flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border-none bg-[rgba(11,31,77,.08)] text-ink"
          >
            <X weight="bold" size={15} />
          </button>
          <div className="font-sans text-[10px] font-extrabold tracking-[1.5px] text-text3">AULA EXTRA · OPCIONAL</div>
          <div className="mt-1 pr-10 font-display text-[18px] font-extrabold leading-[1.25] text-ink">{titulo}</div>

          <div className="mt-4 overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '16 / 9' }}>
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center font-sans text-[13px] font-semibold text-white/70">
                Link de vídeo inválido.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
