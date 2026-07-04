import type { ReactNode } from 'react';
import { useAppState } from '../state/AppStateContext';
import MentorSheet from './sheets/MentorSheet';

export default function PhoneShell({ children }: { children: ReactNode }) {
  const { state } = useAppState();

  return (
    <div className="flex min-h-dvh items-center justify-center p-0 sm:p-6">
      <div
        className="relative flex flex-col overflow-hidden bg-app-bg sm:rounded-[34px]"
        style={{
          width: 'min(432px, 100vw)',
          height: 'min(936px, 100dvh)',
          boxShadow: '0 40px 90px -20px rgba(11,31,77,.45)',
        }}
      >
        {children}

        <MentorSheet />

        {state.navLoading && (
          <div className="absolute inset-0 z-[60] flex animate-fade-quick items-center justify-center bg-app-bg">
            <div className="h-11 w-11 animate-spin-fast rounded-full border-4 border-border" style={{ borderTopColor: '#1557E6' }} />
          </div>
        )}
      </div>
    </div>
  );
}
