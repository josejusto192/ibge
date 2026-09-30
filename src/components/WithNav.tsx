import type { ReactNode } from 'react';
import StudentNav from './StudentNav';
import BottomNav from './BottomNav';

export default function WithNav({ children }: { children: ReactNode }) {
  return (
    <div className="student-layout">
      <a className="skip-link" href="#student-content">
        Pular para o conteúdo
      </a>
      <StudentNav />
      <main id="student-content" className="student-main" tabIndex={-1}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
