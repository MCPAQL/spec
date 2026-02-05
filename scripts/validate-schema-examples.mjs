#!/usr/bin/env node

/**
 * Validates examples embedded in JSON Schema files and optional test fixtures.
 *
 * Usage:
 *   node scripts/validate-schema-examples.mjs              # validate inline schema examples
 *   node scripts/validate-schema-examples.mjs --fixtures    # also run test fixture files
 *
 * Exit codes:
 *   0 - all validations passed
 *   1 - one or more validations failed
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Helpers ──────────────────────────────────────────────────────────

function loadJSON(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    throw new Error(`Failed to parse ${filePath}: ${err.message}`);
  }
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

// ── Inline example validation ────────────────────────────────────────

/**
 * Validate every entry in a schema's top-level `examples` array against the
 * schema itself. Returns { passed, failed } counts.
 *
 * Supports an annotated wrapper format where each example is
 * { title, description, value } to provide LLM-readable context alongside
 * the validatable instance. Schemas using this format SHOULD declare
 * "x-example-format": "annotated" as a machine-readable signal. The script
 * also auto-detects the format when every entry has a "value" key.
 */
function validateInlineExamples(schemaPath) {
  const schema = loadJSON(schemaPath);
  const examples = schema.examples;

  if (!examples || !Array.isArray(examples) || examples.length === 0) {
    console.log(`  (no examples found – skipping)`);
    return { passed: 0, failed: 0 };
  }

  // Detect annotated wrapper format via extension property or heuristic
  const isWrapped =
    schema["x-example-format"] === "annotated" ||
    examples.every(
      (ex) => ex != null && typeof ex === "object" && "value" in ex
    );

  const ajv = createAjv();
  // Remove examples before compiling to avoid confusing ajv
  const schemaCopy = { ...schema };
  delete schemaCopy.examples;
  const validate = ajv.compile(schemaCopy);

  let passed = 0;
  let failed = 0;

  examples.forEach((raw, i) => {
    const instance = isWrapped ? raw.value : raw;
    const label = isWrapped && raw.title ? raw.title : `example[${i}]`;

    const valid = validate(instance);

    if (valid) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.log(`  ✗ ${label}`);
      for (const err of validate.errors) {
        console.log(`      ${err.instancePath || "/"} ${err.message}`);
      }
      failed++;
    }
  });

  return { passed, failed };
}

// ── Fixture validation ───────────────────────────────────────────────

/**
 * Run a test fixture file.
 *
 * Fixture format:
 * {
 *   "schema": "../schemas/foo.schema.json",
 *   "ref": "#/$defs/TypeDetails",          // optional – validate against a $defs sub-schema
 *   "tests": [
 *     { "description": "...", "data": {...}, "valid": true|false }
 *   ]
 * }
 */
function runFixture(fixturePath) {
  const fixture = loadJSON(fixturePath);
  const schemaFile = resolve(dirname(fixturePath), fixture.schema);

  let rootSchema;
  try {
    rootSchema = loadJSON(schemaFile);
  } catch (err) {
    throw new Error(
      `Fixture "${fixturePath}" references schema "${fixture.schema}" that could not be loaded: ${err.message}`
    );
  }

  const ajv = createAjv();

  let validate;
  if (fixture.ref) {
    // Add the full schema so internal $ref resolution works, then look up
    // the sub-schema by its canonical URI (schema $id + ref fragment).
    ajv.addSchema(rootSchema);

    const schemaId = rootSchema.$id;
    // fixture.ref is like "#/$defs/TypeDetails" — strip the "#" and append as fragment
    const fragment = fixture.ref.startsWith("#") ? fixture.ref.slice(1) : fixture.ref;
    const refUri = schemaId ? `${schemaId}#${fragment}` : fixture.ref;

    validate = ajv.getSchema(refUri);
    if (!validate) {
      throw new Error(
        `Cannot resolve ${fixture.ref} (tried ${refUri}) in ${fixture.schema}`
      );
    }
  } else {
    const schemaCopy = { ...rootSchema };
    delete schemaCopy.examples;
    validate = ajv.compile(schemaCopy);
  }

  let passed = 0;
  let failed = 0;

  for (const test of fixture.tests) {
    const valid = validate(test.data);
    const expectValid = test.valid;

    if (valid === expectValid) {
      const mark = expectValid ? "✓" : "✓ (correctly rejected)";
      console.log(`  ${mark}  ${test.description}`);
      passed++;
    } else if (expectValid && !valid) {
      console.log(`  ✗  ${test.description}  (expected valid, got invalid)`);
      for (const err of validate.errors) {
        console.log(`       ${err.instancePath || "/"} ${err.message}`);
      }
      failed++;
    } else {
      // expected invalid but got valid
      console.log(`  ✗  ${test.description}  (expected invalid, but passed validation)`);
      failed++;
    }
  }

  return { passed, failed };
}

// ── Main ─────────────────────────────────────────────────────────────

const runFixtures = process.argv.includes("--fixtures");

let totalPassed = 0;
let totalFailed = 0;

// 1) Inline schema examples
const schemasDir = join(ROOT, "schemas");
const schemaFiles = readdirSync(schemasDir)
  .filter((f) => f.endsWith(".schema.json"))
  .sort();

console.log("=== Validating inline schema examples ===\n");

for (const file of schemaFiles) {
  const fullPath = join(schemasDir, file);
  console.log(`${file}:`);
  const { passed, failed } = validateInlineExamples(fullPath);
  totalPassed += passed;
  totalFailed += failed;
  console.log();
}

// 2) Fixture files (if requested)
if (runFixtures) {
  const fixturesDir = join(ROOT, "tests", "schema");
  let fixtureFiles;
  try {
    fixtureFiles = readdirSync(fixturesDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
  } catch {
    fixtureFiles = [];
    console.log("=== No fixture files found ===\n");
  }

  if (fixtureFiles.length > 0) {
    console.log("=== Validating test fixtures ===\n");

    for (const file of fixtureFiles) {
      const fullPath = join(fixturesDir, file);
      console.log(`${file}:`);
      const { passed, failed } = runFixture(fullPath);
      totalPassed += passed;
      totalFailed += failed;
      console.log();
    }
  }
}

// Summary
console.log("========================================");
console.log(`Total passed: ${totalPassed}`);
console.log(`Total failed: ${totalFailed}`);
console.log("========================================");

process.exit(totalFailed > 0 ? 1 : 0);
