import { writeFile } from 'node:fs/promises'

import { buildStaleReportMarkdown, collectStaleReport } from './lib/living-docs.mjs'

function parseArgs(argv) {
  const options = {
    asJson: false,
    date: new Date().toISOString().slice(0, 10),
    overrideDays: null,
    writePath: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--json') {
      options.asJson = true
      continue
    }

    if (arg === '--date') {
      options.date = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--days') {
      options.overrideDays = Number(argv[index + 1])
      index += 1
      continue
    }

    if (arg === '--write') {
      options.writePath = argv[index + 1]
      index += 1
    }
  }

  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const report = await collectStaleReport({
    date: options.date,
    overrideDays: options.overrideDays,
  })

  const output = options.asJson
    ? `${JSON.stringify(report, null, 2)}\n`
    : buildStaleReportMarkdown(report)

  if (options.writePath) {
    await writeFile(options.writePath, output)
  }

  process.stdout.write(output)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
