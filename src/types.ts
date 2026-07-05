// Le contenu est de la donnée, pas du code (cadrage §3.5) :
// un module = un JSON déclaratif exécuté par le moteur d'exercices.
// L'équipe pédagogique produit les leçons sans toucher au code.
import type { Voix } from './audio'

export interface Choix {
  id: string
  /** Illustration emoji (phase 0) ou image (production). */
  emoji?: string
  /** Lettre/graphème affiché en grand (exercices d'association son ↔ lettre). */
  lettre?: string
  voix?: Voix
}

export type Etape =
  /** Étape passive : l'enfant écoute, regarde, puis continue. Non notée. */
  | { type: 'ecoute'; voix: Voix; illustration?: string; lettre?: string }
  /** Étapes notées : l'enfant touche la bonne réponse parmi 2-4 choix. */
  | {
      type: 'discrimination' | 'association' | 'choix-image'
      voix: Voix
      choix: Choix[]
      bonneReponse: string
    }

export interface Module {
  moduleId: string
  /** Compétence du référentiel validée par ce module (cadrage §9, étape 7). */
  skillId: string
  titre: string
  /** Pédagogie de la maîtrise : seuil de réussite pour valider la compétence (0.8 = 80 %). */
  seuilMaitrise: number
  etapes: Etape[]
}
