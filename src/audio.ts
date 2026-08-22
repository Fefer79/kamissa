// L'audio EST l'interface (contrainte C1 : l'enfant ne sait pas lire).
// Production : voix humaine enregistrée, Opus ~24 kbps (cadrage §3.2).
// La synthèse vocale (speechSynthesis) sert UNIQUEMENT de prototype de développement —
// elle ne doit JAMAIS être livrée en production.

export interface Voix {
  /** Fichier audio sous /content/audio/ (voix humaine — production). */
  audio?: string
  /** Texte lu par synthèse vocale — PROTOTYPE uniquement. */
  tts?: string
}

class AudioManager {
  private courant: HTMLAudioElement | null = null
  private finCourant: ((ok: boolean) => void) | null = null
  private generation = 0

  /** Joue une voix : fichier si disponible, sinon repli TTS prototype. Résout à la fin de la lecture. */
  async dire(voix?: Voix): Promise<void> {
    if (!voix) return
    this.stop()
    const gen = this.generation
    if (voix.audio) {
      const ok = await this.jouerFichier(voix.audio)
      // Interrompu entre-temps : une voix plus récente a pris la main, on ne dit rien de plus.
      if (gen !== this.generation) return
      if (ok) return
    }
    if (voix.tts) await this.jouerTTS(voix.tts)
  }

  stop(): void {
    this.generation++
    this.courant?.pause()
    this.courant = null
    // Débloque la lecture en cours : un élément pausé ne déclenchera jamais
    // onended/onerror — sans cela, la promesse de dire() ne résoudrait jamais.
    this.finCourant?.(false)
    this.finCourant = null
    if ('speechSynthesis' in window) speechSynthesis.cancel()
  }

  private jouerFichier(nom: string): Promise<boolean> {
    return new Promise((resolve) => {
      const el = new Audio(`/content/audio/${nom}`)
      this.courant = el
      // On ne libère que si l'élément est toujours celui en cours : un stop()
      // suivi d'une autre lecture a pu prendre la main entre-temps.
      const finir = (ok: boolean) => {
        if (this.courant === el) {
          this.courant = null
          this.finCourant = null
        }
        resolve(ok)
      }
      this.finCourant = finir
      el.onended = () => finir(true)
      el.onerror = () => finir(false)
      el.play().catch(() => finir(false))
    })
  }

  private jouerTTS(texte: string): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) return resolve()
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(texte)
      u.lang = 'fr-FR'
      u.rate = 0.95
      let fini = false
      const terminer = () => {
        if (fini) return
        fini = true
        clearInterval(garde)
        clearTimeout(plafond)
        resolve()
      }
      u.onend = terminer
      u.onerror = terminer
      // Filets de sécurité : selon les appareils, speak() peut ne jamais
      // déclencher onend (aucune voix installée) ou rester bloqué en
      // `speaking` (sortie audio défaillante). Le parcours ne doit JAMAIS
      // rester bloqué sur l'audio :
      // 1. si rien ne se joue, on résout vite ;
      const garde = setInterval(() => {
        if (!speechSynthesis.speaking && !speechSynthesis.pending) terminer()
      }, 500)
      // 2. plafond dur proportionnel à la longueur du texte (~vitesse de parole).
      const plafond = setTimeout(terminer, Math.min(2000 + texte.length * 120, 12000))
      speechSynthesis.speak(u)
    })
  }
}

export const audio = new AudioManager()
