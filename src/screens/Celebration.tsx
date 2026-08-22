// Célébration de fin de module : la réussite se voit et s'entend (C1).
// En cas d'échec au seuil, jamais de sanction — on encourage et on réessaie
// (pédagogie de la maîtrise, cadrage §3.5).
import { useEffect } from 'preact/hooks'
import { audio } from '../audio'
import type { Profil } from '../db'
import { Compagnon } from '../components/Companion'
import { voix } from '../voix'

interface Props {
  profil: Profil
  score: number
  reussi: boolean
  etage: number
  onRejouer: () => void
  onAccueil: () => void
}

export function Celebration({ profil, reussi, etage, onRejouer, onAccueil }: Props) {
  useEffect(() => {
    audio.dire(voix(reussi ? 'celebration-reussi' : 'celebration-encore'))
    return () => audio.stop()
  }, [])

  return (
    <div class={`ecran celebration ${reussi ? 'reussi' : ''}`}>
      {reussi && <div class="etoiles">⭐ 🌟 ⭐</div>}
      <Compagnon etage={etage} />
      <div class="rangee-boutons">
        <button class="btn-secondaire" onClick={onRejouer} aria-label="Rejouer">
          ↺
        </button>
        <button class="btn-principal" onClick={onAccueil} aria-label="Accueil">
          🏠
        </button>
      </div>
    </div>
  )
}
