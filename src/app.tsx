// Orchestrateur : machine à états simple entre les écrans.
// Pas de routeur URL — l'app est un parcours guidé, pas un site (C1).
import { useEffect, useState } from 'preact/hooks'
import { db, type Profil } from './db'
import type { Module } from './types'
import { SelectionProfil } from './screens/ProfileSelect'
import { CreationProfil } from './screens/ProfileCreate'
import { EntreeCode } from './screens/CodeEntry'
import { Accueil } from './screens/Home'
import { Celebration } from './screens/Celebration'
import { Runner } from './engine/Runner'
import { LogoMot } from './components/Companion'

type Ecran =
  | { nom: 'selection' }
  | { nom: 'creation' }
  | { nom: 'code'; profil: Profil }
  | { nom: 'accueil'; profil: Profil }
  | { nom: 'session'; profil: Profil; module: Module }
  | { nom: 'celebration'; profil: Profil; module: Module; score: number; reussi: boolean; etage: number }

export function App() {
  const [profils, setProfils] = useState<Profil[] | null>(null)
  const [ecran, setEcran] = useState<Ecran>({ nom: 'selection' })

  async function recharger() {
    setProfils(await db.profils.toArray())
  }
  useEffect(() => {
    recharger()
  }, [])

  if (!profils) {
    return (
      <div class="ecran chargement">
        <LogoMot />
      </div>
    )
  }

  switch (ecran.nom) {
    case 'selection':
      return (
        <SelectionProfil
          profils={profils}
          onChoisir={(profil) => setEcran({ nom: 'code', profil })}
          onCreer={() => setEcran({ nom: 'creation' })}
        />
      )
    case 'creation':
      return (
        <CreationProfil
          onFini={(profil) => {
            recharger()
            setEcran({ nom: 'accueil', profil })
          }}
          onAnnuler={() => setEcran({ nom: 'selection' })}
        />
      )
    case 'code':
      return (
        <EntreeCode
          profil={ecran.profil}
          onOk={() => setEcran({ nom: 'accueil', profil: ecran.profil })}
          onRetour={() => setEcran({ nom: 'selection' })}
        />
      )
    case 'accueil':
      return (
        <Accueil
          profil={ecran.profil}
          onJouer={(module) => setEcran({ nom: 'session', profil: ecran.profil, module })}
          onChangerProfil={() => setEcran({ nom: 'selection' })}
        />
      )
    case 'session':
      return (
        <Runner
          profil={ecran.profil}
          module={ecran.module}
          onFin={async (score, reussi) => {
            const etage = Math.min(
              await db.progression
                .where('profilId')
                .equals(ecran.profil.id)
                .and((p) => p.statut === 'acquis')
                .count(),
              3,
            )
            setEcran({ nom: 'celebration', profil: ecran.profil, module: ecran.module, score, reussi, etage })
          }}
        />
      )
    case 'celebration':
      return (
        <Celebration
          profil={ecran.profil}
          score={ecran.score}
          reussi={ecran.reussi}
          etage={ecran.etage}
          onRejouer={() => setEcran({ nom: 'session', profil: ecran.profil, module: ecran.module })}
          onAccueil={() => setEcran({ nom: 'accueil', profil: ecran.profil })}
        />
      )
  }
}
