// Avatars et icônes de code visuel : tout est identifiable sans lecture (C1, C4).
// Le `nom` sert à la voix (l'app prononce ce que l'enfant vient de choisir).

export interface Icone {
  id: string
  emoji: string
  nom: string
}

export const AVATARS: Icone[] = [
  { id: 'elephant', emoji: '🐘', nom: "l'éléphant" },
  { id: 'lion', emoji: '🦁', nom: 'le lion' },
  { id: 'oiseau', emoji: '🐦', nom: "l'oiseau" },
  { id: 'poisson', emoji: '🐠', nom: 'le poisson' },
  { id: 'papillon', emoji: '🦋', nom: 'le papillon' },
  { id: 'tortue', emoji: '🐢', nom: 'la tortue' },
  { id: 'abeille', emoji: '🐝', nom: "l'abeille" },
  { id: 'chevre', emoji: '🐐', nom: 'la chèvre' },
]

export const ICONES_CODE: Icone[] = [
  { id: 'etoile', emoji: '⭐', nom: "l'étoile" },
  { id: 'mangue', emoji: '🥭', nom: 'la mangue' },
  { id: 'fleur', emoji: '🌺', nom: 'la fleur' },
  { id: 'lune', emoji: '🌙', nom: 'la lune' },
  { id: 'tambour', emoji: '🥁', nom: 'le tambour' },
  { id: 'soleil', emoji: '☀️', nom: 'le soleil' },
]

export function avatarDe(avatarId: string): Icone {
  return AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0]
}
