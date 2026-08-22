#!/usr/bin/env python3
"""Pipeline audio kamissa — génère les voix des modules et de l'interface,
et les encode en Opus.

Tout ce que l'app prononce est scripté : les étapes pédagogiques dans
public/content/modules/*/module.json, l'interface dans src/voix-interface.json.
On ne fait donc PAS de synthèse vocale sur le téléphone : on génère les fichiers
ici, une fois, avec une voix clonée locale (Chatterbox Multilingual, licence MIT),
puis on les livre dans public/content/audio/ comme prévu au cadrage (voix humaine,
Opus ~24 kbps, §3.2). speechSynthesis ne reste qu'un repli de développement.

Installation (dans ce dossier) :
    uv venv --python 3.12 .venv
    uv pip install -r requirements.txt

Usage :
    .venv/bin/python generer_audio.py                            # ce qui manque ou a changé
    .venv/bin/python generer_audio.py --voix-reference voix.m4a  # voix clonée locale
    .venv/bin/python generer_audio.py --force                    # régénère tout

La voix de référence : 10–30 s de parole nette (sans musique ni bruit de fond),
idéalement une institutrice de la zone cible lisant un texte varié. Le premier
lancement télécharge le modèle (~2 Go) depuis Hugging Face.

manifest.json garde la trace de ce qui a produit chaque fichier : empreinte du
texte source, identité de la voix, versions. Deux raisons, toutes deux vécues :
un texte corrigé sans régénération laisse l'audio mentir en silence, et un
sous-ensemble régénéré des mois plus tard avec une autre voix casse l'unité du
corpus au milieu d'une leçon. Le script refuse ce second cas sans --nouvelle-voix.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]  # tools/audio/ -> racine du dépôt
MODULES = RACINE / "public" / "content" / "modules"
INTERFACE = RACINE / "src" / "voix-interface.json"
SORTIE = RACINE / "public" / "content" / "audio"
MANIFESTE = Path(__file__).resolve().parent / "manifest.json"


def empreinte(texte: str) -> str:
    return hashlib.sha256(texte.encode("utf-8")).hexdigest()


def empreinte_fichier(chemin: Path) -> str:
    return hashlib.sha256(chemin.read_bytes()).hexdigest()


# Le modèle déraille surtout sur les libellés courts : il répète le token ou
# babille après la fin (« la mangue » sorti en 6,3 s au lieu de 1,2 s). Une durée
# invraisemblable est le signal le plus fiable et le seul mesurable sans oreille.
# ~0,075 s par caractère en français ; on laisse 50 % de marge plus une amorce.
def duree_plafond(texte: str) -> float:
    return 1.5 + 0.11 * len(texte)


# Symétrique du plafond, contre la panne inverse : le modèle s'arrête avant la
# fin du texte et livre une consigne coupée en deux. Plus grave que le babillage
# — l'enfant reste sans instruction et ne sait pas quoi toucher — et invisible,
# car un fichier court ne réveille aucun soupçon.
# Le seuil vient du corpus, pas d'une intuition : sur les 42 fichiers livrés, le
# débit le plus rapide est 21,4 car/s (« a-beille, abeille »). On place donc la
# borne d'impossibilité à 30 car/s, largement au-dessus du corpus réel : aucun
# faux positif sur l'existant, et une phrase amputée de moitié est prise.
# Ça ne rattrape pas une troncature légère (un mot perdu en fin de phrase) :
# seule une transcription du fichier généré le ferait. Voir NOTES ci-dessous.
def duree_plancher(texte: str) -> float:
    return len(texte) / 30


# Une lettre répétée pour figurer un son tenu (« le son aaa ») ne se prononce
# pas tenue : le modèle dit trois « a » détachés. L'enfant apprend alors à
# reconnaître trois sons là où on lui en enseigne un — l'inverse de la leçon.
# Aucun mot français ne porte trois lettres identiques d'affilée : on refuse.
LETTRE_REPETEE = re.compile(r"([A-Za-zÀ-ÖØ-öø-ÿ])\1{2}")


def controler_textes(taches: list[tuple[Path, str]]) -> None:
    fautifs = [(c, t, m.group(0)) for c, t in taches if (m := LETTRE_REPETEE.search(t))]
    if not fautifs:
        return
    print("Lettres répétées dans le texte parlé — le modèle les détache au lieu de les tenir :")
    for cible, texte, faute in fautifs:
        print(f"  {cible.relative_to(SORTIE)} : « {faute} » dans « {texte} »")
    sys.exit("Écrivez la lettre une seule fois (« le son a »), puis relancez.")


def trouver_ffmpeg() -> str:
    """ffmpeg du PATH s'il existe, sinon le binaire statique d'imageio-ffmpeg."""
    from shutil import which

    if chemin := which("ffmpeg"):
        return chemin
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg introuvable : installez-le (brew install ffmpeg) ou `uv pip install imageio-ffmpeg`.")


def textes_des_modules() -> list[tuple[Path, str]]:
    """[(chemin_opus_cible, texte)] pour toutes les étapes de tous les modules."""
    taches = []
    for fiche in sorted(MODULES.glob("*/module.json")):
        module = json.loads(fiche.read_text(encoding="utf-8"))
        for etape in module["etapes"]:
            voix = etape.get("voix", {})
            if voix.get("audio") and voix.get("tts"):
                taches.append((SORTIE / voix["audio"], voix["tts"]))
            elif voix.get("audio"):
                print(f"!! étape sans tts, ignorée : {voix['audio']}")
    return taches


def textes_de_interface() -> list[tuple[Path, str]]:
    """[(chemin_opus_cible, texte)] pour le catalogue de l'interface.

    La clé du catalogue donne le nom du fichier : src/voix.ts calcule le même
    chemin (`ui/<clé>.opus`), et tsc vérifie que chaque clé utilisée existe.
    """
    catalogue = json.loads(INTERFACE.read_text(encoding="utf-8"))
    return [(SORTIE / "ui" / f"{cle}.opus", texte) for cle, texte in catalogue.items()]


def identite_voix(args, versions: dict) -> dict:
    """Ce qui définit le timbre du corpus : le modèle et la voix de référence."""
    identite = {
        "modele": versions["chatterbox"],
        "langue": args.langue,
        "reference": None,
    }
    if args.voix_reference:
        identite["reference"] = {
            "fichier": args.voix_reference.name,
            "sha256": empreinte_fichier(args.voix_reference),
        }
    return identite


def main() -> None:
    ap = argparse.ArgumentParser(description="Génère les voix kamissa (Chatterbox + Opus).")
    ap.add_argument("--voix-reference", type=Path, help="échantillon à cloner (10–30 s de parole nette)")
    ap.add_argument("--langue", default="fr", help="code langue Chatterbox (défaut : fr)")
    ap.add_argument("--debit", default="24k", help="débit Opus (défaut : 24k, cadrage §3.2)")
    ap.add_argument("--force", action="store_true", help="régénère même ce qui est à jour")
    ap.add_argument(
        "--nouvelle-voix",
        action="store_true",
        help="assume le changement de voix : régénère TOUT le corpus et réécrit le manifeste",
    )
    ap.add_argument("--seulement", choices=["modules", "interface"], help="restreindre la source")
    args = ap.parse_args()

    if args.nouvelle_voix:
        args.force = True

    ffmpeg = trouver_ffmpeg()
    manifeste = json.loads(MANIFESTE.read_text(encoding="utf-8")) if MANIFESTE.exists() else {}
    fichiers = manifeste.get("fichiers", {})

    toutes = []
    if args.seulement != "interface":
        toutes += textes_des_modules()
    if args.seulement != "modules":
        toutes += textes_de_interface()

    # Trois raisons de (re)générer : le fichier manque, le texte a changé depuis
    # sa dernière génération, ou on force. Un fichier sans entrée de manifeste
    # est laissé tel quel : on ne sait pas d'où il vient, on le signale.
    taches, inconnus = [], []
    for cible, texte in toutes:
        cle = str(cible.relative_to(SORTIE))
        connu = fichiers.get(cle)
        if args.force or not cible.exists():
            taches.append((cible, texte, cle))
        elif connu is None:
            inconnus.append(cle)
        elif connu.get("sha256_texte") != empreinte(texte):
            print(f"~~ texte modifié depuis la génération : {cle}")
            taches.append((cible, texte, cle))

    if inconnus:
        print(f"!! {len(inconnus)} fichier(s) de provenance inconnue (antérieurs au manifeste) :")
        for cle in inconnus:
            print(f"     {cle}")
        print("   --force les régénérera et rendra le corpus vérifiable.")

    controler_textes(toutes)

    if not taches:
        print("Rien à faire : tout est à jour (--force pour régénérer).")
        return

    # Imports tardifs : torch met plusieurs secondes à démarrer et n'est pas
    # nécessaire pour --help ou un « rien à faire ».
    import torch
    import torchaudio as ta
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    try:
        from importlib.metadata import version as _v

        versions = {"chatterbox": f"chatterbox-tts {_v('chatterbox-tts')}", "torch": torch.__version__}
    except Exception:
        versions = {"chatterbox": "chatterbox-tts ?", "torch": torch.__version__}

    identite = identite_voix(args, versions)
    ancienne = manifeste.get("voix")
    if ancienne and ancienne != identite and not args.nouvelle_voix:
        sys.exit(
            "La voix demandée n'est pas celle du corpus existant :\n"
            f"  corpus   : {json.dumps(ancienne, ensure_ascii=False)}\n"
            f"  demandée : {json.dumps(identite, ensure_ascii=False)}\n"
            "Générer un sous-ensemble avec une autre voix casserait l'unité du corpus\n"
            "(l'enfant entendrait deux personnes dans la même leçon).\n"
            "Reprenez la même référence, ou relancez avec --nouvelle-voix pour tout régénérer."
        )

    if torch.cuda.is_available():
        device = "cuda"
    elif torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"
    print(f"Chargement du modèle ({device})…")
    # rustine chatterbox 0.1.6 : from_pretrained oublie map_location en chargeant
    # s3gen.pt (checkpoint sauvegardé sur GPU) → crash sur machine sans CUDA.
    # Corrigé en 0.1.7, mais 0.1.7 exige transformers 5.x donc torch ≥ 2.4
    # (indisponible sur Mac Intel). On force map_location le temps du chargement.
    charge_torch = torch.load
    torch.load = lambda *a, **kw: charge_torch(*a, **{"map_location": device, **kw})
    try:
        modele = ChatterboxMultilingualTTS.from_pretrained(device=device)
    finally:
        torch.load = charge_torch

    manifeste["voix"] = identite
    manifeste["versions"] = versions
    manifeste["debit"] = args.debit
    manifeste.setdefault("fichiers", fichiers)

    for i, (cible, texte, cle) in enumerate(taches, 1):
        print(f"[{i}/{len(taches)}] {cle} ← {texte[:60]}")
        kwargs: dict = {"language_id": args.langue}
        if args.voix_reference:
            kwargs["audio_prompt_path"] = str(args.voix_reference)
        plafond = duree_plafond(texte)
        plancher = duree_plancher(texte)
        essais = []
        for tentative in range(1, 4):
            candidat = modele.generate(texte, **kwargs)
            secondes = candidat.shape[-1] / modele.sr
            if secondes > plafond:
                defaut = f"durée invraisemblable : {secondes:.1f} s > {plafond:.1f} s"
            elif secondes < plancher:
                defaut = f"trop court pour le texte : {secondes:.1f} s < {plancher:.1f} s"
            else:
                defaut = None
            essais.append((defaut is not None, secondes, candidat))
            if defaut is None:
                break
            print(f"    {defaut} — tentative {tentative + 1}/3")
        # À défaut d'un essai valable, on garde le moins court : entre babiller
        # et se taire, le babillage laisse au moins la consigne entière.
        fautif, secondes, wav = min(essais, key=lambda e: (e[0], -e[1]))
        if fautif:
            print(f"!! {cle} : {secondes:.1f} s après 3 tentatives — à écouter avant livraison")
        cible.parent.mkdir(parents=True, exist_ok=True)
        tmp = Path(tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name)
        try:
            ta.save(str(tmp), wav.cpu(), modele.sr)
            subprocess.run(
                [
                    ffmpeg, "-y", "-loglevel", "error", "-i", str(tmp),
                    "-c:a", "libopus", "-b:a", args.debit, "-ac", "1", "-ar", "48000", str(cible),
                ],
                check=True,
            )
        finally:
            tmp.unlink(missing_ok=True)
        # Écrit à chaque fichier : une génération de 40 minutes interrompue ne
        # doit pas perdre la trace de ce qui a déjà été produit.
        fichiers[cle] = {
            "sha256_texte": empreinte(texte),
            "duree_s": round(secondes, 2),
            "genere_le": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        MANIFESTE.write_text(
            json.dumps(manifeste, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )

    print(f"Terminé : {len(taches)} fichier(s) écrits dans {SORTIE}")


if __name__ == "__main__":
    main()
