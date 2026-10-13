import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ModalFrameProps {
  title: string;
  onClose: () => void;
  sheet?: boolean;
  className?: string;
  children: (close: () => void) => ReactNode;
}

export default function ModalFrame({ title, onClose, sheet = false, className = '', children }: ModalFrameProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef<number | null>(null);
  const closing = useRef(false);
  const latestClose = useRef(onClose);
  const [exiting, setExiting] = useState(false);
  latestClose.current = onClose;

  useEffect(() => {
    const element = ref.current!;
    element.showModal();
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      element.close();
    };
  }, []);

  function close() {
    if (closing.current) return;
    closing.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      latestClose.current();
      return;
    }
    setExiting(true);
    timer.current = window.setTimeout(() => latestClose.current(), 220);
  }

  return (
    <dialog
      ref={ref}
      className={`foco-dialog ${sheet ? 'foco-sheet' : ''} ${className}`}
      aria-label={title}
      data-closing={exiting || undefined}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          close();
      }}
    >
      {children(close)}
    </dialog>
  );
}
