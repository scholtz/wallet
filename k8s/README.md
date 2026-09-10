# Deployment (GitHub Actions)

There is no deploy server anymore. Two workflows cover the whole pipeline:

- **`.github/workflows/awallet-main.yml`** — runs automatically on every push
  to `master`. Builds the image, pushes it to Docker Hub + Harbor, applies
  `k8s/deployment-main.yaml`, and deploys to `main.h3.a-wallet.net`. Runs
  under the **`Stage`** GitHub Environment. No approval gate — this is the
  low-stakes, continuously-deployed environment.
- **`.github/workflows/awallet-stable.yml`** — manually triggered
  (**Actions → Promote main build to stable → Run workflow**), promotes an
  already-deployed main image to `stable` and deploys it to both production
  sites: `a-wallet.net` (AWallet) and `wallet.biatec.io` (Biatec Wallet). It
  has two jobs:
  1. `promote-image` (environment **`Stage`**) — retags the chosen main image
     as `:1.YYYY.MM.DD-stable` and `:latest`, pushes both tags to Docker Hub
     and Harbor. No live impact.
  2. `deploy-production` (environment **`Production`**) — applies both stable
     manifests and rolls out both deployments. **Pauses for manual approval**
     because `Production` has a required-reviewer rule configured in
     Settings → Environments → Production.

  When triggering it, pass `from_tag` = the exact Docker Hub tag of the main
  build you want to promote (e.g. `1.2026.07.19-main`) — this replaces
  hand-editing the `from=...` line that used to live in `deploy-stable.sh`.

## GitHub Environments

Both `Stage` and `Production` already exist (Settings → Environments). No
new environments are needed — just make sure each has the secrets below.

## Secrets

Repo-level (Settings → Secrets and variables → Actions → Repository
secrets), shared by both workflows regardless of environment:

| Secret | Description |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub username that owns the `scholtz2` namespace. |
| `DOCKERHUB_TOKEN` | Docker Hub **access token**, not your account password (hub.docker.com → Account Settings → Security → New Access Token). |
| `HARBOR_REGISTRY` | Harbor host, no scheme, e.g. `harbor.example.com` or `harbor.example.com:443`. |
| `HARBOR_PROJECT` | Harbor project/namespace the image is pushed under, e.g. `awallet`. |
| `HARBOR_USERNAME` | Harbor username — a robot account scoped to `HARBOR_PROJECT` with push rights is recommended over a personal account. |
| `HARBOR_PASSWORD` | Harbor password or robot account token. |

Environment-scoped (Settings → Environments → *environment name* → Environment secrets):

| Environment | Secret | Description |
| --- | --- | --- |
| `Stage` | `KUBE_CONFIG` | Base64-encoded kubeconfig for a service account that can manage Deployments/Services/ConfigMaps in the `awallet` namespace. Generate with `cat your-kubeconfig.yaml \| base64 -w0`. Prefer a namespace-scoped service account token over a full-admin kubeconfig. |
| `Stage` | `AWALLET_MAIN_CONFIG_JSON` | Raw JSON content of the main deployment's runtime `config.json`, mounted via the `awallet-main-conf` ConfigMap. Previously only ever existed on the old deploy server (`k8s/conf/config.json`, gitignored). |
| `Production` | `KUBE_CONFIG` | Same as above — can point at the same cluster/namespace as `Stage`'s, GitHub keeps the values separate per environment either way. |
| `Production` | `AWALLET_STABLE_CONFIG_JSON` | Raw JSON content of the **AWallet** stable config, mounted via the `awallet-stable-conf` ConfigMap. `k8s/stable/` is gitignored (unlike `k8s/stable-biatec/`), so this only ever lived on the old deploy server. Example content: `{"d": "6373...7ba"}`. |
| `Production` | `BIATEC_STABLE_CONFIG_JSON` | *Optional.* Raw JSON content of the **Biatec Wallet** stable config, mounted via the `biatec-wallet-stable-conf` ConfigMap. If set, overrides the committed `k8s/stable-biatec/config.json` for that run only (not committed back) — lets you roll out a Biatec config change via secret without a repo commit. Leave unset to keep using the committed file as-is. |

Biatec Wallet's stable config works either way: `k8s/stable-biatec/config.json`
is committed to the repo and used by default; setting `BIATEC_STABLE_CONFIG_JSON`
overrides it for a given run without touching git.

Docker image tags keep the exact naming the old scripts used:
`scholtz2/a-wallet:1.YYYY.MM.DD-main` / `-stable`, plus `scholtz2/a-wallet:latest`
for stable promotions. Harbor gets the same `a-wallet` repo name and tags
under `HARBOR_REGISTRY/HARBOR_PROJECT`. `k8s/deployment-*.yaml` keep pulling
from Docker Hub (unchanged); Harbor is purely an additional push destination,
not what the cluster deploys from.

## Liquid Auth service (stage.liquid.biatec.io / liquid.biatec.io)

The Algorand Foundation's Liquid Auth server backs the wallet's **Connect → Liquid Auth**
tab and the `biatecLiquid()` dApp adapter (see `docs/LIQUID_AUTH.md`). It is deployed by
**`.github/workflows/liquid-auth.yml`** with the same two-stage model as the wallet:

| Job | Environment | Manifest | URL | Trigger |
| --- | --- | --- | --- | --- |
| `deploy-stage` | **`Stage`** | `k8s/deployment-liquid-auth-stage.yaml` | `https://stage.liquid.biatec.io` | automatic on every push to `master` that touches either manifest or the workflow; also **Actions → Deploy Liquid Auth service → Run workflow** |
| `deploy-production` | **`Production`** | `k8s/deployment-liquid-auth-stable.yaml` | `https://liquid.biatec.io` | runs after `deploy-stage` succeeded and **pauses for the `Production` required reviewer**; skipped on manual runs when *deploy_production* is unticked |

Each environment gets its own API deployment (1 replica on stage, 2 on production),
single-node MongoDB with a PVC (2Gi / 5Gi) and non-persistent Redis, all in the `awallet`
namespace, plus two ingresses per host (`/socket.io` for WebSocket signaling from any dApp
origin; everything else with CORS-with-credentials for the wallet origins). Image:
`ghcr.io/algorandfoundation/liquid-auth:develop` (upstream publishes no release tags yet —
pin a digest or mirror to Docker Hub before relying on it).

### Secrets to configure

Environment-scoped (Settings → Environments → *environment name* → Environment secrets),
set in **both** `Stage` and `Production` (different values per environment):

| Secret | Description |
| --- | --- |
| `KUBE_CONFIG` | Already exists for the wallet deployments — the same base64 kubeconfig for the `awallet` namespace is reused. |
| `LIQUID_AUTH_SESSION_SECRET` | Secret for the service's express-session cookies. Generate with `openssl rand -hex 32`. Changing it logs every wallet out of the service (they re-authenticate with their passkey on the next connection). |
| `LIQUID_AUTH_DB_PASSWORD` | MongoDB root password. Generate with `openssl rand -hex 24`. **Only applied when the MongoDB volume is first initialised** — to rotate it later, change it inside MongoDB (`db.changeUserPassword`) before updating the secret, or delete the PVC (drops all registered passkeys). |
| `LIQUID_AUTH_DB_USERNAME` | *Optional.* MongoDB root user, default `algorand`. |

The workflow writes these into the k8s Secret `liquid-auth-stage-secrets` /
`liquid-auth-secrets` on every run (`kubectl apply` of a client-side dry-run), so the
GitHub secrets are the source of truth. Nothing else is needed: TLS certificates come from
the `letsencrypt` cluster issuer, DNS for both hosts must point at the ingress.

### Domains and passkeys

- RP ID (`HOSTNAME`) is `biatec.io` on both environments — passkeys work only from wallet
  hosts under `biatec.io`, never from `*.a-wallet.net`.
- The upstream server verifies passkey ceremonies against **one** web origin (`ORIGIN`):
  `https://wallet.biatec.io` on production, `https://stage.wallet.biatec.io` on stage.
  Additional wallet hosts are listed in the API ingress `cors-allow-origin` annotation
  (stage: `stage.`, `main.`, `dev.`, `test.wallet.biatec.io`; production: `wallet.` and
  `www.wallet.biatec.io`) so they can read the REST API, but their passkey
  registration/authentication is rejected by the server. Edit the annotation (and, to move
  the passkey origin, `ORIGIN`) in the manifest — the workflow picks the change up.
- dApps test against stage with `biatecLiquid({ origin: 'https://stage.liquid.biatec.io' })`;
  the adapter defaults to production.

### Manual deploy / first-time notes

`k8s/update-liquid-auth.sh stage|stable` applies a manifest by hand (it creates the k8s
Secret with random values via `k8s/liquid-auth-secrets.sh` if it doesn't exist yet — if you
later switch to the workflow, set the GitHub secrets to the same values or accept a
one-time logout / fresh DB).

- The API ingress uses a `configuration-snippet` (`proxy_cookie_flags ~ secure`) to add the
  `Secure` flag to the session cookie, because the app itself runs with
  `SESSION_SECURE=false` (TLS terminates at the ingress and the app does not trust the
  proxy). If the cluster's ingress-nginx has `allow-snippet-annotations` disabled, remove
  that annotation; the cookie stays HttpOnly + Lax over TLS.
- MongoDB is a hard dependency of the upstream server (Mongoose + `connect-mongo`); Redis
  alone is not enough. To avoid in-cluster MongoDB, set `DB_HOST`/`DB_ATLAS=true` to a
  hosted MongoDB (Atlas free tier) and drop the mongo Deployment/PVC from the manifest.

## Notes

- All 6 deployments (`awallet-arc56-registry-main`,
  `awallet-web-main-landing`, `awallet-arc56-registry-stable`,
  `awallet-stable`, `biatec-wallet-arc56-registry`, `biatec-wallet-stable`)
  declare `tcpSocket`-only liveness/readiness probes. If any of them was ever
  hand-edited on the cluster (`kubectl edit` / `kubectl set probe`) to add an
  `httpGet`/`exec`/`grpc` handler, `kubectl apply`'s 3-way merge can't clear
  it, and the API server rejects the whole apply with `may not specify more
  than 1 handler type`. Both workflows' "Clear stray probe handlers" step
  patches every deployment they touch to strip any alternate handler before
  every apply, so this can't recur.
- The `-landing`/`-stable` containers also need an `imagePullSecret` named
  `regcred` to exist in the `awallet` namespace (to avoid Docker Hub
  anonymous pull rate limits). That secret is created out-of-band and isn't
  managed by either workflow.
- Both workflows commit their version-bumped deployment yaml(s) back to
  `master` with `[skip ci]` in the message, so the resulting push doesn't
  re-trigger `awallet-main.yml`.
- `k8s/update-config.sh`, `k8s/update-config-stable.sh` and
  `k8s/update-biatec-config-stable.sh` are no longer invoked by CI (the
  workflows run the equivalent `kubectl` commands inline). They're left in
  place in case you still use them for a manual/local deploy, but are dead
  code from the pipeline's perspective.
- The old deploy-server-only secrets (`SSH_USER`, `SSH_KEY`, `SSH_HOST`,
  `SSHKEY`, `HOST`, `HOSTPORT`, `GHLOGIN`, `GHPASS`) are unused now. Safe to
  delete once you've verified both workflows work end-to-end.
