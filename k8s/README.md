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
