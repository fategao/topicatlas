#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const input = process.argv[2]
if (!input) {
  console.error(JSON.stringify({ error: 'Usage: node scripts/audit-brief.mjs <brief-path>' }))
  process.exit(2)
}

const text = await readFile(path.resolve(input), 'utf8')
const paragraphs = text
  .split(/\n\s*\n/)
  .map((item) => item.replace(/\s+/g, ' ').trim())
  .filter(Boolean)
const words = text.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) ?? []
const numericParagraphs = paragraphs.filter((item) => /\b\d[\d,.%kKmM]*\b/.test(item))
const sourcedNumbers = numericParagraphs.filter((item) =>
  /source|provider|estimate|measured|来自|来源|实测|估算/i.test(item),
)

const signals = {
  audience: /\b(audience|reader|developer|team)\b/i.test(text),
  evidence: /\b(evidence|recorded|snapshot|observed)\b/i.test(text),
  verification: /\b(verify|verification|test|check)\b/i.test(text),
  rollback: /\b(rollback|revert|restore)\b/i.test(text),
}

const issues = []
if (!signals.rollback) issues.push('Add an explicit rollback path for the release.')
if (numericParagraphs.length !== sourcedNumbers.length) {
  issues.push(
    `${numericParagraphs.length - sourcedNumbers.length} paragraph(s) contain numbers without a visible source or estimate label.`,
  )
}
if (!signals.audience) issues.push('Name the intended audience.')
if (!signals.evidence) issues.push('State which evidence came from an observed run.')

const report = {
  file: path.basename(input),
  counts: {
    characters: text.length,
    words: words.length,
    lines: text.split(/\r?\n/).length,
    headings: text.match(/^#{1,6}\s+/gm)?.length ?? 0,
    bullets: text.match(/^\s*-\s+/gm)?.length ?? 0,
    numericParagraphs: numericParagraphs.length,
    sourcedNumericParagraphs: sourcedNumbers.length,
  },
  signals,
  issues,
  verdict: issues.length === 0 ? 'ready' : 'needs_revision',
}

console.log(JSON.stringify(report, null, 2))
