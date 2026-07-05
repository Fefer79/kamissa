# KAMISSA — Cadrage technique

> « L'école dans la poche » — PWA d'alphabétisation autonome pour enfants de 6-14 ans hors du système scolaire, Côte d'Ivoire & Afrique de l'Ouest.
>
> Ce document traduit la note conceptuelle (`KAMISSA_Note_Conceptuelle_3.docx`) en architecture et plan d'implémentation. Version 0.1 — juillet 2026.

---

## 1. Contraintes fondatrices (non négociables)

Ces contraintes viennent du terrain décrit dans la note conceptuelle. Toute décision technique doit s'y plier.

| # | Contrainte | Conséquence technique |
|---|------------|----------------------|
| C1 | **L'enfant ne sait pas lire** | Zéro texte requis pour naviguer. Audio + icônes + couleurs uniquement au niveau 1. Le texte n'apparaît que comme *objet d'apprentissage*. |
| C2 | **Pas de connexion permanente** | Offline-first strict : installée une fois, l'app fonctionne 100 % hors ligne. La synchro est opportuniste (dès qu'un réseau passe). |
| C3 | **Android entrée de gamme, 1-2 Go RAM, petit écran** | Budget bundle JS < 200 Ko gzippé (hors contenu). Pas d'animations coûteuses. Cibles : Chrome Android ancien (≥ 2 ans), écrans 360×640. |
| C4 | **Téléphone partagé** (parent, grand frère, champion) | Multi-profils locaux sur un appareil. Identification par avatar + code visuel (pas de mot de passe texte). Aucune donnée d'un enfant visible par un autre. |
| C5 | **Personne autour ne sait lire** | L'installation, la création de profil et le dépannage doivent être guidés à la voix. Le champion (niveau 3e) est le seul « lettré » du dispositif. |
| C6 | **Protection de l'enfance / ARTCI** | Anonymisation : prénom + avatar + progression, jamais de photo, jamais de localisation. Minimisation des données dès la conception. |
| C7 | **Stockage limité** (téléphones à 8-16 Go souvent pleins) | Contenu audio compressé (Opus), téléchargement par niveau/module, purge possible des modules terminés. Budget cible : niveau 1 complet ≤ 150 Mo. |

---

## 2. Vue d'ensemble du système

Trois sous-systèmes, découplés, livrables séparément :

```
┌─────────────────────────────────────────────────────────────┐
│  1. APP ENFANT (PWA offline-first)              ← MVP       │
│     Parcours pédagogique, profils partagés, gamification    │
└──────────────────────┬──────────────────────────────────────┘
                       │ sync opportuniste (événements d'apprentissage)
┌──────────────────────▼──────────────────────────────────────┐
│  2. BACKEND SYNC + DONNÉES                      ← phase 2   │
│     Ingestion des événements, agrégats de progression,      │
│     gestion cercles/champions, anonymisation                │
└──────────────────────┬──────────────────────────────────────┘
                       │ agrégats anonymisés
┌──────────────────────▼──────────────────────────────────────┐
│  3. PLATEFORME PARRAINAGE                       ← phase 3   │
│     Tableaux de bord donateurs, notifications de paliers,   │
│     reporting bailleurs (EGRA/EGMA)                         │
└─────────────────────────────────────────────────────────────┘
```

**Principe clé : l'app enfant ne dépend jamais du backend.** Elle doit être pleinement utile sans jamais se synchroniser. Le backend n'ajoute que : sauvegarde des progrès, tableaux de bord, et distribution des mises à jour de contenu.

Un 4ᵉ livrable transverse, léger : le **mode champion** dans l'app elle-même (formation du champion, vue du cercle, rotation équitable du téléphone) — prévu dans la note (« formé en une demi-journée via l'application elle-même »).

---

## 3. Stack technique

### 3.1 Front (app enfant) — décision proposée

**Preact + Vite + Workbox + IndexedDB (via Dexie)**

| Choix | Justification |
|-------|---------------|
| **Preact** (~4 Ko) | Même modèle mental que React, bundle ~10× plus petit. Sur un appareil à 1-2 Go de RAM avec un vieux Chrome, chaque Ko de JS compte (parse + exécution, pas seulement le réseau). |
| **Vite + vite-plugin-pwa** | Build moderne, code-splitting par niveau/module, génération du manifest et du service worker. |
| **Workbox** | Precache de l'app shell, stratégies de cache pour le contenu (cache-first), background sync pour remonter les événements. |
| **Dexie (IndexedDB)** | Stockage structuré local : profils, progression, file d'événements à synchroniser, catalogue de contenu téléchargé. |
| **CSS vanilla + custom properties** | Pas de framework CSS. La charte (§6) tient en ~15 variables. |

*Alternatives écartées* : React (bundle trop lourd pour la cible, sinon équivalent), Svelte (excellent techniquement, vivier de développeurs plus réduit en Afrique de l'Ouest — critère important pour la reprise du code), Flutter/natif (installation via Play Store = friction, taille APK, et la PWA est un choix explicite de la note conceptuelle).

### 3.2 Audio — le cœur du produit

L'audio n'est pas un « asset », c'est **l'interface principale**. Décisions :

- **Format : Opus dans conteneur WebM/Ogg**, ~24 kbps mono voix → ~180 Ko/minute. Fallback AAC pour les vieux WebViews si nécessaire (à vérifier sur appareils réels, voir §8 risques).
- **Découpage : un fichier par consigne/phrase**, pas de gros fichiers. Permet le préchargement fin et la réutilisation (la consigne « écoute bien » sert dans 50 leçons).
- **Manifest de contenu versionné** : chaque module = un JSON (structure de la leçon) + ses assets audio/images, téléchargeables et vérifiables (hash) indépendamment.
- **Synthèse vocale : jamais en production.** Voix humaine enregistrée (chaleur = adhésion, cf. note). La TTS peut servir en *prototypage interne* seulement.
- Reconnaissance vocale (l'enfant lit à voix haute) : **hors MVP**. Trop fragile hors ligne sur cette gamme d'appareils. Le niveau 1 valide par des exercices de discrimination (« touche le mot que tu entends »), pas par la production orale.

### 3.3 Backend — décision : Supabase « réversible »

**Décision (juillet 2026) : développer sur Supabase cloud (région EU), avec la bascule self-hosted documentée comme plan de conformité ARTCI.**

Analyse ayant conduit à ce choix :

- **La charge est triviale** : 500 enfants ≈ 125 000 événements/semaine en batch ; même ×10 en année 2, n'importe quelle solution tient. La scalabilité n'est pas un critère — les vrais critères sont la conformité (résidence des données d'enfants, loi 2013-450 / ARTCI), le SQL accessible (extractions évaluateur EGRA + reporting bailleurs), l'ops minimal (équipe 1-2 devs) et la reprise possible par une équipe locale.
- **Supabase cloud** : Postgres + auth + RLS + storage gérés → 3-4 semaines gagnées sur la phase 2, et les dashboards parrainage (phase 3) réutilisent les mêmes briques.
- **Réversibilité** : Supabase est open source et self-hostable. Si l'instruction juridique ARTCI (à mener avant la phase 2) exige une résidence CI/CEDEAO, on migre le même code sur un VPS — un déménagement, pas une réécriture.
- **La minimisation à la source** (§5.4 : deviceId + prénom + événements, rien d'autre) rend le dossier de transfert transfrontalier simple à défendre quelle que soit l'issue.
- *Alternatives écartées* : PocketBase (plan B sérieux — un binaire + SQLite sur VPS à 10 €/mois — si la souveraineté immédiate devient impérative), Node/Fastify custom (3-4 semaines de dev en plus sans bénéfice à cette échelle), Firebase (NoSQL mauvais pour le reporting, lock-in, résidence opaque), Cloudflare Workers/D1 (pas de contrôle de résidence).

Garde-fous d'architecture qui garantissent la réversibilité :

- L'app émet des **événements d'apprentissage** append-only (`lesson_completed`, `skill_validated`, `session_started`…) dans une file locale (outbox pattern).
- La synchro = `POST /events` en batch, idempotente (chaque événement a un UUID). N'importe quel backend sait faire ça — l'app enfant ne connaît jamais d'API propriétaire Supabase, seulement ce point d'entrée.
- La distribution du contenu (fichiers statiques versionnés) et les notifications SMS/vocales (agrégateur local) restent découplées du backend.

### 3.4 Modèle de données local (IndexedDB)

```
profiles          { id, prenom, avatarId, codeVisuel[], createdAt, circleId? }
progress          { profileId, skillId, status, score, attempts, lastReviewAt, nextReviewAt }
event_outbox      { uuid, profileId, type, payload, createdAt, syncedAt? }
content_catalog   { moduleId, version, sizeBytes, downloadedAt?, hash }
settings          { deviceId, langue, dernierProfilActif }
```

- `nextReviewAt` porte la **répétition espacée** (algorithme simple type SM-2 allégé — pas besoin de plus).
- Le `codeVisuel` est une séquence de 3-4 icônes choisies par l'enfant (ex. 🐘⭐🥭) — mémorisable sans lecture, C4.
- `deviceId` aléatoire, jamais relié à une identité — C6.

### 3.5 Moteur pédagogique

Le contenu est **de la donnée, pas du code**. Un module = un JSON déclaratif :

```json
{
  "moduleId": "n1-sons-a",
  "skill": "phoneme-a",
  "steps": [
    { "type": "ecoute",        "audio": "consigne-ecoute.opus", "illustration": "..." },
    { "type": "discrimination", "audio": "quel-son.opus", "choix": [...], "bonneReponse": 0 },
    { "type": "association",    "..." : "..." }
  ],
  "seuilMaitrise": 0.8
}
```

Le moteur exécute ~8-10 **types d'exercices génériques** (écoute, discrimination auditive, association son↔lettre, reconstruction de syllabe, dictée d'icônes…). Les ~250 leçons de la note sont produites par l'équipe pédagogique **sans toucher au code** — condition de l'itération mensuelle prévue au pilote (mois 4-11).

Règles moteur (issues de la note, §3 fondements scientifiques) :
- **Maîtrise** : passage au module suivant uniquement si score ≥ 80 %.
- **Révision espacée** : chaque session commence par 2-3 items de rappel des acquis dont `nextReviewAt` est échu.
- **Progression stricte** : sons → syllabes → mots → phrases. Le graphe de prérequis est dans le contenu, pas dans le code.

---

## 4. Découpage produit & roadmap MVP

### Phase 0 — Fondations (2-3 semaines)
- Squelette PWA : Vite + Preact + Workbox, installable, 100 % offline après premier chargement.
- Multi-profils : création guidée à la voix, avatar + code visuel, sélection au démarrage.
- Moteur d'exercices : les 4 premiers types (écoute, discrimination, association, choix d'image).
- 1 module de démonstration complet (son « a ») avec audio prototype.
- **Jalon : démo installable sur un vrai téléphone à 30 000 FCFA, utilisable par un enfant non lecteur sans aide.**

### Phase 1 — Parcours niveau 1 (4-6 semaines, en parallèle de la production de contenu)
- Les 8-10 types d'exercices complets.
- Maîtrise 80 % + répétition espacée.
- Gamification : compagnon qui grandit, badges de compétences, objectif hebdomadaire.
- Gestion du contenu : téléchargement par module, reprise sur coupure, vérification d'intégrité.
- Outbox d'événements (prête pour la synchro, même sans backend).
- **Jalon : niveau 1 jouable de bout en bout avec le contenu pédagogique réel.**

### Phase 2 — Synchro + mode champion (3-4 semaines)
- Mise en place du backend Supabase (§3.3) + instruction juridique ARTCI en parallèle.
- Sync opportuniste des événements ; tableau de bord champion (assiduité du cercle, qui n'est pas venu, rotation du téléphone).
- Formation du champion in-app (parcours audio-guidé d'une demi-journée).
- **Jalon : un cercle pilote interne (test technique terrain, avant le vrai pilote).**

### Phase 3 — Plateforme parrainage (parallélisable dès la phase 2)
- Dashboards donateurs (agrégats anonymisés : leçons, compétences, assiduité).
- Notifications de paliers (« Awa a lu son premier mot ») — SMS/vocal via agrégateur local.
- Reporting bailleurs (exports EGRA/EGMA, rapports semestriels).

### Hors périmètre MVP (explicitement)
- Reconnaissance vocale de lecture.
- Langues nationales (dioula, baoulé, bété) — l'architecture du contenu les prévoit (les consignes audio sont des assets substituables), la production attend le pilote.
- Niveaux 2 et 3 — produits pendant le pilote (mois 4-11), le moteur les supporte dès la phase 1.
- Application iOS-spécifique (la PWA suffit ; la cible est Android à > 95 %).

---

## 5. Décisions d'architecture notables (et pourquoi)

1. **PWA, pas d'app store** — installation par le champion via un point wifi, pas de compte Google requis, mises à jour silencieuses via service worker. Correspond au circuit de distribution décrit dans la note (champion / cybercafé / wifi ponctuel).
2. **Contenu = données versionnées** — l'équipe pédagogique itère sans redéploiement du code ; les modules se téléchargent/purgent individuellement (C7).
3. **Événements append-only + outbox** — la synchro ne peut jamais perdre ni dupliquer un progrès (idempotence par UUID) ; le backend reste remplaçable ; l'audit bailleurs (« des preuves, pas des promesses ») s'appuie sur un journal brut horodaté.
4. **Anonymisation à la source** — le backend ne reçoit que `deviceId` + prénom + événements. Le rattachement enfant↔cercle↔commune vit dans un registre séparé tenu par l'équipe terrain, jamais dans la plateforme de parrainage (C6).
5. **Un seul code base, deux modes** — enfant et champion sont deux modes de la même PWA (le champion a un profil spécial), pas deux apps : un seul déploiement, une seule formation.

---

## 6. Charte graphique (rappel — source : `KAMISSA_Logo_Declinaisons.html`)

```css
:root {
  --indigo:  #2E3D96;  /* couleur principale, fonds d'icône */
  --corail:  #E8482B;  /* accent, la « voix », point du i */
  --soleil:  #FFB81C;  /* récompenses, mangue-soleil */
  --manguier:#1FA05C;  /* progression, croissance */
  --karite:  #FDF8EF;  /* fond par défaut */
  --sable:   #EDE4D3;  /* bordures, surfaces secondaires */
  --encre:   #241E16;  /* texte */
  --douce:   #6B6053;  /* texte secondaire */
}
```

- Typo titres/logo : **Baloo 2** (ExtraBold, minuscules) ; texte : **Lexend** (lisibilité, adaptée aux lecteurs fragiles). Polices **auto-hébergées** (offline, C2) et sous-ensemble latin uniquement.
- Le mot-symbole s'écrit toujours `kamissa` en minuscules ; icône seule en dessous de 110 px.
- Le compagnon de progression reprend la **pousse de manguier → mangue-soleil** du logo : cohérence entre l'identité et la mécanique de jeu.

---

## 7. Mesure & instrumentation (dès le MVP)

La crédibilité du projet repose sur la preuve (EGRA/EGMA externes + données d'usage). L'app doit produire dès le premier jour :

- **Événements horodatés** : sessions, leçons, scores, temps par exercice (pas de tracking tiers, pas d'analytics externe — C6).
- **Indicateurs du cadre logique de la note** calculables depuis ces événements : assiduité (≥ 3 sessions/semaine), rétention, % niveau 1 complété.
- **Horodatage robuste** : horloge locale + correction à la synchro (les appareils ont souvent une date fausse).

---

## 8. Risques techniques & validations à faire tôt

| Risque | Validation |
|--------|------------|
| Quota de stockage IndexedDB/Cache insuffisant sur vieux Chrome | Tester sur 3-4 vrais appareils du marché ivoirien (Tecno, Itel, Infinix) **avant la fin de la phase 0**. `navigator.storage.persist()` + stratégie de purge. |
| Codec Opus non supporté sur certains WebViews | Matrice de test audio sur les mêmes appareils ; fallback AAC préparé. |
| Éviction du service worker / du cache par l'OS quand le stockage est plein | Storage persistent API + réinstallation guidée à la voix comme filet de sécurité. |
| PWA installée via navigateurs alternatifs (Opera Mini !) qui ne supportent pas les service workers | Consigne d'installation via Chrome uniquement, page de détection avec message vocal. |
| Perte du téléphone = perte des progrès (avant la phase 2) | Accepté pour le MVP ; la synchro (phase 2) est la vraie réponse. Export/import manuel possible en secours. |

**Action n° 1 du projet : acheter 3 téléphones du marché cible (30-50 000 FCFA) et valider stockage + audio + install PWA dessus.** Tout le reste du cadrage tient si et seulement si cette validation passe.

---

## 9. Prochaines étapes immédiates

1. ✅ Documents de référence copiés dans `docs/`.
2. ✅ Backend acté : Supabase réversible (§3.3).
3. ☐ Valider le reste du cadrage — en particulier §3.1 (Preact) et §4 (découpage).
4. ☐ Initialiser le squelette du projet (phase 0).
5. ☐ Acquérir les appareils de test et dérouler la matrice §8.
6. ☐ Lancer l'instruction juridique ARTCI (transfert de données, résidence) — à conclure avant la phase 2.
7. ☐ Définir le référentiel de compétences du niveau 1 avec l'équipe pédagogique (liste des `skillId` — bloque la production de contenu, pas le code).
