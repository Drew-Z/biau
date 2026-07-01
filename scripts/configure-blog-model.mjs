import { existsSync } from 'node:fs'
import { stdin, stderr } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { resolve } from 'node:path'
import {
  buildChatCompletionsUrl,
  buildModelConfigStatus,
  defaultEnvPath,
  getProfileRecommendation,
  loadLocalEnv,
  normalizeBaseUrl,
  normalizeProfile,
  profileFieldKeys,
  readDraftModelConfig,
  readEnvFileValues,
  redactSensitiveText,
  repoRelativePath,
  repoRoot,
  setupProfileOrder,
  supportedProfiles,
  updateEnvFileValues,
  validateDraftModelConfig,
} from './blog-model-config.mjs'

function parseArgs(argv) {
  const args = {
    command: '',
    subcommand: '',
    profile: 'strong',
    profileExplicit: false,
    format: 'markdown',
    envFile: defaultEnvPath,
    yes: false,
    live: false,
    all: false,
    advanced: false,
    nonInteractive: false,
    help: false,
    baseUrl: undefined,
    apiKey: undefined,
    model: undefined,
    provider: undefined,
    temperature: undefined,
  }
  const positionals = []

  const readValue = (argvIndex) => argv[argvIndex + 1] ?? ''

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--help' || item === '-h') {
      args.help = true
      continue
    }
    if (item === '--yes' || item === '-y') {
      args.yes = true
      continue
    }
    if (item === '--live') {
      args.live = true
      continue
    }
    if (item === '--all') {
      args.all = true
      continue
    }
    if (item === '--advanced') {
      args.advanced = true
      continue
    }
    if (item === '--non-interactive') {
      args.nonInteractive = true
      continue
    }
    if (item === '--profile') {
      args.profile = readValue(index)
      args.profileExplicit = true
      index += 1
      continue
    }
    if (item.startsWith('--profile=')) {
      args.profile = item.slice('--profile='.length)
      args.profileExplicit = true
      continue
    }
    if (item === '--format') {
      args.format = readValue(index)
      index += 1
      continue
    }
    if (item.startsWith('--format=')) {
      args.format = item.slice('--format='.length)
      continue
    }
    if (item === '--env-file' || item === '--local-env') {
      args.envFile = resolve(repoRoot, readValue(index) || '.env.local')
      index += 1
      continue
    }
    if (item.startsWith('--env-file=')) {
      args.envFile = resolve(repoRoot, item.slice('--env-file='.length))
      continue
    }
    if (item.startsWith('--local-env=')) {
      args.envFile = resolve(repoRoot, item.slice('--local-env='.length))
      continue
    }
    if (item === '--base-url') {
      args.baseUrl = readValue(index)
      index += 1
      continue
    }
    if (item.startsWith('--base-url=')) {
      args.baseUrl = item.slice('--base-url='.length)
      continue
    }
    if (item === '--api-key') {
      args.apiKey = readValue(index)
      index += 1
      continue
    }
    if (item.startsWith('--api-key=')) {
      args.apiKey = item.slice('--api-key='.length)
      continue
    }
    if (item === '--model') {
      args.model = readValue(index)
      index += 1
      continue
    }
    if (item.startsWith('--model=')) {
      args.model = item.slice('--model='.length)
      continue
    }
    if (item === '--provider') {
      args.provider = readValue(index)
      index += 1
      continue
    }
    if (item.startsWith('--provider=')) {
      args.provider = item.slice('--provider='.length)
      continue
    }
    if (item === '--temperature') {
      args.temperature = readValue(index)
      index += 1
      continue
    }
    if (item.startsWith('--temperature=')) {
      args.temperature = item.slice('--temperature='.length)
      continue
    }
    positionals.push(item)
  }

  args.command = positionals[0] ?? 'help'
  args.subcommand = positionals[1] ?? ''
  return args
}

function usage() {
  return [
    'Blog model profile CLI',
    '',
    'Usage:',
    '  npm.cmd run blog:model -- setup',
    '  npm.cmd run blog:model -- setup --profile strong',
    '  npm.cmd run blog:model -- setup --profile strong --advanced',
    '  npm.cmd run blog:model -- setup --non-interactive --profile strong --base-url "https://relay.example.com" --api-key "key" --model "glm-5.2" --provider "glm"',
    '  npm.cmd run blog:model -- status --all --format markdown',
    '  npm.cmd run blog:model -- status --profile strong --format json',
    '  npm.cmd run blog:model -- doctor --all --format markdown',
    '  npm.cmd run blog:model -- doctor --profile strong --live --format markdown',
    '  npm.cmd run blog:model -- config path --format json',
    '',
    'Aliases:',
    '  npm.cmd run blog:model:wizard -- --profile strong',
    '  npm.cmd run blog:model:check -- --profile strong --format markdown',
    '',
    'Profiles:',
    '  strong: generation model, recommended GLM-5.2 or Gemini 3.1 Pro.',
    '  review: polishing model, recommended DeepSeek V4 Pro.',
    '  fast: fast helper model, recommended Gemini 3.5 Flash.',
    '',
    'Notes:',
    '  setup writes private values to .env.local by default; use --local-env PATH for a different private env file.',
    '  setup without --profile guides strong, review, and fast.',
    '  beginner setup does not ask for temperature; use --advanced or --temperature.',
    '  status is offline and never prints API keys or real relay URLs.',
    '  doctor is offline by default; add --live for an explicit minimal model request.',
  ].join('\n')
}

function normalizeFormat(value) {
  return String(value ?? '').toLowerCase() === 'json' ? 'json' : 'markdown'
}

function profileHeading(result) {
  const meta = result.meta ?? getProfileRecommendation(result.profile)
  return `${result.profile} - ${meta.label}`
}

function appendSingleResult(lines, result, level = '##') {
  lines.push(`${level} ${profileHeading(result)}`)
  lines.push(`- ok: ${result.ok ? 'true' : 'false'}`)
  if (result.profileSpecific !== undefined) lines.push(`- profile-specific: ${result.profileSpecific ? 'true' : 'false'}`)
  if (result.meta?.role) lines.push(`- role: ${result.meta.role}`)
  if (result.provider) lines.push(`- provider: ${result.provider}${result.status ? ` (${result.status.provider.source})` : ''}`)
  if (result.model) lines.push(`- model: ${result.model}${result.status ? ` (${result.status.model.source})` : ''}`)
  if (result.temperature !== undefined) lines.push(`- temperature: ${result.temperature}${result.status ? ` (${result.status.temperature.source})` : ''}`)
  if (result.status) {
    lines.push(`- base URL: ${result.status.baseUrl.set ? 'set' : 'missing'} (${result.status.baseUrl.source})`)
    lines.push(`- API key: ${result.status.apiKey.set ? 'set' : 'missing'} (${result.status.apiKey.source})`)
  }
  if (result.httpStatus) lines.push(`- HTTP status: ${result.httpStatus}`)
  if (result.message) lines.push(`- message: ${result.message}`)
  if (result.error) lines.push(`- error: ${result.error}`)
  if (result.issues?.length) {
    lines.push('')
    lines.push(`${level === '##' ? '###' : '####'} Issues`)
    for (const issue of result.issues) lines.push(`- ${issue.code}: ${issue.message}`)
  }
  if (result.warnings?.length) {
    lines.push('')
    lines.push(`${level === '##' ? '###' : '####'} Warnings`)
    for (const warning of result.warnings) lines.push(`- ${warning}`)
  }
  if (result.recovery?.length) {
    lines.push('')
    lines.push(`${level === '##' ? '###' : '####'} Recovery`)
    for (const item of result.recovery) lines.push(`- ${item}`)
  }
}

function resultToMarkdown(result) {
  const lines = [`# Blog Model ${result.command}`]
  lines.push('')
  lines.push(`- ok: ${result.ok ? 'true' : 'false'}`)
  if (result.envFile) lines.push(`- env file: ${result.envFile.path}`)
  if (result.message) lines.push(`- message: ${result.message}`)
  if (result.profiles?.length) {
    lines.push('')
    for (const item of result.profiles) {
      appendSingleResult(lines, item)
      lines.push('')
    }
  } else if (result.profile) {
    appendSingleResult(lines, result)
  }
  if (result.keys?.length) {
    lines.push('')
    lines.push('## Updated Keys')
    for (const key of result.keys) lines.push(`- ${key}`)
  }
  if (result.recovery?.length && !result.profile && !result.profiles?.length) {
    lines.push('')
    lines.push('## Recovery')
    for (const item of result.recovery) lines.push(`- ${item}`)
  }
  return `${lines.join('\n').replace(/\n+$/, '')}\n`
}

function writeResult(result, format) {
  if (normalizeFormat(format) === 'json') {
    console.log(JSON.stringify(result, null, 2))
    return
  }
  console.log(resultToMarkdown(result))
}

function setupProfilesFor(args) {
  if (args.all) return setupProfileOrder
  if (args.command === 'setup' && !args.profileExplicit && !args.advanced && !args.nonInteractive) return setupProfileOrder
  return [normalizeProfile(args.profile || 'strong')]
}

function buildStatusResult(args) {
  const config = readDraftModelConfig(args.profile)
  const status = buildModelConfigStatus(config)
  const issues = validateDraftModelConfig(config)
  const warnings = []
  if (config.profile !== 'default') {
    for (const [field, detail] of Object.entries(status)) {
      if (field === 'profile' || field === 'temperature') continue
      if (detail.source !== 'profile') warnings.push(`${field} resolved from ${detail.source || 'fallback'} instead of ${config.profile} profile.`)
    }
  }
  return {
    ok: issues.length === 0,
    command: 'status',
    profile: config.profile,
    profileSpecific: issues.length === 0 && warnings.length === 0,
    meta: getProfileRecommendation(config.profile),
    provider: status.provider.value,
    model: status.model.value,
    temperature: status.temperature.value,
    status,
    issues,
    warnings,
    recovery: issues.length > 0 || warnings.length > 0 ? [
      `Run npm.cmd run blog:model -- setup --profile ${config.profile}`,
      `Then run npm.cmd run blog:model -- doctor --profile ${config.profile}`,
    ] : [],
  }
}

function buildAllStatusResult(args) {
  const profiles = setupProfilesFor({ ...args, all: true })
    .map((profile) => buildStatusResult({ ...args, all: false, profile }))
  return {
    ok: profiles.every((profile) => profile.ok),
    command: 'status',
    profiles,
    envFile: { path: repoRelativePath(args.envFile) },
  }
}

async function runDoctor(args) {
  const statusResult = buildStatusResult(args)
  if (!statusResult.ok) {
    return { ...statusResult, command: 'doctor' }
  }

  if (!args.live) {
    return {
      ...statusResult,
      command: 'doctor',
      message: 'offline doctor passed; no model request was sent. Add --live only when you explicitly want a minimal channel check.',
      recovery: statusResult.warnings.length > 0
        ? [`Run npm.cmd run blog:model -- setup --profile ${statusResult.profile} to avoid relying on fallback or legacy values.`]
        : [],
    }
  }

  const config = readDraftModelConfig(args.profile)
  try {
    const response = await fetch(buildChatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        messages: [
          { role: 'system', content: 'You are a blog model channel health check. Reply with OK only.' },
          { role: 'user', content: 'Reply with OK if this blog draft model channel works.' },
        ],
      }),
    })

    if (!response.ok) {
      const body = redactSensitiveText((await response.text()).slice(0, 500))
      return {
        ...statusResult,
        ok: false,
        command: 'doctor',
        httpStatus: response.status,
        error: `model_api_error: ${body}`,
        recovery: [
          'Check whether the selected profile uses a model id recognized by the relay.',
          'Run status with --format json to confirm which non-secret profile label and model id are selected.',
          'Rerun setup for this profile before trying blog:draft --generate again.',
        ],
      }
    }

    const json = await response.json()
    const content = json?.choices?.[0]?.message?.content
    return {
      ...statusResult,
      ok: Boolean(content),
      command: 'doctor',
      httpStatus: response.status,
      message: content ? 'model channel responded' : 'model channel returned no message content',
      recovery: content ? [] : ['Check whether the relay returns OpenAI-compatible choices[0].message.content.'],
    }
  } catch (error) {
    return {
      ...statusResult,
      ok: false,
      command: 'doctor',
      error: `network_error: ${redactSensitiveText(error.message)}`,
      recovery: [
        'Check local network access and the configured private relay.',
        'Run status first to verify the selected profile is complete.',
      ],
    }
  }
}

async function runAllDoctor(args) {
  if (args.live) throw new Error('doctor --all --live is intentionally unsupported. Run a live check for one explicit profile at a time.')
  const profiles = []
  for (const profile of setupProfileOrder) {
    profiles.push(await runDoctor({ ...args, all: false, profile, live: false }))
  }
  return {
    ok: profiles.every((profile) => profile.ok),
    command: 'doctor',
    profiles,
    envFile: { path: repoRelativePath(args.envFile) },
    message: 'offline doctor checked all recommended blog model profiles; no model request was sent.',
  }
}

async function promptLine(question) {
  const rl = createInterface({ input: stdin, output: stderr })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

async function promptHidden(question) {
  if (!stdin.isTTY || !stderr.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Interactive secret input requires a TTY that can hide input. Run this command in a local terminal or use --non-interactive from your own shell.')
  }

  return new Promise((resolveValue, reject) => {
    let value = ''
    stderr.write(question)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    const cleanup = () => {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.off('data', onData)
      stderr.write('\n')
    }

    const onData = (char) => {
      if (char === '\u0003') {
        cleanup()
        reject(new Error('Setup cancelled.'))
        return
      }
      if (char === '\r' || char === '\n') {
        cleanup()
        resolveValue(value.trim())
        return
      }
      if (char === '\u0008' || char === '\u007f') {
        value = value.slice(0, -1)
        return
      }
      value += char
    }

    stdin.on('data', onData)
  })
}

function wizardValue(rawValue) {
  const value = String(rawValue ?? '').trim()
  if (!value) return undefined
  if (value === '-') return ''
  return value
}

function parseTemperature(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error('Temperature must be numeric.')
  return String(parsed)
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key)
}

function currentDisplay(source, key, field) {
  if (!hasOwn(source, key)) return 'missing'
  const value = source[key] ?? ''
  if (!value) return 'empty'
  if (field === 'API_KEY' || field === 'BASE_URL') return 'configured, Enter keeps it'
  return `${value}, Enter keeps it`
}

function writeSetupBanner(profiles, advanced) {
  stderr.write('\nBlog Model Setup\n')
  stderr.write('Evidence-first model-assisted writing uses Codex plus three optional OpenAI-compatible profiles.\n\n')
  for (const profile of profiles) {
    const meta = getProfileRecommendation(profile)
    stderr.write(`- ${profile}: ${meta.label}; ${meta.recommendation}\n`)
  }
  stderr.write('\nField examples:\n')
  stderr.write('- Base URL: https://relay.example.com or https://relay.example.com/v1\n')
  stderr.write('- Model ID: glm-5.2, deepseek-v4-pro, gemini-3.1-pro, gemini-3.5-flash\n')
  stderr.write('- Provider label: glm, deepseek, gemini, relay-main\n')
  stderr.write('- API key: hidden input; never printed by status or doctor\n')
  if (advanced) stderr.write('- Temperature: optional advanced value; common defaults are 0.65 draft, 0.2 polish, 0.35 fast\n')
  else stderr.write('- Temperature: skipped in beginner setup; internal defaults remain active\n')
  stderr.write('\nBlank keeps the existing value. Enter - to clear a value.\n')
}

async function promptYesNo(question, defaultValue = true) {
  const suffix = defaultValue ? 'Y/n' : 'y/N'
  const answer = (await promptLine(`${question} [${suffix}]: `)).toLowerCase()
  if (!answer) return defaultValue
  return ['y', 'yes', '1', 'true', '是', '好'].includes(answer)
}

async function promptProfileUpdates(profile, args, currentSource) {
  const keys = profileFieldKeys(profile)
  const meta = getProfileRecommendation(profile)
  stderr.write(`\n${profile}: ${meta.label}\n`)
  stderr.write(`${meta.recommendation}\n`)
  stderr.write(`Model examples: ${meta.modelExamples.join(', ')}\n`)
  stderr.write(`Provider examples: ${meta.providerExamples.join(', ')}\n`)

  if (!(await promptYesNo(`Configure ${profile} profile now?`, true))) return {}

  const updates = {}
  const baseUrl = wizardValue(await promptLine(`${keys.BASE_URL} private relay base URL (${currentDisplay(currentSource, keys.BASE_URL, 'BASE_URL')}): `))
  if (baseUrl !== undefined) updates[keys.BASE_URL] = normalizeBaseUrl(baseUrl)

  const model = wizardValue(await promptLine(`${keys.MODEL} exact model id (${currentDisplay(currentSource, keys.MODEL, 'MODEL')}): `))
  if (model !== undefined) updates[keys.MODEL] = model

  const provider = wizardValue(await promptLine(`${keys.PROVIDER} non-secret provider label (${currentDisplay(currentSource, keys.PROVIDER, 'PROVIDER')}): `))
  if (provider !== undefined) updates[keys.PROVIDER] = provider

  const apiKey = wizardValue(await promptHidden(`${keys.API_KEY} hidden API key (${currentDisplay(currentSource, keys.API_KEY, 'API_KEY')}): `))
  if (apiKey !== undefined) updates[keys.API_KEY] = apiKey

  if (args.advanced) {
    const temperature = wizardValue(await promptLine(`${keys.TEMPERATURE} optional temperature, suggested ${meta.defaultTemperature} (${currentDisplay(currentSource, keys.TEMPERATURE, 'TEMPERATURE')}): `))
    if (temperature !== undefined) updates[keys.TEMPERATURE] = parseTemperature(temperature)
  }

  return updates
}

function buildNonInteractiveUpdates(profile, args) {
  const keys = profileFieldKeys(profile)
  const updates = {}
  if (args.baseUrl !== undefined) updates[keys.BASE_URL] = normalizeBaseUrl(args.baseUrl)
  if (args.model !== undefined) updates[keys.MODEL] = args.model
  if (args.provider !== undefined) updates[keys.PROVIDER] = args.provider
  if (args.apiKey !== undefined) updates[keys.API_KEY] = args.apiKey
  if (args.temperature !== undefined) updates[keys.TEMPERATURE] = parseTemperature(args.temperature)
  return updates
}

async function runSetup(args) {
  const profiles = setupProfilesFor(args)
  for (const profile of profiles) {
    if (!supportedProfiles.includes(profile)) {
      stderr.write(`Warning: profile "${profile}" is custom. Expected one of ${supportedProfiles.join(', ')}.\n`)
    }
  }

  if (args.nonInteractive) {
    if (args.all) throw new Error('setup --all --non-interactive is ambiguous. Pass one explicit --profile.')
    const profile = profiles[0]
    const updates = buildNonInteractiveUpdates(profile, args)
    if (Object.keys(updates).length === 0) {
      return {
        ok: true,
        command: 'setup',
        profile,
        meta: getProfileRecommendation(profile),
        envFile: { path: repoRelativePath(args.envFile) },
        message: 'No changes requested.',
      }
    }
    const result = await updateEnvFileValues(args.envFile, updates)
    return {
      ok: true,
      command: 'setup',
      profile,
      meta: getProfileRecommendation(profile),
      envFile: { path: result.path },
      keys: result.keys,
      message: 'Profile configuration updated. Run masked status and offline doctor before generating drafts.',
    }
  }

  if (!stdin.isTTY || !stderr.isTTY) {
    throw new Error('setup requires an interactive terminal. Use status, doctor, or setup --non-interactive for non-interactive checks.')
  }

  const currentSource = Object.fromEntries((await readEnvFileValues(args.envFile)).entries())
  writeSetupBanner(profiles, args.advanced)

  const updates = {}
  const touchedProfiles = []
  for (const profile of profiles) {
    const profileUpdates = await promptProfileUpdates(profile, args, currentSource)
    if (Object.keys(profileUpdates).length > 0) {
      Object.assign(updates, profileUpdates)
      touchedProfiles.push({
        profile,
        meta: getProfileRecommendation(profile),
        ok: true,
        message: `${Object.keys(profileUpdates).length} value(s) selected for update.`,
      })
    }
  }

  if (Object.keys(updates).length === 0) {
    return {
      ok: true,
      command: 'setup',
      profiles: profiles.map((profile) => ({
        profile,
        meta: getProfileRecommendation(profile),
        ok: true,
        message: 'No changes requested.',
      })),
      envFile: { path: repoRelativePath(args.envFile) },
      message: 'No changes requested.',
    }
  }

  if (!args.yes) {
    stderr.write(`\nReady to update ${Object.keys(updates).length} key(s) in ${repoRelativePath(args.envFile)}.\n`)
    const confirm = await promptYesNo('Write changes?', false)
    if (!confirm) {
      return {
        ok: false,
        command: 'setup',
        profiles: touchedProfiles,
        envFile: { path: repoRelativePath(args.envFile) },
        message: 'Setup cancelled before writing.',
      }
    }
  }

  const result = await updateEnvFileValues(args.envFile, updates)
  return {
    ok: true,
    command: 'setup',
    profiles: touchedProfiles,
    envFile: { path: result.path },
    keys: result.keys,
    message: 'Profile configuration updated. Run masked status and offline doctor before generating drafts.',
  }
}

function runConfigPath(args) {
  return {
    ok: true,
    command: 'config path',
    envFile: {
      path: repoRelativePath(args.envFile),
      exists: existsSync(args.envFile),
      target: 'private-local-env',
    },
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  args.format = normalizeFormat(args.format)
  args.profile = normalizeProfile(args.profile)

  if (args.help || args.command === 'help') {
    console.log(usage())
    return
  }

  if (args.command !== 'setup') await loadLocalEnv(args.envFile)

  let result
  if (args.command === 'setup') result = await runSetup(args)
  else if (args.command === 'status') result = args.all ? buildAllStatusResult(args) : buildStatusResult(args)
  else if (args.command === 'doctor' || args.command === 'check') result = args.all ? await runAllDoctor(args) : await runDoctor(args)
  else if (args.command === 'config' && args.subcommand === 'path') result = runConfigPath(args)
  else throw new Error(`Unknown command: ${args.command}${args.subcommand ? ` ${args.subcommand}` : ''}`)

  writeResult(result, args.format)
  if (!result.ok) process.exitCode = 1
}

main().catch((error) => {
  console.error(redactSensitiveText(error.message))
  process.exitCode = 1
})
