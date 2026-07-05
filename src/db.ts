// Modèle de données local (IndexedDB via Dexie) — cadrage §3.4.
// L'app est pleinement fonctionnelle sans backend : la table `outbox` accumule
// les événements d'apprentissage (append-only, UUID idempotents) en attendant
// une synchro opportuniste (phase 2, cadrage §3.3).
import Dexie, { type EntityTable } from 'dexie'

export interface Profil {
  id: string
  prenom: string
  avatarId: string
  /** Séquence de 3 icônes choisies par l'enfant — identification sans lecture (C4). */
  codeVisuel: string[]
  createdAt: number
  circleId?: string
}

export interface Progression {
  id?: number
  profilId: string
  skillId: string
  statut: 'en-cours' | 'acquis'
  score: number
  tentatives: number
  lastReviewAt: number
  /** Répétition espacée : prochain rappel programmé (moteur complet en phase 1). */
  nextReviewAt: number
}

export interface EvenementOutbox {
  uuid: string
  profilId: string
  type: string
  payload: Record<string, unknown>
  createdAt: number
  syncedAt?: number
}

export const db = new Dexie('kamissa') as Dexie & {
  profils: EntityTable<Profil, 'id'>
  progression: EntityTable<Progression, 'id'>
  outbox: EntityTable<EvenementOutbox, 'uuid'>
  settings: EntityTable<{ key: string; value: unknown }, 'key'>
}

db.version(1).stores({
  profils: 'id, createdAt',
  progression: '++id, [profilId+skillId], profilId, nextReviewAt',
  outbox: 'uuid, profilId, createdAt, syncedAt',
  settings: 'key',
})

/** UUID v4 avec repli pour les vieux WebViews sans crypto.randomUUID (Chrome < 92). */
export function genUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Journalise un événement d'apprentissage dans l'outbox (jamais bloquant pour l'enfant). */
export async function emettreEvenement(
  profilId: string,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.outbox.add({ uuid: genUuid(), profilId, type, payload, createdAt: Date.now() })
  } catch {
    // Un échec de journalisation ne doit jamais interrompre une session d'apprentissage.
  }
}
