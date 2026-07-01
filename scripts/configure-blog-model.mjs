import { existsSync } from 'node:fs'
import { stdin, stderr } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { resolve } from 'node:path'
import {
  buildModelConfigStatus,
  defaultEnvPath,
  hasUsableValue,
  loadLocalEnv,
  normalizeProfile,
  profileFieldKeys,
  readDraftModelConfig,
  redactSensitiveText,
  repoRelativePath,
  repoRoot,
  supportedProfiles,
  updateEnvFileValues,
  validateDraftModelConfig,
} from './blog-model-config.mjs'

function parseArgs(argv) {
  const args = {
    command: '',
    subcommand: '',
    profile: 'strong',
    format: 'markdown',
    envFile: defaultEnvPath,
    yes: false,
    live: false,
    help: false,
  }
  const positionals = []

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
    if (item === '--profile') {
      args.profile = argv[index + 1] ?? args.profile
      index += 1
      continue
    }
    if (item.startsWith('--profile=')) {
      args.profile = item.slice('--profile='.length)
      continue
    }
    if (item === '--format') {
      args.format = argv[index + 1] ?? args.format
      index += 1
      continue
    }
    if (item.startsWith('--format=')) {
      args.format = item.slice('--format='.length)
      continue
    }
    if (item === '--env-file') {
      args.envFile = resolve(repoRoot, argv[index + 1] ?? '.env.local')
      index += 1
      continue
    }
    if (item.startsWith('--env-file=')) {
      args.envFile = resolve(repoRoot, item.slice('--env-file='.length))
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
    '  npm.cmd run blog:model -- setup --profile strong',
    '  npm.cmd run blog:model -- status --profile strong --format json',
    '  npm.cmd run blog:model -- doctor --profile strong --format markdown',
    '  npm.cmd run blog:model -- doctor --profile strong --live --format markdown',
    '  npm.cmd run blog:model -- config path --format json',
    '',
    'Aliases:',
    '  npm.cmd run blog:model:wizard -- --profile strong',
    '  npm.cmd run blog:model:check -- --profile strong --format markdown',
    '',
    'Notes:',
    '  setup writes private values to .env.local by default.',
    '  status is offline and never prints API keys or real relay URLs.',
    '  doctor is offline by default; add --live for an explicit minimal model request.',
  ].join('\n')
}

function normalizeFormat(value) {
  return String(value ?? '').toLowerCase() === 'json' ? 'json' : 'markdown'
}

function resultToMarkdown(result) {
  const lines = [`# Blog Model ${result.command}`]
  lines.push('')
  lines.push(`- ok: ${result.ok ? 'true' : 'false'}`)
  if (result.profile) lines.push(`- profile: ${result.profile}`)
  if (result.provider) lines.push(`- provider: ${result.provider}${result.status ? ` (${result.status.provider.source})` : ''}`)
  if (result.model) lines.push(`- model: ${result.model}${result.status ? ` (${result.status.model.source})` : ''}`)
  if (result.temperature !== undefined) lines.push(`- temperature: ${result.temperature}${result.status ? ` (${result.status.temperature.source})` : ''}`)
  if (result.envFile) lines.push(`- env file: ${result.envFile.path}`)
  if (result.status) {
    lines.push(`- base URL: ${result.status.baseUrl.set ? 'set' : 'missing'} (${result.status.baseUrl.source})`)
    lines.push(`- API key: ${result.status.apiKey.set ? 'set' : 'missing'} (${result.status.apiKey.source})`)
  }
  if (result.httpStatus) lines.push(`- HTTP status: ${result.httpStatus}`)
  if (result.message) lines.push(`- message: ${result.message}`)
  if (result.error) lines.push(`- error: ${result.error}`)
  if (result.issues?.length) {
    lines.push('')
    lines.push('## Issues')
    for (const issue of result.issues) lines.push(`- ${issue.code}: ${issue.message}`)
  }
  if (result.warnings?.length) {
    lines.push('')
    lines.push('## Warnings')
    for (const warning of result.warnings) lines.push(`- ${warning}`)
  }
  if (result.recovery?.length) {
    lines.push('')
    lines.push('## Recovery')
    for (const item of result.recovery) lines.push(`- ${item}`)
  }
  if (result.keys?.length) {
    lines.push('')
    lines.push('## Updated Keys')
    for (const key of result.keys) lines.push(`- ${key}`)
  }
  return `${lines.join('\n')}\n`
}

function writeResult(result, format) {
  if (normalizeFormat(format) === 'json') {
    console.log(JSON.stringify(result, null, 2))
    return
  }
  console.log(resultToMarkdown(result))
}

function buildStatusResult(args) {
  const config = readDraftModelConfig(args.profile)
  const status = buildModelConfigStatus(config)
  const issues = validateDraftModelConfig(config)
  const warnings = []
  if (config.profile !== 'default') {
    for (const [field, detail] of Object.entries(status)) {
      if (field === 'profile') continue
      if (detail.source !== 'profile') warnings.push(`${field} resolved from ${detail.source || 'fallback'} instead of ${config.profile} profile.`)
    }
  }
  return {
    ok: issues.length === 0,
    command: 'status',
    profile: config.profile,
    provider: status.provider.value,
    model: status.model.value,
    temperature: status.temperature.value,
    status,
    issues,
    warnings,
    recovery: issues.length > 0 ? [
      `Run npm.cmd run blog:model -- setup --profile ${config.profile}`,
      `Then run npm.cmd run blog:model -- doctor --profile ${config.profile}`,
    ] : [],
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
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
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

async function promptLine(rl, question) {
  return (await rl.question(question)).trim()
}

async function promptHidden(question) {
  if (!stdin.isTTY || !stderr.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Interactive secret input requires a TTY. Run this command in a local terminal.')
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

async function runSetup(args) {
  if (!stdin.isTTY || !stderr.isTTY) {
    throw new Error('setup requires an interactive terminal. Use status or doctor for non-interactive checks.')
  }

  const rl = createInterface({ input: stdin, output: stderr })
  try {
    const profileInput = args.profile
      ? args.profile
      : await promptLine(rl, 'Profile [strong]: ')
    const profile = normalizeProfile(profileInput || 'strong')
    const keys = profileFieldKeys(profile)
    stderr.write(`Configuring ${profile} profile in ${repoRelativePath(args.envFile)}.\n`)
    stderr.write('Leave a value blank to keep the existing setting. Enter - to clear it.\n')

    const updates = {}
    const baseUrl = wizardValue(await promptLine(rl, `${keys.BASE_URL} (private relay URL, not printed later): `))
    if (baseUrl !== undefined) updates[keys.BASE_URL] = baseUrl.replace(/\/$/, '')

    const model = wizardValue(await promptLine(rl, `${keys.MODEL} (model id): `))
    if (model !== undefined) updates[keys.MODEL] = model

    const provider = wizardValue(await promptLine(rl, `${keys.PROVIDER} (non-secret provider label): `))
    if (provider !== undefined) updates[keys.PROVIDER] = provider

    const temperature = wizardValue(await promptLine(rl, `${keys.TEMPERATURE} (0-2, suggested 0.65): `))
    if (temperature !== undefined) {
      const parsed = Number(temperature)
      if (!Number.isFinite(parsed)) throw new Error('Temperature must be numeric.')
      updates[keys.TEMPERATURE] = String(parsed)
    }

    const apiKey = wizardValue(await promptHidden(`${keys.API_KEY} (hidden): `))
    if (apiKey !== undefined) updates[keys.API_KEY] = apiKey

    if (Object.keys(updates).length === 0) {
      return {
        ok: true,
        command: 'setup',
        profile,
        envFile: { path: repoRelativePath(args.envFile) },
        message: 'No changes requested.',
      }
    }

    if (!args.yes) {
      stderr.write(`Ready to update ${Object.keys(updates).length} key(s) in ${repoRelativePath(args.envFile)}.\n`)
      const confirm = (await promptLine(rl, 'Write changes? [y/N]: ')).toLowerCase()
      if (confirm !== 'y' && confirm !== 'yes') {
        return {
          ok: false,
          command: 'setup',
          profile,
          envFile: { path: repoRelativePath(args.envFile) },
          message: 'Setup cancelled before writing.',
        }
      }
    }

    const result = await updateEnvFileValues(args.envFile, updates)
    return {
      ok: true,
      command: 'setup',
      profile,
      envFile: { path: result.path },
      keys: result.keys,
      message: 'Profile configuration updated. Run doctor before generating drafts.',
    }
  } finally {
    rl.close()
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

  if (!supportedProfiles.includes(args.profile)) {
    stderr.write(`Warning: profile "${args.profile}" is custom. Expected one of ${supportedProfiles.join(', ')}.\n`)
  }

  if (args.command !== 'setup') await loadLocalEnv(args.envFile)

  let result
  if (args.command === 'setup') result = await runSetup(args)
  else if (args.command === 'status') result = buildStatusResult(args)
  else if (args.command === 'doctor' || args.command === 'check') result = await runDoctor(args)
  else if (args.command === 'config' && args.subcommand === 'path') result = runConfigPath(args)
  else throw new Error(`Unknown command: ${args.command}${args.subcommand ? ` ${args.subcommand}` : ''}`)

  writeResult(result, args.format)
  if (!result.ok) process.exitCode = 1
}

main().catch((error) => {
  console.error(redactSensitiveText(error.message))
  process.exitCode = 1
})
