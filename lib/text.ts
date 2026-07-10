// Minúsculas y sin acentos, para comparar texto ingresado por el usuario sin importar tildes.
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
