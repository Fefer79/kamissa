// Avatars et icônes de code visuel : tout est identifiable sans lecture (C1, C4).
// Ce que l'app prononce quand l'enfant choisit vit dans voix-interface.json,
// sous les clés `avatar-<id>` et `icone-<id>` — une seule source pour le texte
// parlé, sinon l'audio livré et le texte de repli finissent par diverger.
// `as const` rend les id littéraux : tsc vérifie que chaque id a bien sa voix.

export interface Icone {
  id: string
  emoji: string
}

export const AVATARS = [
  { id: 'elephant', emoji: '🐘' },
  { id: 'lion', emoji: '🦁' },
  { id: 'oiseau', emoji: '🐦' },
  { id: 'poisson', emoji: '🐠' },
  { id: 'papillon', emoji: '🦋' },
  { id: 'tortue', emoji: '🐢' },
  { id: 'abeille', emoji: '🐝' },
  { id: 'chevre', emoji: '🐐' },
] as const satisfies readonly Icone[]

export const ICONES_CODE = [
  { id: 'etoile', emoji: '⭐' },
  { id: 'mangue', emoji: '🥭' },
  { id: 'fleur', emoji: '🌺' },
  { id: 'lune', emoji: '🌙' },
  { id: 'tambour', emoji: '🥁' },
  { id: 'soleil', emoji: '☀️' },
] as const satisfies readonly Icone[]

export type Avatar = (typeof AVATARS)[number]
export type IconeCode = (typeof ICONES_CODE)[number]

export function avatarDe(avatarId: string): Icone {
  return AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0]
}
