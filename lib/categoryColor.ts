// Asigna un color distinto a cada categoría según su posición de creación dentro de su tipo
// (ingreso/gasto/ahorro), usando el ángulo dorado para que los tonos nunca se repitan ni se
// agrupen, sin importar cuántas categorías tenga el usuario.
const GOLDEN_ANGLE = 137.508;

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function categoryColorForIndex(index: number): string {
  const hue = (index * GOLDEN_ANGLE) % 360;
  return hslToHex(hue, 65, 50);
}
