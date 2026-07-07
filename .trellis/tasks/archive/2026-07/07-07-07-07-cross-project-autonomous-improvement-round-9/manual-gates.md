# Manual Gates

## M1. GitHub SSH host key verification blocks push

- Status: awaiting human verification.
- Local state: `main` has local commits ahead of `origin/main`; run `git status --short --branch` for the current count.
- Remote shape: `origin` uses SSH alias `github.com-bill`, resolving to `hostname github.com`, `user git`, `port 22`.
- Security note: do not automatically edit `C:\Users\zhang\.ssh\known_hosts` or bypass `StrictHostKeyChecking`.
- Needed from user: verify the GitHub SSH host key through official GitHub fingerprint documentation or another trusted channel, then update `known_hosts` intentionally.

## M2. Production and live checks remain manual

- Credentialed Legal RAG / ERP / Xunqiu checks require approved demo credentials or production tokens.
- Public/internal assistant live model prompts remain opt-in real tasks only.
- AI Daily live source fetching, model-assisted generation, first production issue conversion, and public export remain opt-in content tasks.
- Prometheus, Grafana, ARMS, Umami/Plausible, Cloudflare dashboards, and alert routing remain platform setup.
- Pet/Xunqiu APK/AAB signing, checksum publication, and public download approval remain release gates.
