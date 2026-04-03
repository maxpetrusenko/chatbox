import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const ARTIFACT_ROOT = path.join('docs', 'artifacts')
export const RUNTIME_ROOT = path.join('docs', 'artifacts', 'runtime', 'current')
export const STALE_REPORT_PATH = path.join('docs', 'indexes', 'stale-report.md')

export const DEFAULT_THRESHOLDS = {
  presearch: 7,
  brainlift: 7,
  plan: 14,
  design: 14,
  'implementation-contract': 7,
  verification: 3,
  'drift-report': 3,
}

export const LEGACY_DOCS = [
  'docs/chatbridge-presearch.html',
  'docs/chatbridge-plugin-architecture.html',
  'docs/chatbridge-planning-flow.html',
  'docs/plans/2026-04-01-chatbridge-finish-plan.md',
  'docs/plans/2026-04-02-k12-edtech-plugins-plan.html',
  'docs/plans/2026-04-02-k12-plugin-platform-plan.html',
]

export async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return walk(fullPath)
      }
      return [fullPath]
    }),
  )

  return files.flat()
}

export function daysBetween(fromDate, toDate) {
  if (!fromDate) return 0
  const from = new Date(`${fromDate}T00:00:00Z`)
  const to = new Date(`${toDate}T00:00:00Z`)
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000))
}

export function formatIssues(record) {
  if (record.issues.length === 0) {
    return 'none'
  }

  return record.issues.join('; ')
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

export async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export async function readArtifactState(filePath, options) {
  const state = await readJson(filePath)
  const thresholdDays = options.overrideDays ?? DEFAULT_THRESHOLDS[state.artifact_type] ?? 7
  const ageDays = daysBetween(state.last_refreshed_at, options.date)
  const issues = []

  if (!state.last_refreshed_at) {
    issues.push('missing last_refreshed_at')
  }

  if (ageDays > thresholdDays) {
    issues.push(`age ${ageDays}d exceeds ${thresholdDays}d threshold`)
  }

  if (state.freshness?.state && state.freshness.state !== 'fresh') {
    issues.push(`freshness state is ${state.freshness.state}`)
  }

  if ((state.stale_inputs ?? []).length > 0) {
    issues.push(`stale_inputs=${state.stale_inputs.length}`)
  }

  if ((state.stale_downstream ?? []).length > 0) {
    issues.push(`stale_downstream=${state.stale_downstream.length}`)
  }

  return {
    id: state.artifact_id,
    path: filePath,
    type: state.artifact_type,
    phase: state.phase,
    upstreamIds: state.upstream_ids ?? [],
    lastRefreshedAt: state.last_refreshed_at,
    ageDays,
    thresholdDays,
    freshnessState: state.freshness?.state ?? 'unknown',
    issues,
    status: issues.length === 0 ? 'fresh' : 'review-required',
  }
}

export async function readBacklinkState(filePath) {
  const raw = await readFile(filePath, 'utf8')
  const hasArtifactLink = raw.includes('artifacts/')
  const hasCanonicalLabel = /source[- ]seed|canonical/i.test(raw)
  const status = hasArtifactLink && hasCanonicalLabel
    ? 'linked'
    : hasArtifactLink
      ? 'partial'
      : 'missing'

  let notes = 'artifact backlink + source-seed note present'
  if (status === 'partial') {
    notes = 'artifact link present but source-seed/canonical note weak'
  }
  if (status === 'missing') {
    notes = 'needs canonical backlink note'
  }

  return {
    path: filePath,
    status,
    notes,
  }
}

export async function collectStaleReport(options = {}) {
  const resolved = {
    date: options.date ?? new Date().toISOString().slice(0, 10),
    overrideDays: options.overrideDays ?? null,
  }

  const files = (await walk(ARTIFACT_ROOT)).filter((filePath) =>
    filePath.endsWith('state.json') && filePath !== path.join(RUNTIME_ROOT, 'state.json'),
  )
  const artifacts = await Promise.all(files.map((filePath) => readArtifactState(filePath, resolved)))
  const staleIds = new Set(artifacts.filter((record) => record.status !== 'fresh').map((record) => record.id))

  for (const record of artifacts) {
    const staleUpstreams = record.upstreamIds.filter((upstreamId) => staleIds.has(upstreamId))
    if (staleUpstreams.length > 0) {
      record.issues.push(`upstream stale: ${staleUpstreams.join(', ')}`)
      record.status = 'review-required'
    }
  }

  artifacts.sort((left, right) => left.path.localeCompare(right.path))
  const backlinks = await Promise.all(LEGACY_DOCS.map(readBacklinkState))

  return {
    checkedAt: resolved.date,
    artifacts,
    backlinks,
    summary: {
      total: artifacts.length,
      fresh: artifacts.filter((record) => record.status === 'fresh').length,
      stale: artifacts.filter((record) => record.issues.some((issue) => issue.includes('exceeds'))).length,
      reviewRequired: artifacts.filter((record) => record.status === 'review-required').length,
      backlinksMissing: backlinks.filter((record) => record.status !== 'linked').length,
    },
  }
}

export function buildStaleReportMarkdown(report) {
  const lines = [
    '# Stale Report',
    '',
    `Date: ${report.checkedAt}`,
    `Status: ${report.summary.stale > 0 || report.summary.backlinksMissing > 0 ? 'Action needed' : 'Freshness pass clean'}`,
    'Generated by: `pnpm docs:stale-check:write`',
    'Human skim: `docs/indexes/stale-report.html`',
    '',
    '## Summary',
    '',
    `- artifacts checked: ${report.summary.total}`,
    `- fresh: ${report.summary.fresh}`,
    `- stale: ${report.summary.stale}`,
    `- review-required: ${report.summary.reviewRequired}`,
    `- legacy backlinks missing: ${report.summary.backlinksMissing}`,
    '',
    '## Artifact Freshness Matrix',
    '',
    '| Artifact | Type | Refreshed | Age | Threshold | Status | Issues |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...report.artifacts.map((record) => (
      `| \`${record.path}\` | ${record.type} | ${record.lastRefreshedAt} | ${record.ageDays}d | ${record.thresholdDays}d | ${record.status} | ${formatIssues(record)} |`
    )),
    '',
    '## Legacy Backlink Coverage',
    '',
    '| Legacy doc | Status | Notes |',
    '| --- | --- | --- |',
    ...report.backlinks.map((record) => (
      `| \`${record.path}\` | ${record.status} | ${record.notes} |`
    )),
  ]

  const alerts = [
    ...report.artifacts
      .filter((record) => record.status !== 'fresh')
      .map((record) => `- artifact review: \`${record.path}\` -> ${formatIssues(record)}`),
    ...report.backlinks
      .filter((record) => record.status !== 'linked')
      .map((record) => `- backlink repair: \`${record.path}\` -> ${record.notes}`),
  ]

  lines.push('', '## Alerts', '')
  if (alerts.length === 0) {
    lines.push('- none')
  }
  else {
    lines.push(...alerts)
  }

  return `${lines.join('\n')}\n`
}

export function formatTimestamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function escapeInline(value) {
  return value.replace(/\s+/g, ' ').trim()
}
