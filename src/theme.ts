/** Charte Ollisanté : blanc et vert, texte bleu foncé, orange en accent (voir docs/charte-graphique.md). */
export const colors = {
  white: '#FFFFFF',
  green: '#176B50',
  greenPressed: '#0F5340',
  greenSoft: '#E8F3EE',
  navy: '#0F2A47',
  muted: '#5B6B7B',
  border: '#D6E2DC',
  orange: '#C2410C',
  orangeSoft: '#FDEEE3',
  gold: '#D9A441',
  terracotta: '#B85C38',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { card: 14, input: 12, button: 12, pill: 999 } as const;

export const type = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, color: colors.navy },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, color: colors.navy },
  h3: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const, color: colors.navy },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const, color: colors.navy },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, color: colors.muted },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const, color: colors.navy },
};
