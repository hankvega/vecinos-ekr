export function paginar<T>(lista: T[], page: number, per = 20) {
  const total = lista.length;
  const paginas = Math.max(1, Math.ceil(total / per));
  const actual = Math.min(Math.max(1, page), paginas);
  const desde = (actual - 1) * per;
  return { vista: lista.slice(desde, desde + per), total, paginas, actual, desde, hasta: Math.min(desde + per, total) };
}