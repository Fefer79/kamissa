// Entrée du code visuel : identification, pas sécurité (C4/C6) —
// on n'enferme jamais un enfant dehors, il peut réessayer sans limite.
import { useEffect, useState } from 'preact/hooks'
import { audio } from '../audio'
import { avatarDe, ICONES_CODE, type IconeCode } from '../avatars'
import { voix } from '../voix'
import type { Profil } from '../db'

interface Props {
  profil: Profil
  onOk: () => void
  onRetour: () => void
}

export function EntreeCode({ profil, onOk, onRetour }: Props) {
  const [saisie, setSaisie] = useState<string[]>([])
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    audio.dire(voix('code-consigne'))
    return () => audio.stop()
  }, [])

  function toucher(i: IconeCode) {
    if (saisie.length >= 3) return
    setErreur(false)
    const nouveau = [...saisie, i.id]
    setSaisie(nouveau)
    if (nouveau.length === 3) {
      if (nouveau.every((id, idx) => id === profil.codeVisuel[idx])) {
        audio.dire(voix('code-bienvenue')).then(onOk)
      } else {
        setErreur(true)
        audio.dire(voix('code-faux'))
        setTimeout(() => setSaisie([]), 700)
      }
    }
  }

  return (
    <div class="ecran">
      <button class="btn-retour" onClick={onRetour} aria-label="Retour">
        ↩
      </button>
      <span class="avatar-grand">{avatarDe(profil.avatarId).emoji}</span>
      <div class={`slots-code ${erreur ? 'erreur' : ''}`}>
        {[0, 1, 2].map((i) => (
          <span key={i} class={`slot ${saisie[i] ? 'rempli' : ''}`}>
            {saisie[i] ? ICONES_CODE.find((c) => c.id === saisie[i])?.emoji : ''}
          </span>
        ))}
      </div>
      <div class="grille-choix large">
        {ICONES_CODE.map((i) => (
          <button key={i.id} class="carte-choix" onClick={() => toucher(i)}>
            {i.emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
