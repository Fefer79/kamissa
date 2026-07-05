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

  /** Joue une voix : fichier si disponible, sinon repli TTS prototype. Résout à la fin de la lecture. */
  async dire(voix?: Voix): Promise<void> {
    if (!voix) return
    this.stop()
    if (voix.audio) {
      const ok = await this.jouerFichier(voix.audio)
      if (ok) return
    }
    if (voix.tts) await this.jouerTTS(voix.tts)
  }

  stop(): void {
    this.courant?.pause()
    this.courant = null
    if ('speechSynthesis' in window) speechSynthesis.cancel()
  }

  private jouerFichier(nom: string): Promise<boolean> {
    return new Promise((resolve) => {
      const el = new Audio(`/content/audio/${nom}`)
      this.courant = el
      el.onended = () => resolve(true)
      el.onerror = () => resolve(false)
      el.play().catch(() => resolve(false))
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
