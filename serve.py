# Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
# Serveur local pour l'app (dossier web/), accessible depuis l'iPhone sur le même Wi-Fi.
# Indique au navigateur de toujours revérifier les fichiers : après une modification,
# un simple rechargement suffit (sinon Safari garde d'anciens modules en cache).
# Usage : python3 serve.py   (puis http://localhost:8000)

import http.server
import os
import socket

PORT = 8000
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.168.0.1", 1))   # aucun paquet envoyé, sert juste à trouver l'interface Wi-Fi
        return s.getsockname()[0]
    except OSError:
        return "?"
    finally:
        s.close()


if __name__ == "__main__":
    print(f"Sur ce Mac : http://localhost:{PORT}")
    print(f"Sur l'iPhone (même Wi-Fi) : http://{local_ip()}:{PORT}")
    print("Ctrl + C pour arrêter.")
    http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler).serve_forever()
