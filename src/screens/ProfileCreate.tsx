// Création de profil guidée à la voix (C1, C5) :
// 1. l'enfant choisit son animal ; 2. son code secret de 3 images (C4) ;
// 3. le champion écrit le prénom (seule étape « lettrée », assistée).
import { useEffect, useState } from 'preact/hooks'
import { audio } from '../audio'
import { AVATARS, ICONES_CODE, type Icone } from '../avatars'
import { db, emettreEvenement, genUuid, type Profil } from '../db'

type SousEtape = 'avatar' | 'code' | 'prenom'

interface Props {
  onFini: (p: Profil) => void
  onAnnuler: () => void
}

export function CreationProfil({ onFini, onAnnuler }: Props) {
  const [sousEtape, setSousEtape] = useState<SousEtape>('avatar')
  const [avatarId, setAvatarId] = useState('')
  const [code, setCode] = useState<string[]>([])
  const [prenom, setPrenom] = useState('')

  useEffect(() => {
    const consignes: Record<SousEtape, string> = {
      avatar: 'Choisis ton animal ! Touche celui que tu préfères.',
      code: 'Maintenant, choisis ton code secret : touche trois images, dans l’ordre. Retiens-les bien !',
      prenom: 'Demande à ton champion d’écrire ton prénom.',
    }
    audio.dire({ tts: consignes[sousEtape] })
    return () => audio.stop()
  }, [sousEtape])

  function choisirAvatar(a: Icone) {
    setAvatarId(a.id)
    audio.dire({ tts: `Tu as choisi ${a.nom} ! Super !` }).then(() => setSousEtape('code'))
  }

  function toucherIcone(i: Icone) {
    if (code.length >= 3) return
    const nouveau = [...code, i.id]
    setCode(nouveau)
    if (nouveau.length === 3) {
      audio.dire({ tts: 'Voici ton code secret. Retiens-le bien !' })
    } else {
      audio.dire({ tts: i.nom })
    }
  }

  async function enregistrer() {
    const profil: Profil = {
      id: genUuid(),
      prenom: prenom.trim() || 'Ami',
      avatarId,
      codeVisuel: code,
      createdAt: Date.now(),
    }
    await db.profils.add(profil)
    await emettreEvenement(profil.id, 'profile_created', { avatarId })
    onFini(profil)
  }

  return (
    <div class="ecran">
      <button class="btn-retour" onClick={onAnnuler} aria-label="Retour">
        ↩
      </button>

      {sousEtape === 'avatar' && (
        <div class="grille-choix large">
          {AVATARS.map((a) => (
            <button key={a.id} class="carte-choix" onClick={() => choisirAvatar(a)}>
              {a.emoji}
            </button>
          ))}
        </div>
      )}

      {sousEtape === 'code' && (
        <>
          <div class="slots-code">
            {[0, 1, 2].map((i) => (
              <span key={i} class={`slot ${code[i] ? 'rempli' : ''}`}>
                {code[i] ? ICONES_CODE.find((c) => c.id === code[i])?.emoji : ''}
              </span>
            ))}
          </div>
          <div class="grille-choix large">
            {ICONES_CODE.map((i) => (
              <button key={i.id} class="carte-choix" onClick={() => toucherIcone(i)}>
                {i.emoji}
              </button>
            ))}
          </div>
          <div class="rangee-boutons">
            <button class="btn-secondaire" onClick={() => setCode([])} aria-label="Effacer">
              ✖
            </button>
            {code.length === 3 && (
              <button class="btn-principal" onClick={() => setSousEtape('prenom')} aria-label="Continuer">
                ➜
              </button>
            )}
          </div>
        </>
      )}

      {sousEtape === 'prenom' && (
        <>
          <p class="aide-champion">👤 Champion : écris le prénom de l'enfant</p>
          <input
            class="champ-prenom"
            type="text"
            value={prenom}
            onInput={(e) => setPrenom((e.target as HTMLInputElement).value)}
            maxLength={20}
            autocomplete="off"
          />
          <button class="btn-principal" onClick={enregistrer} aria-label="Valider">
            ✓
          </button>
        </>
      )}
    </div>
  )
}
