#!/usr/bin/env python3
"""Pipeline audio kamissa — génère les voix des modules et les encode en Opus.

Le contenu pédagogique est entièrement scripté (module.json) : on ne fait donc
PAS de synthèse vocale sur le téléphone. On génère les fichiers ici, une fois,
avec une voix clonée locale (Chatterbox Multilingual, licence MIT), puis on les
livre dans public/content/audio/ comme prévu au cadrage (voix humaine, Opus
~24 kbps, §3.2). speechSynthesis reste le repli prototype dans l'app.

Installation (dans ce dossier) :
    uv venv --python 3.12 .venv
    uv pip install -r requirements.txt

Usage :
    .venv/bin/python generer_audio.py                            # voix par défaut du modèle
    .venv/bin/python generer_audio.py --voix-reference voix.m4a  # voix clonée locale
    .venv/bin/python generer_audio.py --force                    # régénère l'existant

La voix de référence : 10–30 s de parole nette (sans musique ni bruit de fond),
idéalement une institutrice de la zone cible lisant un texte varié. Le premier
lancement télécharge le modèle (~2 Go) depuis Hugging Face.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]  # tools/audio/ -> racine du dépôt
MODULES = RACINE / "public" / "content" / "modules"
SORTIE = RACINE / "public" / "content" / "audio"


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


def main() -> None:
    ap = argparse.ArgumentParser(description="Génère les voix des modules kamissa (Chatterbox + Opus).")
    ap.add_argument("--voix-reference", type=Path, help="échantillon à cloner (10–30 s de parole nette)")
    ap.add_argument("--langue", default="fr", help="code langue Chatterbox (défaut : fr)")
    ap.add_argument("--debit", default="24k", help="débit Opus (défaut : 24k, cadrage §3.2)")
    ap.add_argument("--force", action="store_true", help="régénère même les fichiers existants")
    args = ap.parse_args()

    ffmpeg = trouver_ffmpeg()
    taches = [t for t in textes_des_modules() if args.force or not t[0].exists()]
    if not taches:
        print("Rien à faire : tous les fichiers existent (utilisez --force pour régénérer).")
        return

    # Imports tardifs : torch met plusieurs secondes à démarrer et n'est pas
    # nécessaire pour --help ou un « rien à faire ».
    import torch
    import torchaudio as ta
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

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

    for i, (cible, texte) in enumerate(taches, 1):
        print(f"[{i}/{len(taches)}] {cible.relative_to(SORTIE)} ← {texte[:60]}")
        kwargs: dict = {"language_id": args.langue}
        if args.voix_reference:
            kwargs["audio_prompt_path"] = str(args.voix_reference)
        wav = modele.generate(texte, **kwargs)
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

    print(f"Terminé : {len(taches)} fichier(s) écrits dans {SORTIE}")


if __name__ == "__main__":
    main()
