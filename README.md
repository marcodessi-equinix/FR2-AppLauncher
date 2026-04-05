# FR2 AppLauncher

Interne Dashboard-Anwendung fuer Firmen-VMs mit Podman/Portainer. Die App ist auf einen einfachen Betrieb ausgelegt:

- Frontend oeffentlich auf `http://VM-HOSTNAME:9020`
- Backend nur intern im Compose-Netz
- Daten persistent in `data/` und `uploads/`
- Updates ueber Portainer Stack Update ohne Reset der App-Daten

## Architektur

| Komponente | Technologie |
| --- | --- |
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Datenbank | SQLite |
| Webserver | Nginx |
| Betrieb | Podman / Portainer |

## Standard-Betriebsmodell

- Frontend-Port: `9020`
- Backend-Port intern: `3000`
- Zugriff fuer Benutzer: nur ueber das Frontend
- Kein oeffentliches Backend-Port-Mapping
- HTTP intern im Firmennetz, kein HTTPS-Zwang
- Frontend zusaetzlich im externen Proxy-Netz `nginx-proxy-manager_default`

## Portainer Deployment aus GitHub

Ja, du kannst den Stack direkt aus dem GitHub-Repo in Portainer deployen. Fuer einen sicheren Start musst du in Portainer aber diese zwei Environment-Variablen setzen:

- `JWT_SECRET`
- `ADMIN_PASSWORD`

Ohne diese beiden Werte startet der Stack absichtlich nicht.

### Empfohlene Portainer-Konfiguration

1. In Portainer `Stacks` oeffnen.
2. `Add stack` waehlen.
3. Deployment-Typ `Repository` oder `Git Repository` waehlen.
4. Repo-URL eintragen.
5. Als Compose-Datei `docker-compose.yml` verwenden.
6. Unter `Environment variables` mindestens setzen:
   - `JWT_SECRET`
   - `ADMIN_PASSWORD`
7. Stack deployen.

### Optionale Environment-Variablen

| Variable | Zweck | Default |
| --- | --- | --- |
| `FRONTEND_PORT` | Host-Port fuer das Frontend | `9020` |
| `PROXY_NETWORK` | Externes Netzwerk fuer Nginx Proxy Manager | `nginx-proxy-manager_default` |
| `DATABASE_PATH` | SQLite-Datei im Container | `/app/data/applauncher.db` |
| `FRONTEND_URL` | Zusaetzlich erlaubte Origins, kommagetrennt | leer |
| `COOKIE_SECURE` | Nur bei HTTPS auf `true` setzen | `false` |

Hinweis:

- `FRONTEND_URL` ist fuer den Standardbetrieb ueber denselben Host nicht zwingend noetig.
- Die App erkennt den aktuellen Host hinter Nginx und akzeptiert denselben Origin automatisch.
- Fuer Nginx Proxy Manager reicht es, wenn das Frontend im gleichen externen Netzwerk liegt. Der Stack nutzt dafuer standardmaessig `nginx-proxy-manager_default`.

## Zugriff

Nach dem Deploy ist die App standardmaessig hier erreichbar:

- `http://VM-HOSTNAME:9020`

Der Admin-Login erfolgt ueber das Schloss-Symbol im Dashboard.

## Updates ueber Portainer

Fuer spaetere Updates reicht im Normalfall:

1. Code in GitHub aktualisieren.
2. In Portainer den bestehenden Stack oeffnen.
3. `Update` bzw. `Pull and redeploy` ausfuehren.

Die App-Daten bleiben erhalten, solange derselbe Stack weiterverwendet wird, weil `data/` und `uploads/` persistent gemountet sind.

## Lokale Installation auf der VM ohne Portainer

Wenn du direkt auf der VM deployen willst:

```bash
git clone <repo-url>
cd FR2\ AppLauncher
bash install.sh
```

Das Skript:

- erzeugt eine lokale `.env`
- generiert einen sicheren `JWT_SECRET`
- fragt das Admin-Passwort ab oder generiert eins
- verwendet standardmaessig das Proxy-Netzwerk `nginx-proxy-manager_default`
- erstellt das Proxy-Netzwerk automatisch, falls es lokal noch fehlt
- startet den Stack mit Podman Compose

## Lokale Entwicklung

Empfohlen: Node.js 22 LTS. Die App verwendet den eingebauten SQLite-Treiber aus Node und ist auf eine aktuelle LTS-Version ausgelegt.

Fuer lokale Entwicklung im Projektstamm:

```bash
npm install
npm run dev
```

Das Root-Projekt verwendet npm Workspaces und installiert damit automatisch Root-, Backend- und Frontend-Abhaengigkeiten.

`npm run dev` startet:

- das Backend im Watch-Modus
- das Frontend mit Vite

Fuer den lokalen Dev-Start setzt das Root-Skript automatisch Entwicklungswerte:

- `JWT_SECRET=CHANGE_ME_DEV_SECRET`
- `ADMIN_PASSWORD=1234`
- `ALLOW_INSECURE_DEFAULTS=true`

Damit startet die App ohne manuelle `.env`-Pflege. Fuer echte Deployments bleiben weiterhin eigene produktive Werte noetig.

Weitere Root-Befehle:

```bash
npm run build
npm run test
npm run lint
```

## Beispiel `.env`

```env
PORT=3000
FRONTEND_PORT=9020
DATABASE_PATH=/app/data/applauncher.db
FRONTEND_URL=
COOKIE_SECURE=false
ALLOW_INSECURE_DEFAULTS=false
PROXY_NETWORK=nginx-proxy-manager_default
JWT_SECRET=
ADMIN_PASSWORD=
```

`ADMIN_PASSWORD` kann als Klartext gesetzt werden. Wenn du bereits einen bcrypt-Hash hinterlegen willst, wird dieser ebenfalls unterstuetzt.

## Betrieb und Wartung

```bash
# Start / Update
podman compose up -d --build

# Stoppen
podman compose down

# Logs
podman compose logs -f

# Backup
./backup.sh
```

Wenn du Nginx Proxy Manager verwendest, kann der Proxy direkt auf den Container `fr2-applauncher-frontend` im Netzwerk `nginx-proxy-manager_default` zeigen.

## Wichtige Hinweise

- Keine echten Secrets ins Repo committen.
- `JWT_SECRET` und `ADMIN_PASSWORD` immer pro Umgebung separat setzen.
- Das Backend ist absichtlich nicht direkt von aussen erreichbar.
- `COOKIE_SECURE=true` erst aktivieren, wenn die App spaeter ueber HTTPS betrieben wird.
