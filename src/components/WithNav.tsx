import type { ReactNode } from 'react';
import BottomNav from './BottomNav';

export default function WithNav({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
