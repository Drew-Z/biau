# Blog model fallback channels design

## Scope

This task updates the repository-owned blog content model tooling and the
project-local `blog-content-pipeline` skill docs. It does not change the public
assistant model routing, smart-search configuration, or published blog article
body.

## Existing Boundary

Current model-assisted blog commands have three moving parts:

- `scripts/blog-model-config.mjs`: shared env parsing, status shape, validation,
  redaction, and URL normalization.
- `scripts/configure-blog-model.mjs`: `blog:model setup/status/doctor/config`.
- `scripts/generate-blog-draft.mjs`: `blog:draft -- --generate` and
  `--polish-from` model calls.

Today `readDraftModelConfig(profile)` returns one channel. The selected profile
may resolve through profile-specific variables, shared `BLOG_DRAFT_*`, legacy
`GEMINI_*`, and hardcoded non-secret fallback values. This compatibility path
must remain, but it is not the new same-role fallback feature.

## Configuration Contract

Keep the existing primary channel keys unchanged:

```text
BLOG_DRAFT_REVIEW_BASE_URL=
BLOG_DRAFT_REVIEW_API_KEY=
BLOG_DRAFT_REVIEW_MODEL=deepseek-v4-pro
BLOG_DRAFT_REVIEW_PROVIDER=polish-relay
BLOG_DRAFT_REVIEW_TEMPERATURE=0.2
```

Add indexed fallback channel keys under the same profile:

```text
BLOG_DRAFT_REVIEW_FALLBACK_1_BASE_URL=
BLOG_DRAFT_REVIEW_FALLBACK_1_API_KEY=
BLOG_DRAFT_REVIEW_FALLBACK_1_MODEL=deepseek-v4-pro
BLOG_DRAFT_REVIEW_FALLBACK_1_PROVIDER=polish-relay-backup
BLOG_DRAFT_REVIEW_FALLBACK_1_TEMPERATURE=0.2

BLOG_DRAFT_REVIEW_FALLBACK_2_BASE_URL=
BLOG_DRAFT_REVIEW_FALLBACK_2_API_KEY=
BLOG_DRAFT_REVIEW_FALLBACK_2_MODEL=deepseek-v4-pro
BLOG_DRAFT_REVIEW_FALLBACK_2_PROVIDER=polish-relay-third
BLOG_DRAFT_REVIEW_FALLBACK_2_TEMPERATURE=0.2
```

The same pattern applies to `STRONG`, `FAST`, custom profiles, and optionally
`default`:

```text
BLOG_DRAFT_STRONG_FALLBACK_1_*
BLOG_DRAFT_FAST_FALLBACK_1_*
BLOG_DRAFT_MY_PROFILE_FALLBACK_1_*
BLOG_DRAFT_FALLBACK_1_*          # default profile only
```

Discovery rule:

- Fallback channels are discovered by scanning env keys that match
  `<profile-prefix>FALLBACK_<number>_<FIELD>`.
- Numbers are sorted ascending.
- A fallback channel is considered configured if any of its fields exists.
- A fallback channel is usable only when base URL, API key, and model are set.
- Provider remains a non-secret label; if missing, derive a non-secret fallback
  label from the profile and fallback index.
- Temperature is optional; missing or invalid temperature uses the profile
  recommendation default.

Same-role policy:

- Fallback channels belong to one selected profile. The tooling should describe
  them as same-role channels.
- The wizard should recommend the same model ID as the primary profile where
  possible. It may still accept an equivalent same-role model when the user
  enters one intentionally.
- Status should show a warning when a fallback model differs from the primary
  model, because that changes comparison behavior.

## Shared Config API

Add these helpers in `scripts/blog-model-config.mjs`:

- `fallbackFieldKey(profile, index, field)`
- `fallbackFieldKeys(profile, index)`
- `discoverFallbackIndexes(profile, source)`
- `readDraftModelChannels(profile, source)`
- `validateDraftModelChannel(channel)`
- `buildModelChannelStatus(channel, primaryModel?)`

Return shape for `readDraftModelChannels`:

```js
{
  profile: 'review',
  channels: [
    {
      profile: 'review',
      role: 'primary',
      index: 0,
      label: 'primary',
      baseUrl,
      apiKey,
      model,
      provider,
      temperature,
      resolutions,
    },
    {
      profile: 'review',
      role: 'fallback',
      index: 1,
      label: 'fallback-1',
      baseUrl,
      apiKey,
      model,
      provider,
      temperature,
      resolutions,
    },
  ],
}
```

Keep `readDraftModelConfig(profile)` as a compatibility wrapper returning the
primary channel.

## CLI Setup

Extend `scripts/configure-blog-model.mjs` args:

- `--fallback`: configure fallback channel(s) instead of the primary channel for
  an explicit profile.
- `--fallback-index <n>`: update a specific fallback channel.
- `--fallback-count <n>`: non-interactive convenience for multiple future
  channels is out of scope for implementation unless trivial; repeated commands
  are acceptable.

Interactive setup behavior:

- `blog:model setup` keeps the current three-profile beginner wizard.
- After each primary profile prompt, ask: `Configure fallback channels for
  <profile> now? [y/N]`. Default is no.
- If yes, prompt fallback channel fields and then ask whether to add another.
- `blog:model setup --profile review --fallback` skips primary prompts and adds
  or edits review fallback channels.
- Without `--fallback-index`, the wizard chooses the next available numeric
  fallback index.
- With `--fallback-index`, it edits that specific channel.

Non-interactive behavior:

```powershell
npm.cmd run blog:model -- setup --non-interactive --profile review --fallback --fallback-index 1 --base-url "https://relay.example.com" --api-key "key" --model "deepseek-v4-pro" --provider "deepseek-backup"
```

The command writes only placeholder examples in docs and real values only to the
private env file selected by `--local-env` or the default `.env.local`.

## Status And Doctor

`status` output should remain offline and masked:

```text
## review - Polishing model
- ok: true
- profile-specific: true
- role: polish

### Primary channel
- provider: deepseek-v4-pro (profile)
- model: deepseek-v4-pro (profile)
- base URL: set (profile)
- API key: set (profile)

### Fallback channels
#### fallback-1
- ok: true
- provider: deepseek-backup (fallback-1)
- model: deepseek-v4-pro (fallback-1)
- base URL: set (fallback-1)
- API key: set (fallback-1)
```

Offline doctor validates all configured channels and reports missing fields.
`doctor --all --live` remains unsupported. Live doctor stays explicit for one
profile; optional `--fallback-index` may live-check one fallback channel only if
implementation cost is low. It must never live-check all fallback channels by
default.

## Generation / Polish Fallback Flow

`scripts/generate-blog-draft.mjs` should use `readDraftModelChannels(profile)`.

Algorithm:

1. Load local env.
2. Build the selected profile's channel list.
3. Validate each channel and keep complete channels as candidates.
4. If no complete channel exists, fail before network access with aggregated,
   redacted setup guidance.
5. For each complete channel in order:
   - Print `使用模型渠道：review primary -> provider / model` or
     `使用模型渠道：review fallback-1 -> provider / model`.
   - Send one OpenAI-compatible chat completion request.
   - On success with non-empty `choices[0].message.content`, return that content
     and the winning channel config.
   - On fetch error, non-OK HTTP status, malformed JSON, or empty content, record
     a redacted attempt diagnostic and try the next same-profile channel.
6. If all channels fail, throw an error that lists channel labels,
   provider/model labels, and redacted failure kinds.

Failure kinds should be non-secret and actionable:

- `network_error`
- `http_status:<status>`
- `invalid_json`
- `empty_response`
- `missing_required_field`

Do not print real base URLs, API keys, headers, account names, or full upstream
error bodies.

`writeDraft` / `writePolishedDraft` should record the winning channel in
`generatedBy`, for example:

```text
model-assisted-polish:review:fallback-1:deepseek-backup:deepseek-v4-pro
```

## Documentation Updates

Update:

- `.env.example`
- `.agents/skills/blog-content-pipeline/SKILL.md`
- `.agents/skills/blog-content-pipeline/references/usage.md`
- `.agents/skills/blog-content-pipeline/references/review-and-prompts.md`
- `.trellis/spec/backend/blog-draft-workflow.md`
- Optional local draft docs that describe the old single-channel-only contract,
  such as `content-drafts/README.md` and
  `content-drafts/blog-rewrite-workflow.md`, only if needed by validation.

## Compatibility

- Existing `.env.local` files with only primary profile keys continue to work.
- Existing default and legacy fallback resolution stays visible as a setup gap
  for model-assisted runs.
- Fallback channels never override primary channels when the primary succeeds.
- Missing or partially configured fallback channels do not break single-channel
  usage unless all usable channels are missing for a live generation command.

## Rollback

Revert:

- `scripts/blog-model-config.mjs`
- `scripts/configure-blog-model.mjs`
- `scripts/generate-blog-draft.mjs`
- `.env.example`
- skill docs/spec docs touched by this task

The private `.env.local` file is not committed. If a user configured fallback
keys locally and wants to roll back behavior, they can leave them unused or
remove the `BLOG_DRAFT_<PROFILE>_FALLBACK_<N>_*` keys.
