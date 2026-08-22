// Catalogue des voix de l'interface (C1 : l'audio EST l'interface).
// Les textes vivent dans voix-interface.json — source unique, lue à la fois par
// l'app (repli prototype) et par tools/audio/generer_audio.py (fichiers livrés).
// Ajouter une ligne ici, relancer le générateur : rien d'autre à synchroniser.
import textes from './voix-interface.json'
import type { Voix } from './audio'

export type CleVoix = keyof typeof textes

/** La voix d'une clé du catalogue : fichier livré, texte en repli prototype. */
export function voix(cle: CleVoix): Voix {
  return { audio: `ui/${cle}.opus`, tts: textes[cle] }
}
