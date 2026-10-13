import type { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import ModalFrame from './ModalFrame';

export default function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <ModalFrame title={title} onClose={onClose}>
      {(close) => (
        <div className="dialog-inner">
          <div className="section-heading">
            <h2>{title}</h2>
            <button className="icon-button" aria-label="Fechar" onClick={close}>
              <X size={21} />
            </button>
          </div>
          {children}
        </div>
      )}
    </ModalFrame>
  );
}
