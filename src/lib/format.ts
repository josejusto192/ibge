export function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

export function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}

export const QUESTIONS_PER_DAY: Record<number, number> = { 5: 10, 10: 20, 15: 30, 20: 40 };
export const PRAZO_DAYS: Record<string, number> = { menos1: 25, '1a3': 70, '3a6': 150, naosei: 120 };
