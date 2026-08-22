// Accueil de l'enfant : son compagnon-manguier et le bouton pour jouer.
// Phase 0 : un seul module de démonstration. Phase 1 : le parcours complet
// du niveau 1 avec graphe de prérequis porté par le contenu (cadrage §3.5).
import { useEffect, useState } from 'preact/hooks'
import { audio } from '../audio'
import { voix } from '../voix'
import { avatarDe } from '../avatars'
import { db, type Profil } from '../db'
import type { Module } from '../types'
import { Compagnon } from '../components/Companion'

const MODULE_DU_JOUR = 'n1-sons-a'

interface Props {
  profil: Profil
  onJouer: (m: Module) => void
  onChangerProfil: () => void
}

export function Accueil({ profil, onJouer, onChangerProfil }: Props) {
  const [etage, setEtage] = useState(0)

  useEffect(() => {
    db.progression
      .where('profilId')
      .equals(profil.id)
      .and((p) => p.statut === 'acquis')
      .count()
      .then((n) => setEtage(Math.min(n, 3)))
    audio.dire(voix('accueil-bonjour'))
    return () => audio.stop()
  }, [])

  async function jouer() {
    try {
      const rep = await fetch(`/content/modules/${MODULE_DU_JOUR}/module.json`)
      if (!rep.ok) throw new Error(`module ${MODULE_DU_JOUR} : HTTP ${rep.status}`)
      const mod: Module = await rep.json()
      onJouer(mod)
    } catch {
      // Sans ce garde-fou, un échec de chargement laisserait l'enfant taper ▶ sans rien.
      audio.dire(voix('accueil-erreur'))
    }
  }

  return (
    <div class="ecran accueil">
      <header class="entete-profil">
        <span class="avatar">{avatarDe(profil.avatarId).emoji}</span>
        <span class="prenom">{profil.prenom}</span>
        <button class="btn-retour" onClick={onChangerProfil} aria-label="Changer de profil">
          ↩
        </button>
      </header>
      <Compagnon etage={etage} />
      <button class="btn-principal grand" onClick={jouer} aria-label="Jouer">
        ▶
      </button>
    </div>
  )
}
