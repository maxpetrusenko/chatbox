import { readFile } from 'node:fs/promises'
import path from 'node:path'

const RUNTIME_ROOT = path.join('docs', 'artifacts', 'runtime', 'current')
const REQUIRED_PROOF_LABELS = [
  '- Verified:',
  '- Inferred:',
  '- Missing:',
  '- Next proof step:',
]
const REQUIRED_DRIFT_LABELS = [
  '- Current status:',
  '- Active mismatches:',
  '- Stale downstream:',
  '- Repair packet:',
]

async function main() {
  const state = JSON.parse(await readFile(path.join(RUNTIME_ROOT, 'state.json'), 'utf8'))
  const proof = await readFile(path.join(RUNTIME_ROOT, 'proof.md'), 'utf8')
  const drift = await readFile(path.join(RUNTIME_ROOT, 'drift.md'), 'utf8')
  const log = await readFile(path.join(RUNTIME_ROOT, 'log.md'), 'utf8')

  if (!state.heartbeats?.coordination?.last_updated_at) {
    throw new Error('missing coordination heartbeat timestamp')
  }

  if (!state.heartbeats?.drift?.last_updated_at) {
    throw new Error('missing drift heartbeat timestamp')
  }

  if (!Array.isArray(state.heartbeats?.drift?.flags)) {
    throw new Error('drift flags must be an array')
  }

  if (!state.proof_status || !state.drift_status) {
    throw new Error('missing proof_status or drift_status')
  }

  for (const label of REQUIRED_PROOF_LABELS) {
    if (!proof.includes(label)) {
      throw new Error(`proof.md missing label: ${label}`)
    }
  }

  for (const label of REQUIRED_DRIFT_LABELS) {
    if (!drift.includes(label)) {
      throw new Error(`drift.md missing label: ${label}`)
    }
  }

  if (!/^# Runtime Log/m.test(log)) {
    throw new Error('log.md missing header')
  }

  if (!/^- .*runtime heartbeat refreshed\./m.test(log)) {
    throw new Error('log.md missing generated heartbeat event')
  }

  console.log('PASS: runtime heartbeat files coherent')
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`)
  process.exitCode = 1
})
