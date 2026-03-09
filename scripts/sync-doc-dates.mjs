#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const allFiles = args.has('--all');

const baseIndex = process.argv.indexOf('--base');
const baseRefArg = baseIndex >= 0 ? process.argv[baseIndex + 1] : null;
const baseRefEnv = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;
const baseRef = baseRefArg ?? baseRefEnv;

const today = new Date().toISOString().slice(0, 10);

const NARRATIVE_STATUS_DATE_PATTERN =
  /\b(?:Status Note|Implementation Status)\s*\((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\)/g;

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function safeRun(command) {
  try {
    return run(command);
  } catch {
    return '';
  }
}

function parseFileList(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => file.endsWith('.md'))
    .filter((file) => !file.startsWith('docs/agent/'));
}

function unique(values) {
  return [...new Set(values)];
}

function getTargetFiles() {
  if (allFiles) {
    return parseFileList(safeRun("git ls-files '*.md'"));
  }

  if (baseRef) {
    const fromBase = parseFileList(safeRun(`git diff --name-only ${baseRef}...HEAD -- '*.md'`));
    if (fromBase.length > 0) return fromBase;
  }

  const unstaged = parseFileList(safeRun("git diff --name-only -- '*.md'"));
  const staged = parseFileList(safeRun("git diff --cached --name-only -- '*.md'"));
  return unique([...unstaged, ...staged]);
}

function updateFrontMatterDate(content, newDate) {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatterMatch) {
    return { content, previousDate: null, hadField: false, changed: false };
  }

  const frontMatter = frontMatterMatch[1];
  const updatedMatch = frontMatter.match(/^updated:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})[ \t]*$/m);

  if (!updatedMatch) {
    return { content, previousDate: null, hadField: false, changed: false };
  }

  const previousDate = updatedMatch[1];
  if (previousDate === newDate) {
    return { content, previousDate, hadField: true, changed: false };
  }

  const updatedFrontMatter = frontMatter.replace(
    /^updated:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}[ \t]*$/m,
    `updated: ${newDate}`
  );
  const nextContent = content.replace(frontMatterMatch[1], updatedFrontMatter);
  return { content: nextContent, previousDate, hadField: true, changed: true };
}

function updateLastUpdatedDate(content, newDate) {
  const lastUpdatedMatch = content.match(
    /^\*\*Last Updated:\*\*\s*([0-9]{4}-[0-9]{2}-[0-9]{2})[ \t]*$/m
  );
  if (!lastUpdatedMatch) {
    return { content, previousDate: null, hadField: false, changed: false };
  }

  const previousDate = lastUpdatedMatch[1];
  if (previousDate === newDate) {
    return { content, previousDate, hadField: true, changed: false };
  }

  const nextContent = content.replace(
    /^\*\*Last Updated:\*\*\s*[0-9]{4}-[0-9]{2}-[0-9]{2}[ \t]*$/m,
    `**Last Updated:** ${newDate}`
  );
  return { content: nextContent, previousDate, hadField: true, changed: true };
}

const files = getTargetFiles();

if (files.length === 0) {
  console.log('No changed markdown files detected.');
  process.exit(0);
}

const staleDateFields = [];
const hardcodedNarrativeDates = [];
const updatedFiles = [];

for (const file of files) {
  if (!existsSync(file)) continue;

  const original = readFileSync(file, 'utf8');
  let next = original;

  const frontMatterResult = updateFrontMatterDate(next, today);
  next = frontMatterResult.content;

  const lastUpdatedResult = updateLastUpdatedDate(next, today);
  next = lastUpdatedResult.content;

  const narrativeMatches = [...next.matchAll(NARRATIVE_STATUS_DATE_PATTERN)];
  if (narrativeMatches.length > 0) {
    for (const match of narrativeMatches) {
      hardcodedNarrativeDates.push(`${file}: "${match[0]}"`);
    }
  }

  if (checkOnly) {
    if (frontMatterResult.hadField && frontMatterResult.previousDate !== today) {
      staleDateFields.push(`${file}: front matter updated=${frontMatterResult.previousDate} (expected ${today})`);
    }
    if (lastUpdatedResult.hadField && lastUpdatedResult.previousDate !== today) {
      staleDateFields.push(`${file}: Last Updated=${lastUpdatedResult.previousDate} (expected ${today})`);
    }
    continue;
  }

  if (next !== original) {
    writeFileSync(file, next);
    updatedFiles.push(file);
  }
}

if (checkOnly && staleDateFields.length > 0) {
  console.error('Date metadata is stale in changed docs:');
  for (const issue of staleDateFields) {
    console.error(`- ${issue}`);
  }
  console.error('Run `npm run docs:dates` to sync changed files.');
}

if (hardcodedNarrativeDates.length > 0) {
  console.error('Hardcoded narrative dates detected:');
  for (const issue of hardcodedNarrativeDates) {
    console.error(`- ${issue}`);
  }
  console.error('Use metadata date fields instead of narrative date text.');
}

if (checkOnly && (staleDateFields.length > 0 || hardcodedNarrativeDates.length > 0)) {
  process.exit(1);
}

if (!checkOnly) {
  if (updatedFiles.length === 0) {
    console.log(`No date metadata changes needed (today: ${today}).`);
  } else {
    console.log(`Updated date metadata for ${updatedFiles.length} file(s):`);
    for (const file of updatedFiles) {
      console.log(`- ${file}`);
    }
  }
}
