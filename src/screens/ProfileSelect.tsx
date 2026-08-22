// Sélection de profil sur téléphone partagé (C4) : l'enfant reconnaît son animal.
import { useEffect } from 'preact/hooks'
import { audio } from '../audio'
import { voix } from '../voix'
import { avatarDe } from '../avatars'
import type { Profil } from '../db'
import { LogoMot } from '../components/Companion'

interface Props {
  profils: Profil[]
  onChoisir: (p: Profil) => void
  onCreer: () => void
}

export function SelectionProfil({ profils, onChoisir, onCreer }: Props) {
  useEffect(() => {
    audio.dire(voix(profils.length ? 'profils-choisir' : 'profils-premier'))
    return () => audio.stop()
  }, [])

  return (
    <div class="ecran">
      <LogoMot />
      <p class="devise">l'école dans la poche</p>
      <div class="grille-profils">
        {profils.map((p) => (
          <button key={p.id} class="carte-profil" onClick={() => onChoisir(p)}>
            <span class="avatar">{avatarDe(p.avatarId).emoji}</span>
            <span class="prenom">{p.prenom}</span>
          </button>
        ))}
        <button class="carte-profil nouveau" onClick={onCreer} aria-label="Nouveau profil">
          <span class="avatar">➕</span>
        </button>
      </div>
    </div>
  )
}
