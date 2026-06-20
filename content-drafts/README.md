# Public Blog Drafts

This folder stores Gemini-generated Markdown drafts before they are reviewed and moved into `src/data/blog.ts`.

Rules:

- Drafts must be written as public technical explainers, not interview notes or private preparation material.
- Do not mention day numbers, resumes, job search, or internal study plans.
- Run `npm run blog:check` before promoting any draft into the public site.
- Keep API keys in `.env.local`; never commit local secrets.

Useful commands:

```bash
npm run blog:plan
npm run blog:draft -- --limit 3
npm run blog:draft -- --slug rag-overview-public --force
npm run blog:check
```
