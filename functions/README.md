# Cloudflare Pages Functions

`[[path]].ts` is the only function. It hands every request to the same
`handleRequest` the local server uses, and lets Pages serve the static build
whenever the router declines.

There is deliberately no second implementation of the routing, the checkout or
the webhook. A deployment that behaves differently from the machine it was
tested on is a deployment that was never tested.

## Configuration

Set in the Pages project, not in this repository:

| Variable | Value |
|---|---|
| `OLIBANA_MODE` | `closed`, `sandbox` or `live` — no default |
| `OLIBANA_WEBHOOK_SECRET` | the provider's signing secret, 16+ characters. Unset when closed. |
| `OLIBANA_ORIGIN` | the public origin |

`validateEnvironment` refuses a half-configured deployment: a secret without a
mode, a mode without a secret, or a sandbox on a public origin. It throws at
request time rather than serving in whichever half was configured.

## Storage

The order, catalogue, run and intent logs are files. Pages Functions have no
writable filesystem, so **`live` mode cannot run on Pages as configured** — the
logs need a durable store (D1, R2, or a small host with a disk) before any real
payment is taken. This is recorded as a blocker rather than worked around,
because working around it would mean holding orders somewhere that forgets them.

`closed` mode has nothing to write and deploys as-is.
