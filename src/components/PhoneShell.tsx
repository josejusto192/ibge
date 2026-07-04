import type { ReactNode } from 'react';
import { useAppState } from '../state/AppStateContext';
import MentorSheet from './sheets/MentorSheet';

export default function PhoneShell({ children }: { children: ReactNode }) {
  const { state } = useAppState();

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-app-bg">
      {children}

      <MentorSheet />

      {state.navLoading && (
        <div className="absolute inset-0 z-[60] flex animate-fade-quick items-center justify-center bg-app-bg">
          <div className="h-11 w-11 animate-spin-fast rounded-full border-4 border-border" style={{ borderTopColor: '#1557E6' }} />
        </div>
      )}
    </div>
  );
}
