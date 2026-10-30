# Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
# Recalcule EMPREINTES.md (SHA-256 de chaque fichier) : python3 empreintes.py
# Génère EMPREINTES.md : SHA-256 de chaque fichier suivi par git (sauf EMPREINTES.md lui-même).
import hashlib, subprocess, sys, datetime, os
VERSION = '4.0'   # à changer à chaque version publiée
root = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
files = [f for f in subprocess.check_output(['git', '-C', root, 'ls-files'], text=True).split('\n') if f and f != 'EMPREINTES.md']
files += [f for f in subprocess.check_output(['git', '-C', root, 'ls-files', '--others', '--exclude-standard'], text=True).split('\n') if f and f != 'EMPREINTES.md']
rows, total = [], hashlib.sha256()
for f in sorted(set(files)):
    h = hashlib.sha256(open(f"{root}/{f}", 'rb').read()).hexdigest()
    rows.append(f"| `{f}` | `{h}` |")
    total.update(f"{f}:{h}\n".encode())
today = datetime.date.today().isoformat()
out = f"""# Empreintes de Bass Routine

Auteur : **FredLatorche** — https://github.com/fredlatorche/BassRoutine
Version : {VERSION} — {today}

Chaque fichier du projet est identifié par son empreinte SHA-256 : si un seul caractère
change, l'empreinte change complètement. Associée à une date certaine (historique GitHub,
archive Software Heritage, horodatage OpenTimestamps ou enveloppe e-Soleau de l'INPI),
cette liste prouve que ce code existait, sous cette forme, à cette date.

**Empreinte globale de la version** : `{total.hexdigest()}`

| Fichier | SHA-256 |
|---|---|
""" + "\n".join(rows) + "\n"
open(f"{root}/EMPREINTES.md", 'w').write(out)
print(total.hexdigest(), len(rows), 'fichiers')
