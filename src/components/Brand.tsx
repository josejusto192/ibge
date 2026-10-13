import Mascot from './Mascot';

// Logo: o Foco (mascote, mesmo nome do app) + "foco."
export default function Brand({ light = false, caption }: { light?: boolean; caption?: string }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <Mascot mood="idle" size={46} />
      </span>
      <div>
        <span className="brand-name">
          foco<span>.</span>
        </span>
        {caption && <small>{caption}</small>}
      </div>
    </div>
  );
}
