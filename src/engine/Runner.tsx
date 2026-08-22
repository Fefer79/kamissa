// Le moteur de session : déroule les étapes d'un module, note les premiers essais,
// applique la pédagogie de la maîtrise (seuil 80 %, cadrage §3.5) et journalise
// chaque événement dans l'outbox (cadrage §7 : la preuve avant tout).
import { useEffect, useRef, useState } from 'preact/hooks'
import { db, emettreEvenement, type Profil } from '../db'
import type { Module } from '../types'
import { Ecoute, ExerciceChoix } from './exercises'

const DEUX_JOURS = 2 * 24 * 3600 * 1000

interface Props {
  profil: Profil
  module: Module
  onFin: (score: number, reussi: boolean) => void
}

export function Runner({ profil, module: mod, onFin }: Props) {
  const [index, setIndex] = useState(0)
  const resultats = useRef<boolean[]>([])
  const finDemandee = useRef(false)

  useEffect(() => {
    emettreEvenement(profil.id, 'session_started', { moduleId: mod.moduleId })
  }, [])

  const etape = mod.etapes[index]
  const nbNotees = mod.etapes.filter((e) => e.type !== 'ecoute').length

  function suivante(premierEssaiJuste?: boolean) {
    if (etape.type !== 'ecoute') {
      resultats.current.push(!!premierEssaiJuste)
      emettreEvenement(profil.id, 'step_answered', {
        moduleId: mod.moduleId,
        etape: index,
        type: etape.type,
        juste: !!premierEssaiJuste,
      })
    }
    if (index + 1 < mod.etapes.length) {
      setIndex(index + 1)
    } else if (!finDemandee.current) {
      // Garde contre le double-tap sur la dernière étape : sans elle, terminer()
      // tournerait deux fois (événements en double, tentatives incrémentées deux fois).
      finDemandee.current = true
      terminer()
    }
  }

  async function terminer() {
    const justes = resultats.current.filter(Boolean).length
    const score = nbNotees ? justes / nbNotees : 1
    const reussi = score >= mod.seuilMaitrise

    // La persistance peut échouer (IndexedDB saturé, navigation privée). L'enfant
    // ne doit jamais rester sur la dernière étape pour autant : la célébration est
    // due, la trace se rattrapera à la session suivante.
    try {
      await emettreEvenement(profil.id, 'lesson_completed', {
        moduleId: mod.moduleId,
        score,
        reussi,
      })

      // Progression : acquis si ≥ seuil ; révision espacée programmée à J+2
      // (l'algorithme complet — SM-2 allégé — arrive en phase 1).
      const existante = await db.progression
        .where('[profilId+skillId]')
        .equals([profil.id, mod.skillId])
        .first()
      const dejaAcquis = existante?.statut === 'acquis'
      const maintenant = Date.now()
      await db.progression.put({
        ...existante,
        profilId: profil.id,
        skillId: mod.skillId,
        statut: reussi || dejaAcquis ? 'acquis' : 'en-cours',
        score: Math.max(score, existante?.score ?? 0),
        tentatives: (existante?.tentatives ?? 0) + 1,
        lastReviewAt: maintenant,
        nextReviewAt: maintenant + DEUX_JOURS,
      })
      if (reussi && !dejaAcquis) {
        await emettreEvenement(profil.id, 'skill_validated', { skillId: mod.skillId, score })
      }
    } catch (e) {
      console.error('kamissa : progression non enregistrée', e)
    }
    onFin(score, reussi)
  }

  return (
    <div class="ecran session">
      <div class="points-progression" role="progressbar" aria-valuenow={index + 1} aria-valuemax={mod.etapes.length}>
        {mod.etapes.map((_, i) => (
          <span key={i} class={`point ${i < index ? 'fait' : i === index ? 'actif' : ''}`} />
        ))}
      </div>
      {etape.type === 'ecoute' ? (
        <Ecoute key={index} etape={etape} onSuite={() => suivante()} />
      ) : (
        <ExerciceChoix key={index} etape={etape} onSuite={suivante} />
      )}
    </div>
  )
}
