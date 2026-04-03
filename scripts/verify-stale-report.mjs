import { readFile } from 'node:fs/promises'

const REQUIRED_SECTIONS = [
  '# Stale Report',
  '## Summary',
  '## Artifact Freshness Matrix',
  '## Legacy Backlink Coverage',
  '## Alerts',
]

async function main() {
  const content = await readFile('docs/indexes/stale-report.md', 'utf8')
  const missingSections = REQUIRED_SECTIONS.filter(section => !content.includes(section))

  if (!/^# Stale Report/m.test(content)) {
    throw new Error('missing report header')
  }

  if (!/^Date: \d{4}-\d{2}-\d{2}$/m.test(content)) {
    throw new Error('missing or invalid Date line')
  }

  if (missingSections.length > 0) {
    throw new Error(`missing sections: ${missingSections.join(', ')}`)
  }

  console.log('PASS: stale report schema valid')
}

main().catch(error => {
  console.error(`FAIL: ${error.message}`)
  process.exitCode = 1
})
