# 公开助手产品体验与模型接入落地补强设计

## Environment Contract

Preferred public assistant model env:

- `ASSISTANT_MODEL_API_KEY`
- `ASSISTANT_MODEL_BASE_URL`
- `ASSISTANT_MODEL_NAME`
- `ASSISTANT_MODEL_PROVIDER`

Compatibility fallback:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

The browser only receives `VITE_CHAT_API_BASE_URL`, never provider keys or relay URLs.

## Backend Contract

Keep the response shape compatible:

```ts
meta?: {
  mode: 'model' | 'fallback'
  model: string
  citationCount: number
  provider?: string
  reason?: 'not_configured' | 'provider_error' | 'empty_response'
}
```

`reason` is non-sensitive and intentionally coarse. It must not include raw HTTP body, provider URL, key fragments, prompt content, or stack traces.

`generateAnswer` owns model/fallback selection. `app.ts` should only pass the question, citations, and scope, then forward the sanitized metadata.

## Prompt Boundary

The model prompt remains retrieval-grounded:

- public scope only answers from provided public site facts;
- internal scope can help organize site knowledge for members, but should not claim write actions;
- no private repo, dashboard, secret, customer, deployment health, or admin claims.

## Frontend Shape

`PublicAssistantWidget` should remain a compact floating product surface:

- trigger: clear public assistant identity;
- header: title, status pill, close icon/text;
- intro: boundary and what users can ask;
- messages: answer content, trust meta, citations;
- suggestions: visitor-friendly prompts;
- composer: short input and disabled/loading states;
- errors: helpful fallback copy with links.

## Validation Strategy

Run backend checks for the adapter contract, frontend build/lint for UI changes, public blog/assistant index checks for knowledge consistency, and UI check if layout selectors are touched.
