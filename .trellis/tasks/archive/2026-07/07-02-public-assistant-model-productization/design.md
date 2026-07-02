# 公开助手模型接入产品化设计

## Existing Entry Point

- Backend: `POST /chat/public`
- Frontend: `VITE_CHAT_API_BASE_URL`
- Model env:
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`
  - `OPENAI_MODEL`

## Response Metadata

Extend `ChatResponse` with:

```ts
meta?: {
  mode: 'model' | 'fallback'
  model: string
  citationCount: number
}
```

The model name is non-sensitive. API key and base URL are never returned.

## Model Failure Behavior

`generateAnswer` should return both answer and mode. If the provider is missing,
errors, or returns empty content, answer with the existing fallback and
`mode='fallback'`.

## Frontend Product Shape

The floating assistant should:

- show a compact status line in the header;
- show per-answer metadata such as “模型辅助 / 本地知识” and citation count;
- keep citation cards as the primary trust mechanism;
- keep the local fallback when no backend URL is configured.

## Security Boundary

The public assistant remains public-knowledge grounded. It should not claim it
can access private repos, internal assistant sessions, admin data, real secrets,
or production dashboards.
