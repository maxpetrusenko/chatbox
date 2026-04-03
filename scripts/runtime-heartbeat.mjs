import { execFile as execFileCallback } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import {
  RUNTIME_ROOT,
  collectStaleReport,
  escapeInline,
  formatTimestamp,
  readJson,
  writeJson,
} from './lib/living-docs.mjs'

const execFile = promisify(execFileCallback)

function parseArgs(argv) {
  const options = {
    date: new Date().toISOString().slice(0, 10),
    timestamp: formatTimestamp(),
    write: false,
    base: null,
    head: null,
    remoteRunId: null,
    remoteRunUrl: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--date') {
      options.date = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--timestamp') {
      options.timestamp = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--write') {
      options.write = true
      continue
    }

    if (arg === '--base') {
      options.base = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--head') {
      options.head = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--remote-run-id') {
      options.remoteRunId = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--remote-run-url') {
      options.remoteRunUrl = argv[index + 1]
      index += 1
    }
  }

  return options
}

async function getRepoDeltaFiles(options) {
  if (!options.base || !options.head || /^0+$/.test(options.base)) {
    return []
  }

  const { stdout } = await execFile('git', ['diff', '--name-only', options.base, options.head], {
    cwd: process.cwd(),
  })

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

async function readExtensionPolicy() {
  const filePath = path.join('docs', 'indexes', 'plugin-source-seed-registry.md')
  const text = await readFile(filePath, 'utf8')
  const resolved = /stay source seeds/i.test(text) && /stay source-seed overlays/i.test(text)

  return {
    resolved,
    summary: resolved
      ? 'Legacy plugin docs stay source seeds and K12 plans stay source-seed overlays.'
      : 'Extension/source-seed status is not explicitly resolved in the registry.',
  }
}

function buildRemoteProof(existingState, options) {
  if (options.remoteRunUrl && options.remoteRunId) {
    return {
      status: 'verified',
      run_id: options.remoteRunId,
      run_url: options.remoteRunUrl,
      verified_at: options.timestamp,
    }
  }

  if (existingState.remote_proof?.status === 'verified') {
    return existingState.remote_proof
  }

  return {
    status: 'missing',
    run_id: null,
    run_url: null,
    verified_at: null,
  }
}

function unique(items) {
  return [...new Set(items.filter(Boolean))]
}

function summarizeArtifactIssues(report) {
  return report.artifacts
    .filter((record) => record.status !== 'fresh')
    .map((record) => `${record.path} (${record.issues.join(', ')})`)
}

function deriveRuntime(report, repoDeltaFiles, extensionPolicy, remoteProof) {
  const staleIssues = summarizeArtifactIssues(report)
  const backlinkIssues = report.backlinks
    .filter((record) => record.status !== 'linked')
    .map((record) => `${record.path} (${record.notes})`)

  const flags = []
  if (staleIssues.length > 0) {
    flags.push(`${staleIssues.length} artifact freshness issues`)
  }
  if (backlinkIssues.length > 0) {
    flags.push(`${backlinkIssues.length} legacy backlink gaps`)
  }
  if (repoDeltaFiles.length > 0) {
    flags.push(`${repoDeltaFiles.length} repo files changed since base commit`)
  }
  if (!extensionPolicy.resolved) {
    flags.push('extension/source-seed policy unresolved')
  }
  if (remoteProof.status !== 'verified') {
    flags.push('remote living-docs refresh proof missing')
  }

  const blockingIssues = staleIssues.length > 0 || backlinkIssues.length > 0 || !extensionPolicy.resolved
  const activeStage = blockingIssues || repoDeltaFiles.length > 0 ? 'drift' : 'verification'
  const proofStatus = remoteProof.status === 'verified' ? 'remote-verified' : 'local-only'
  const driftStatus = flags.length === 0 ? 'clean' : blockingIssues || repoDeltaFiles.length > 0 ? 'attention' : 'tracked'

  let nextMove = 'Monitor the next repo change or scheduled refresh.'
  if (staleIssues.length > 0 || backlinkIssues.length > 0) {
    nextMove = 'Repair stale artifacts and backlink gaps, then rerun docs refresh.'
  }
  else if (repoDeltaFiles.length > 0) {
    nextMove = `Review ${repoDeltaFiles.length} changed repo file(s) against implementation, verification, and drift artifacts.`
  }
  else if (!extensionPolicy.resolved) {
    nextMove = 'Resolve extension/source-seed policy in docs/indexes/plugin-source-seed-registry.md.'
  }
  else if (remoteProof.status !== 'verified') {
    nextMove = 'Run the living-docs refresh workflow remotely once so runtime records remote proof.'
  }

  const staleDownstream = unique([
    ...staleIssues.map((entry) => entry.split(' (')[0]),
    ...backlinkIssues.map((entry) => entry.split(' (')[0]),
    ...(remoteProof.status !== 'verified'
      ? [
          'docs/indexes/refresh-cadence.md',
          'docs/indexes/stale-report.md',
          'docs/artifacts/runtime/current/proof.md',
        ]
      : []),
    ...(!extensionPolicy.resolved
      ? [
          'docs/indexes/plugin-source-seed-registry.md',
          'docs/artifacts/runtime/current/drift.md',
        ]
      : []),
  ])

  const verified = [
    `freshness scan captured ${report.summary.total} artifact sidecars and ${report.backlinks.length} legacy backlink checks`,
    extensionPolicy.summary,
    'shared runtime state is now derived from repo artifacts instead of manual-only notes',
  ]

  if (remoteProof.status === 'verified') {
    verified.push(`remote refresh proof recorded at ${remoteProof.run_url}`)
  }

  const inferred = remoteProof.status === 'verified'
    ? ['future scheduled runs still depend on GitHub Actions remaining healthy']
    : ['local refresh does not prove GitHub cron or remote auto-commit behavior']

  const missing = [
    ...(!extensionPolicy.resolved ? ['explicit extension/source-seed policy decision'] : []),
    ...(remoteProof.status !== 'verified' ? ['first remote living-docs refresh execution'] : []),
  ]

  return {
    activeStage,
    proofStatus,
    driftStatus,
    nextMove,
    flags,
    staleDownstream,
    verified,
    inferred,
    missing,
    staleIssues,
    backlinkIssues,
  }
}

function buildProofMarkdown(runtime, remoteProof) {
  const verifiedLine = runtime.verified.join('; ')
  const inferredLine = runtime.inferred.join('; ') || 'none'
  const missingLine = runtime.missing.join('; ') || 'none'
  const nextProofStep = remoteProof.status === 'verified'
    ? 'Watch the next scheduled run and keep the remote proof link fresh in runtime state.'
    : 'Push or dispatch the living-docs refresh workflow once so runtime records a verified remote run.'

  return `# Runtime Proof Ledger
Human skim: \`docs/artifacts/runtime/current/index.html\`

- Verified: ${verifiedLine}
- Inferred: ${inferredLine}
- Missing: ${missingLine}
- Next proof step: ${nextProofStep}
`
}

function buildDriftMarkdown(runtime, repoDeltaFiles) {
  const mismatches = unique([
    ...runtime.flags,
    ...runtime.staleIssues,
    ...runtime.backlinkIssues,
    ...(repoDeltaFiles.length > 0 ? [`repo delta files: ${repoDeltaFiles.join(', ')}`] : []),
  ])

  return `# Runtime Drift Ledger
Human skim: \`docs/artifacts/runtime/current/index.html\`

- Current status: ${runtime.driftStatus}
- Active mismatches: ${mismatches.length > 0 ? mismatches.join('; ') : 'none'}
- Stale downstream: ${runtime.staleDownstream.length > 0 ? runtime.staleDownstream.join(', ') : 'none'}
- Repair packet: ${runtime.nextMove}
`
}

function buildLogEvent(runtime, options, remoteProof) {
  const nextMove = escapeInline(runtime.nextMove).replace(/\.$/, '')
  const remoteClause = remoteProof.status === 'verified'
    ? ` remote-proof=${remoteProof.run_id}.`
    : ''

  return `- ${options.timestamp}: runtime heartbeat refreshed. stage=${runtime.activeStage}. proof=${runtime.proofStatus}. drift=${runtime.driftStatus}. next=${nextMove}.${remoteClause}`
}

async function updateLog(logPath, eventLine) {
  let existing = '# Runtime Log\nHuman skim: `docs/artifacts/runtime/current/index.html`\n'

  try {
    existing = await readFile(logPath, 'utf8')
  }
  catch {}

  const lines = existing.trimEnd().split('\n')
  const header = []
  const events = []

  for (const line of lines) {
    if (line.startsWith('- ')) {
      events.push(line)
    }
    else {
      header.push(line)
    }
  }

  if (events.at(-1) !== eventLine) {
    events.push(eventLine)
  }

  const trimmedEvents = events.slice(-25)
  await writeFile(logPath, `${[...header, '', ...trimmedEvents].join('\n')}\n`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const report = await collectStaleReport({ date: options.date })
  const statePath = path.join(RUNTIME_ROOT, 'state.json')
  const proofPath = path.join(RUNTIME_ROOT, 'proof.md')
  const driftPath = path.join(RUNTIME_ROOT, 'drift.md')
  const logPath = path.join(RUNTIME_ROOT, 'log.md')

  const existingState = await readJson(statePath)
  const repoDeltaFiles = await getRepoDeltaFiles(options)
  const extensionPolicy = await readExtensionPolicy()
  const remoteProof = buildRemoteProof(existingState, options)
  const runtime = deriveRuntime(report, repoDeltaFiles, extensionPolicy, remoteProof)

  const nextState = {
    ...existingState,
    active_stage: runtime.activeStage,
    proof_status: runtime.proofStatus,
    drift_status: runtime.driftStatus,
    blocked: {
      status: runtime.driftStatus === 'attention' ? 'blocked' : runtime.flags.length > 0 ? 'tracked' : 'clear',
      reasons: runtime.flags,
    },
    repo_delta: {
      compared_base: options.base,
      compared_head: options.head,
      files: repoDeltaFiles,
    },
    extension_policy: {
      resolved: extensionPolicy.resolved,
      summary: extensionPolicy.summary,
    },
    remote_proof: remoteProof,
    heartbeats: {
      ...existingState.heartbeats,
      coordination: {
        ...(existingState.heartbeats?.coordination ?? {}),
        last_updated_at: options.timestamp,
        status: runtime.flags.length === 0 ? 'active' : runtime.driftStatus === 'attention' ? 'attention' : 'tracked',
        blocked: runtime.driftStatus === 'attention',
        next_move: runtime.nextMove,
      },
      drift: {
        ...(existingState.heartbeats?.drift ?? {}),
        last_updated_at: options.timestamp,
        status: runtime.driftStatus,
        flags: runtime.flags,
      },
    },
  }

  const proofMarkdown = buildProofMarkdown(runtime, remoteProof)
  const driftMarkdown = buildDriftMarkdown(runtime, repoDeltaFiles)
  const eventLine = buildLogEvent(runtime, options, remoteProof)

  if (options.write) {
    await writeJson(statePath, nextState)
    await writeFile(proofPath, proofMarkdown)
    await writeFile(driftPath, driftMarkdown)
    await updateLog(logPath, eventLine)
  }

  process.stdout.write(`${JSON.stringify({
    state: nextState,
    runtime,
  }, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
