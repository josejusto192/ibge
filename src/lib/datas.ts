// Datas no fuso do aparelho do aluno (formato AAAA-MM-DD) — é o "dia" que
// ele vive: estudar às 23h conta pra hoje, não pro dia seguinte em UTC.
export function diaLocal(data: Date = new Date()): string {
  return data.toLocaleDateString('en-CA');
}

export function diaLocalDeslocado(dias: number, base: Date = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return diaLocal(d);
}
