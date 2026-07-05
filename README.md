# kamissa — l'école dans la poche

PWA d'alphabétisation autonome pour les enfants de 6 à 14 ans hors du système scolaire — Côte d'Ivoire & Afrique de l'Ouest. Offline-first, audio-first, téléphone partagé.

📄 **Documents de référence** : [`docs/CADRAGE_TECHNIQUE.md`](docs/CADRAGE_TECHNIQUE.md) (architecture et roadmap) · `docs/KAMISSA_Note_Conceptuelle_3.docx` (le projet) · [`docs/KAMISSA_Logo_Declinaisons.html`](docs/KAMISSA_Logo_Declinaisons.html) (charte graphique).

## Démarrer

```bash
npm install
npm run dev       # développement
npm run build     # tsc + build production (dist/)
npm run preview   # servir le build
```

## Stack

Preact + Vite + vite-plugin-pwa (Workbox) + Dexie (IndexedDB). Zéro framework CSS — la charte tient dans `src/styles/theme.css`. Polices auto-hébergées (`public/fonts/`, sous-ensemble latin, 73 Ko).

## Structure

```
src/
  app.tsx               machine à états entre les écrans
  audio.ts              gestionnaire audio — l'audio EST l'interface (C1)
  db.ts                 IndexedDB : profils, progression, outbox d'événements
  types.ts              modèle de contenu (un module = un JSON déclaratif)
  avatars.ts            avatars + icônes du code visuel
  engine/
    Runner.tsx          déroule un module, seuil de maîtrise 80 %, journalise tout
    exercises.tsx       types d'exercices : écoute, discrimination, association, choix-image
  screens/              sélection/création de profil, code visuel, accueil, célébration
  components/
    Companion.tsx       le manguier qui pousse sur le livre (l'emblème qui se construit)
public/
  content/modules/      contenu pédagogique versionné (JSON + audio)
  fonts/  icons/        assets auto-hébergés (offline strict, C2)
```

## État — Phase 0 (squelette)

- ✅ PWA installable, 100 % offline après premier chargement (precache Workbox)
- ✅ Multi-profils sur téléphone partagé : avatar + code visuel de 3 icônes (C4)
- ✅ Moteur d'exercices (4 types) piloté par le contenu JSON
- ✅ Module de démonstration : le son « a » (8 étapes, 6 notées, seuil 80 %)
- ✅ Progression + événements d'apprentissage dans l'outbox (prêts pour la synchro phase 2)
- ✅ Compagnon de progression (le manguier du logo, étages 0→3)

### ⚠️ Prototype audio

Les voix passent par la **synthèse vocale du navigateur** (`speechSynthesis`) en attendant les enregistrements humains. Le gestionnaire (`src/audio.ts`) essaie d'abord le fichier `audio` du module, puis se replie sur le champ `tts`. **La TTS ne doit jamais être livrée en production** (cadrage §3.2) — il suffira de déposer les fichiers Opus dans `public/content/audio/` sans toucher au code.

### Prochaines étapes (cadrage §4)

1. Valider stockage + audio + install PWA sur 3 vrais téléphones du marché (Tecno, Itel, Infinix) — **risque n° 1**
2. Phase 1 : parcours niveau 1 complet, répétition espacée, gamification, téléchargement par module
3. Phase 2 : synchro Supabase + mode champion — Phase 3 : plateforme parrainage
