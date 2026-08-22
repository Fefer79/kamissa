// Les types d'exercices du moteur (cadrage §3.5).
// Phase 0 : `ecoute` (passif) + `ExerciceChoix` qui couvre discrimination,
// association et choix-image (même mécanique, présentation différente).
import { useEffect, useRef, useState } from 'preact/hooks'
import { audio, type Voix } from '../audio'
import { voix } from '../voix'
import type { Choix, Etape } from '../types'

const VOIX_BRAVO = [voix('bravo-1'), voix('bravo-2'), voix('bravo-3')]
const VOIX_ESSAIE = [voix('essaie-1'), voix('essaie-2')]

let compteurBravo = 0
let compteurEssaie = 0

/** Bouton haut-parleur : l'enfant peut réécouter la consigne autant qu'il veut. */
function BoutonRejouer({ consigne }: { consigne: Voix }) {
  return (
    <button class="btn-rejouer" onClick={() => audio.dire(consigne)} aria-label="Réécouter">
      🔊
    </button>
  )
}

/** Étape passive : écouter et regarder, puis continuer. */
export function Ecoute({
  etape,
  onSuite,
}: {
  etape: Extract<Etape, { type: 'ecoute' }>
  onSuite: () => void
}) {
  useEffect(() => {
    audio.dire(etape.voix)
    return () => audio.stop()
  }, [])

  return (
    <div class="exercice">
      <BoutonRejouer consigne={etape.voix} />
      <div class="scene">
        {etape.lettre && <div class="grande-lettre">{etape.lettre}</div>}
        {etape.illustration && <div class="grande-illustration">{etape.illustration}</div>}
      </div>
      <button class="btn-principal" onClick={onSuite} aria-label="Continuer">
        ➜
      </button>
    </div>
  )
}

/**
 * Exercice à choix : l'enfant touche la bonne réponse.
 * Le score compte le premier essai ; l'enfant réessaie ensuite jusqu'à trouver
 * (on ne laisse jamais un enfant sur un échec — pédagogie de la maîtrise).
 */
export function ExerciceChoix({
  etape,
  onSuite,
}: {
  etape: Extract<Etape, { type: 'discrimination' | 'association' | 'choix-image' }>
  onSuite: (premierEssaiJuste: boolean) => void
}) {
  const [etats, setEtats] = useState<Record<string, 'juste' | 'faux'>>({})
  const premierEssai = useRef(true)
  const termine = useRef(false)

  useEffect(() => {
    audio.dire(etape.voix)
    return () => audio.stop()
  }, [])

  async function toucher(c: Choix) {
    if (termine.current) return
    if (c.id === etape.bonneReponse) {
      termine.current = true
      const juste = premierEssai.current
      setEtats((e) => ({ ...e, [c.id]: 'juste' }))
      await audio.dire(VOIX_BRAVO[compteurBravo++ % VOIX_BRAVO.length])
      onSuite(juste)
    } else {
      premierEssai.current = false
      setEtats((e) => ({ ...e, [c.id]: 'faux' }))
      audio.dire(VOIX_ESSAIE[compteurEssaie++ % VOIX_ESSAIE.length])
    }
  }

  return (
    <div class="exercice">
      <BoutonRejouer consigne={etape.voix} />
      <div class="grille-choix">
        {etape.choix.map((c) => (
          <button
            key={c.id}
            class={`carte-choix ${etats[c.id] ?? ''}`}
            onClick={() => toucher(c)}
          >
            {c.lettre ? <span class="lettre">{c.lettre}</span> : <span>{c.emoji}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
