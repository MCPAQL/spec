#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = join(ROOT, "tests", "conformance", "evidence");

const FORBIDDEN_ERROR_PATTERNS = [
  /typeerror/i,
  /referenceerror/i,
  /syntaxerror/i,
  /at\s+\S+/i,
  /\/src\//i,
  /\/node_modules\//i,
  /\.ts:\d+/i,
  /\.js:\d+/i,
];

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    process.stderr.write(`Unable to load JSON from ${path}: ${error.message}\n`);
    process.exit(3);
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSnakeCase(value) {
  return /^[a-z][a-z0-9_]*$/.test(value);
}

function getPath(obj, path) {
  return path.split(".").reduce((current, segment) => current?.[segment], obj);
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

function loadValidators() {
  const introspectionSchema = loadJson(
    join(ROOT, "schemas", "introspection-response.schema.json")
  );
  const operationResultSchema = loadJson(
    join(ROOT, "schemas", "operation-result.schema.json")
  );

  const ajv = createAjv();
  ajv.addSchema(introspectionSchema);
  ajv.addSchema(operationResultSchema);

  const wrapSubschema = (subschema) => ({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $defs: introspectionSchema.$defs,
    ...subschema,
  });

  return {
    validateOperationResult: ajv.compile(operationResultSchema),
    validateOperationsList: ajv.compile(
      wrapSubschema(introspectionSchema.$defs.OperationsListData)
    ),
    validateTypesList: ajv.compile(
      wrapSubschema(introspectionSchema.$defs.TypesListData)
    ),
    validateOperationDetail: ajv.compile(
      wrapSubschema(introspectionSchema.$defs.OperationDetails)
    ),
  };
}

function formatAjvErrors(errors = []) {
  return errors.map((error) => `${error.instancePath || "/"} ${error.message}`);
}

function classifyCategory(required, tests) {
  const hasFail = tests.some((test) => test.result === "FAIL");
  const hasWarn = tests.some((test) => test.result === "WARN");

  if (hasFail) {
    return required ? "FAIL" : "WARN";
  }

  if (hasWarn) {
    return "WARN";
  }

  if (tests.length === 0) {
    return "SKIP";
  }

  return "PASS";
}

function evaluateIntrospection(fixture, validators) {
  const tests = [];
  const operationsList = fixture.introspection?.operations_list;
  const typesList = fixture.introspection?.types_list;
  const operationDetails = fixture.introspection?.operation_details ?? [];
  const acceptedParameters = fixture.accepted_parameters ?? {};

  if (operationsList?.success === true && validators.validateOperationsList(operationsList.data)) {
    tests.push({
      name: "Operations query is implemented",
      result: "PASS",
      detail: "The fixture includes a valid `introspect` operations response.",
    });
  } else {
    tests.push({
      name: "Operations query is implemented",
      result: "FAIL",
      detail: operationsList?.success === true
        ? formatAjvErrors(validators.validateOperationsList.errors).join("; ")
        : "Missing or failing `introspect` operations evidence.",
    });
  }

  if (typesList?.success === true && validators.validateTypesList(typesList.data)) {
    tests.push({
      name: "Types query is implemented",
      result: "PASS",
      detail: "The fixture includes a valid `introspect` types response.",
    });
  } else {
    tests.push({
      name: "Types query is implemented",
      result: "FAIL",
      detail: typesList?.success === true
        ? formatAjvErrors(validators.validateTypesList.errors).join("; ")
        : "Missing or failing `introspect` types evidence.",
    });
  }

  const invalidDetails = [];
  const missingAccepted = [];
  const undocumentedAccepted = [];

  for (const detail of operationDetails) {
    if (!validators.validateOperationDetail(detail)) {
      invalidDetails.push(
        `${detail.name}: ${formatAjvErrors(validators.validateOperationDetail.errors).join("; ")}`
      );
      continue;
    }

    const documented = new Set((detail.parameters ?? []).map((parameter) => parameter.name));
    const accepted = acceptedParameters[detail.name] ?? [];

    for (const parameter of accepted) {
      if (!documented.has(parameter)) {
        missingAccepted.push(`${detail.name}.${parameter}`);
      }
    }

    for (const parameter of documented) {
      if (!accepted.includes(parameter)) {
        undocumentedAccepted.push(`${detail.name}.${parameter}`);
      }
    }
  }

  tests.push({
    name: "Operation detail payloads validate",
    result: invalidDetails.length === 0 ? "PASS" : "FAIL",
    detail:
      invalidDetails.length === 0
        ? "All documented operations matched the introspection schema."
        : invalidDetails.join(" | "),
  });

  tests.push({
    name: "Introspection completeness matches accepted parameters",
    result:
      missingAccepted.length === 0 && undocumentedAccepted.length === 0
        ? "PASS"
        : missingAccepted.length > 0
          ? "FAIL"
          : "WARN",
    detail:
      missingAccepted.length === 0 && undocumentedAccepted.length === 0
        ? "Every accepted parameter is reflected in introspection."
        : [
            missingAccepted.length > 0
              ? `Missing from introspection: ${missingAccepted.join(", ")}`
              : null,
            undocumentedAccepted.length > 0
              ? `Documented but not accepted in fixture evidence: ${undocumentedAccepted.join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join(" | "),
  });

  return {
    name: "Introspection Fidelity",
    required: true,
    result: classifyCategory(true, tests),
    tests,
  };
}

function evaluateParameterHandling(fixture) {
  const tests = [];
  const operationDetails = fixture.introspection?.operation_details ?? [];
  const detailByName = new Map(operationDetails.map((detail) => [detail.name, detail]));
  const parameterTests = fixture.parameter_tests ?? {};

  const requiredFailures = [];
  for (const [operationName, detail] of detailByName.entries()) {
    for (const parameter of detail.parameters ?? []) {
      if (!parameter.required) {
        continue;
      }

      const matchingCase = (parameterTests.missing_required ?? []).find(
        (testCase) =>
          testCase.operation === operationName && testCase.parameter === parameter.name
      );

      if (!matchingCase) {
        requiredFailures.push(`${operationName}.${parameter.name}`);
        continue;
      }

      const message = matchingCase.response?.error?.message ?? "";
      if (
        matchingCase.response?.success !== false ||
        !message.includes(parameter.name)
      ) {
        requiredFailures.push(`${operationName}.${parameter.name}`);
      }
    }
  }

  tests.push({
    name: "Required parameters are enforced",
    result: requiredFailures.length === 0 ? "PASS" : "FAIL",
    detail:
      requiredFailures.length === 0
        ? "Required parameters fail clearly when omitted."
        : `Missing or invalid required-parameter evidence: ${requiredFailures.join(", ")}`,
  });

  const unknownFailures = [];
  for (const testCase of parameterTests.unknown_parameter ?? []) {
    const response = testCase.response ?? {};
    const warningCodes = (response.warnings ?? []).map((warning) => warning.code);

    const isExplicitError =
      response.success === false &&
      response.error?.message &&
      response.error.message.includes(testCase.parameter);
    const isExplicitWarning =
      response.success === true &&
      warningCodes.length > 0;

    if (!isExplicitError && !isExplicitWarning) {
      unknownFailures.push(`${testCase.operation}.${testCase.parameter}`);
    }
  }

  tests.push({
    name: "Unknown parameters are handled explicitly",
    result: unknownFailures.length === 0 ? "PASS" : "FAIL",
    detail:
      unknownFailures.length === 0
        ? "Unknown parameters returned either a structured error or warning."
        : `Unknown-parameter cases were silent: ${unknownFailures.join(", ")}`,
  });

  const defaultFailures = [];
  for (const testCase of parameterTests.optional_defaults ?? []) {
    const actualValue = getPath(testCase.response, testCase.expected_value_path);
    if (actualValue !== testCase.expected_value) {
      defaultFailures.push(
        `${testCase.operation}.${testCase.parameter} expected ${JSON.stringify(
          testCase.expected_value
        )}, got ${JSON.stringify(actualValue)}`
      );
    }
  }

  tests.push({
    name: "Documented defaults are observable",
    result: defaultFailures.length === 0 ? "PASS" : "FAIL",
    detail:
      defaultFailures.length === 0
        ? "Optional parameter defaults matched the documented behavior."
        : defaultFailures.join(" | "),
  });

  const snakeCaseFailures = [];
  for (const detail of operationDetails) {
    for (const parameter of detail.parameters ?? []) {
      if (!isSnakeCase(parameter.name)) {
        snakeCaseFailures.push(`${detail.name}.${parameter.name}`);
      }
    }
  }

  tests.push({
    name: "Canonical parameter names use snake_case",
    result: snakeCaseFailures.length === 0 ? "PASS" : "FAIL",
    detail:
      snakeCaseFailures.length === 0
        ? "All documented parameter names follow snake_case."
        : `Non-conforming parameters: ${snakeCaseFailures.join(", ")}`,
  });

  return {
    name: "Parameter Handling",
    required: true,
    result: classifyCategory(true, tests),
    tests,
  };
}

function evaluateErrorQuality(fixture, validators) {
  const tests = [];
  const errorTests = fixture.error_tests ?? [];
  const formatFailures = [];
  const leakFailures = [];
  const actionableWarnings = [];

  for (const testCase of errorTests) {
    if (!validators.validateOperationResult(testCase.response)) {
      formatFailures.push(
        `${testCase.name}: ${formatAjvErrors(validators.validateOperationResult.errors).join("; ")}`
      );
      continue;
    }

    const message = testCase.response?.error?.message ?? "";
    if (FORBIDDEN_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      leakFailures.push(testCase.name);
    }

    const missingMentions = (testCase.must_mention ?? []).filter(
      (fragment) => !message.includes(fragment)
    );
    if (missingMentions.length > 0) {
      actionableWarnings.push(`${testCase.name}: missing ${missingMentions.join(", ")}`);
    }
  }

  tests.push({
    name: "Error responses match the discriminated union schema",
    result: formatFailures.length === 0 ? "PASS" : "FAIL",
    detail:
      formatFailures.length === 0
        ? "All error evidence matched the operation-result schema."
        : formatFailures.join(" | "),
  });

  tests.push({
    name: "Error messages do not leak implementation internals",
    result: leakFailures.length === 0 ? "PASS" : "FAIL",
    detail:
      leakFailures.length === 0
        ? "No stack traces, file paths, or language-specific artifacts were exposed."
        : `Implementation leakage found in: ${leakFailures.join(", ")}`,
  });

  tests.push({
    name: "Error messages remain actionable",
    result: actionableWarnings.length === 0 ? "PASS" : "WARN",
    detail:
      actionableWarnings.length === 0
        ? "Each error message identified the affected parameter or correction path."
        : actionableWarnings.join(" | "),
  });

  return {
    name: "Error Quality",
    required: true,
    result: classifyCategory(true, tests),
    tests,
  };
}

function evaluateRoundTrip(fixture) {
  const tests = [];
  const roundTripFailures = [];
  const updateFailures = [];

  for (const testCase of fixture.round_trip_tests ?? []) {
    for (const [path, expectedValue] of Object.entries(testCase.expected_fields ?? {})) {
      const actualValue = getPath(testCase.read_response, path);
      if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
        roundTripFailures.push(
          `${testCase.name}:${path} expected ${JSON.stringify(
            expectedValue
          )}, got ${JSON.stringify(actualValue)}`
        );
      }
    }
  }

  for (const testCase of fixture.update_preservation_tests ?? []) {
    for (const [path, expectedValue] of Object.entries(testCase.preserved_fields ?? {})) {
      const actualValue = getPath(testCase.read_response, path);
      if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
        updateFailures.push(
          `${testCase.name}:${path} expected ${JSON.stringify(
            expectedValue
          )}, got ${JSON.stringify(actualValue)}`
        );
      }
    }
  }

  tests.push({
    name: "Create-read cycles preserve submitted fields",
    result: roundTripFailures.length === 0 ? "PASS" : "FAIL",
    detail:
      roundTripFailures.length === 0
        ? "Round-trip evidence retained the fields that were submitted."
        : roundTripFailures.join(" | "),
  });

  tests.push({
    name: "Updates preserve non-targeted fields",
    result: updateFailures.length === 0 ? "PASS" : "FAIL",
    detail:
      updateFailures.length === 0
        ? "Update evidence preserved fields outside the update payload."
        : updateFailures.join(" | "),
  });

  return {
    name: "Round-Trip Integrity",
    required: true,
    result: classifyCategory(true, tests),
    tests,
  };
}

function evaluateConstraintDocumentation(fixture) {
  const tests = [];
  const failures = [];
  const warnings = [];

  for (const testCase of fixture.constraint_tests ?? []) {
    const hasStructuredFailure =
      testCase.response?.success === false && typeof testCase.response?.error?.message === "string";
    const documented = testCase.documented === true;

    if (!hasStructuredFailure) {
      failures.push(`${testCase.name}: constraint not enforced with a structured error`);
      continue;
    }

    if (!documented) {
      warnings.push(`${testCase.name}: enforced but not documented in introspection`);
    }
  }

  tests.push({
    name: "Constraints are enforced with structured errors",
    result: failures.length === 0 ? "PASS" : "FAIL",
    detail:
      failures.length === 0 ? "Constraint cases rejected invalid writes." : failures.join(" | "),
  });

  tests.push({
    name: "Constraints are disclosed in introspection guidance",
    result: warnings.length === 0 ? "PASS" : "WARN",
    detail:
      warnings.length === 0
        ? "Constraint metadata remained discoverable."
        : warnings.join(" | "),
  });

  return {
    name: "Constraint Documentation",
    required: false,
    result: classifyCategory(false, tests),
    tests,
  };
}

function evaluateSemantic(fixture, tier) {
  const tests = [];

  if (tier === "1") {
    return {
      name: "Semantic Evaluation",
      required: false,
      result: "SKIP",
      tests: [
        {
          name: "Semantic evaluation skipped",
          result: "SKIP",
          detail: "Tier 1 execution does not run semantic checks.",
        },
      ],
    };
  }

  for (const testCase of fixture.semantic_tests ?? []) {
    const normalizedResponse = normalizeText(testCase.response_text);
    const tier1Pass = (testCase.structural?.required_patterns ?? []).every((pattern) =>
      normalizedResponse.includes(normalizeText(pattern))
    );

    const phraseGroupsPass = (testCase.semantic?.phrase_groups ?? []).every((group) =>
      group.some((phrase) => normalizedResponse.includes(normalizeText(phrase)))
    );
    const expectedOperationsPass = (testCase.semantic?.expected_operations ?? []).every((operation) =>
      (testCase.tool_calls ?? []).some((toolCall) => toolCall.operation === operation)
    );
    const expectedParametersPass = (testCase.semantic?.expected_parameters ?? []).every((parameter) =>
      (testCase.tool_calls ?? []).some(
        (toolCall) =>
          normalizeText(JSON.stringify(toolCall.params ?? {})).includes(normalizeText(parameter))
      ) || normalizedResponse.includes(normalizeText(parameter))
    );

    const tier2Pass = phraseGroupsPass && expectedOperationsPass && expectedParametersPass;

    let result = "FAIL";
    let detail = "Both structural and semantic checks failed.";

    if (tier1Pass && tier2Pass) {
      result = "PASS";
      detail = "Tier 1 and Tier 2 both confirmed the expected discovery behavior.";
    } else if (!tier1Pass && tier2Pass) {
      result = "WARN";
      detail = "Structural patterns missed a valid response; update the fast matcher.";
    } else if (tier1Pass && !tier2Pass) {
      result = "FAIL";
      detail = "Structural checks passed, but the semantic interpretation was still wrong.";
    }

    tests.push({
      name: testCase.name,
      result,
      detail,
    });
  }

  return {
    name: "Semantic Evaluation",
    required: false,
    result: classifyCategory(false, tests),
    tests,
  };
}

function evaluateLevel2Capabilities(fixture, validators) {
  const tests = [];
  const endpointModes = fixture.endpoint_modes ?? [];
  const capabilities = fixture.capabilities ?? {};

  tests.push({
    name: "Both endpoint modes are documented",
    result:
      endpointModes.includes("crude") && endpointModes.includes("single") ? "PASS" : "FAIL",
    detail:
      endpointModes.includes("crude") && endpointModes.includes("single")
        ? "The implementation advertises both CRUDE and single-endpoint modes."
        : "Level 2 evidence must include both `crude` and `single` endpoint modes.",
  });

  tests.push({
    name: "Field selection is supported",
    result: capabilities.field_selection ? "PASS" : "FAIL",
    detail:
      capabilities.field_selection
        ? "Field selection support is advertised in the fixture capabilities."
        : "Level 2 evidence must advertise field selection support.",
  });

  const batchExample = fixture.batch_example;
  tests.push({
    name: "Batch operations are supported",
    result:
      capabilities.batch_operations && batchExample && validators.validateOperationResult(batchExample)
        ? "PASS"
        : "FAIL",
    detail:
      capabilities.batch_operations && batchExample && validators.validateOperationResult(batchExample)
        ? "Batch evidence validates against the operation-result schema."
        : "Level 2 evidence must include a valid batch example and capability flag.",
  });

  return {
    name: "Level 2 Features",
    required: false,
    result: classifyCategory(false, tests),
    tests,
  };
}

function summarize(categories, requestedLevel, fixture) {
  const summary = { total: 0, passed: 0, warned: 0, failed: 0, skipped: 0 };
  for (const category of categories) {
    for (const test of category.tests) {
      summary.total += 1;
      if (test.result === "PASS") {
        summary.passed += 1;
      } else if (test.result === "WARN") {
        summary.warned += 1;
      } else if (test.result === "FAIL") {
        summary.failed += 1;
      } else {
        summary.skipped += 1;
      }
    }
  }

  const mustFailures = categories
    .filter((category) => category.required)
    .some((category) => category.result === "FAIL");

  const shouldWarnings = categories
    .filter((category) => !category.required)
    .some((category) => category.result === "WARN" || category.result === "FAIL");

  let exitCode = 0;
  if (mustFailures) {
    exitCode = 1;
  } else if (shouldWarnings) {
    exitCode = 2;
  }

  return {
    implementation: fixture.implementation,
    version: fixture.version,
    specVersion: fixture.spec_version,
    requestedLevel: requestedLevel,
    conformanceLevel: mustFailures ? 0 : requestedLevel,
    summary,
    categories,
    exitCode,
  };
}

function evaluateFixture(fixture, requestedLevel, tier) {
  const validators = loadValidators();

  const categories = [
    evaluateIntrospection(fixture, validators),
    evaluateParameterHandling(fixture),
    evaluateErrorQuality(fixture, validators),
    evaluateRoundTrip(fixture),
  ];

  if (requestedLevel >= 2) {
    categories.push(evaluateLevel2Capabilities(fixture, validators));
    categories.push(evaluateConstraintDocumentation(fixture));
    categories.push(evaluateSemantic(fixture, tier));
  }

  return summarize(categories, requestedLevel, fixture);
}

function renderText(report) {
  const lines = [];
  lines.push(`Implementation: ${report.implementation}`);
  lines.push(`Spec version: ${report.specVersion}`);
  lines.push(`Requested level: ${report.requestedLevel}`);
  lines.push(`Conformance level: ${report.conformanceLevel}`);
  lines.push(
    `Summary: ${report.summary.passed} passed, ${report.summary.warned} warned, ${report.summary.failed} failed, ${report.summary.skipped} skipped`
  );
  lines.push("");

  for (const category of report.categories) {
    const requirement = category.required ? "MUST" : "SHOULD";
    lines.push(`${category.name} [${requirement}] -> ${category.result}`);
    for (const test of category.tests) {
      lines.push(`  - ${test.result}: ${test.name}`);
      if (test.detail) {
        lines.push(`    ${test.detail}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# MCP-AQL Conformance Report`);
  lines.push("");
  lines.push(`- Implementation: \`${report.implementation}\``);
  lines.push(`- Spec version: \`${report.specVersion}\``);
  lines.push(`- Requested level: \`${report.requestedLevel}\``);
  lines.push(`- Conformance level: \`${report.conformanceLevel}\``);
  lines.push(
    `- Summary: ${report.summary.passed} passed, ${report.summary.warned} warned, ${report.summary.failed} failed, ${report.summary.skipped} skipped`
  );
  lines.push("");

  for (const category of report.categories) {
    lines.push(`## ${category.name}`);
    lines.push("");
    lines.push(`Requirement: ${category.required ? "MUST" : "SHOULD"}`);
    lines.push(`Result: ${category.result}`);
    lines.push("");
    for (const test of category.tests) {
      lines.push(`- ${test.result}: ${test.name}`);
      if (test.detail) {
        lines.push(`  ${test.detail}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function renderReport(report, format) {
  if (format === "json") {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  if (format === "markdown") {
    return `${renderMarkdown(report)}\n`;
  }

  return `${renderText(report)}\n`;
}

function parseArgs(argv) {
  const [, , command = "test", ...rest] = argv;
  const options = {
    level: 1,
    format: "text",
    tier: "both",
    output: null,
    category: null,
  };
  const positional = [];

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    switch (value) {
      case "--level":
      case "-l":
        options.level = Number(rest[index + 1] ?? "1");
        index += 1;
        break;
      case "--format":
      case "-f":
        options.format = rest[index + 1] ?? "text";
        index += 1;
        break;
      case "--tier":
        options.tier = rest[index + 1] ?? "both";
        index += 1;
        break;
      case "--output":
      case "-o":
        options.output = rest[index + 1] ?? null;
        index += 1;
        break;
      case "--category":
      case "-c":
        options.category = rest[index + 1] ?? null;
        index += 1;
        break;
      default:
        positional.push(value);
    }
  }

  return { command, options, positional };
}

function runTestCommand(fixturePath, options) {
  if (!fixturePath) {
    process.stderr.write(
      "No fixture path provided.\nUsage: node scripts/run-conformance-tests.mjs test <path> [options]\n"
    );
    process.exit(3);
  }
  const fixture = loadJson(resolve(fixturePath));
  const report = evaluateFixture(fixture, options.level, options.tier);

  if (options.category) {
    report.categories = report.categories.filter((category) => category.name === options.category);
  }

  const rendered = renderReport(report, options.format);
  if (options.output) {
    writeFileSync(resolve(options.output), rendered, "utf8");
  } else {
    process.stdout.write(rendered);
  }

  process.exit(report.exitCode);
}

function runVerifyFixtures(options) {
  const fixtures = readdirSync(FIXTURES_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort();

  let failed = false;
  const lines = [];

  for (const file of fixtures) {
    const fixturePath = join(FIXTURES_DIR, file);
    const fixture = loadJson(fixturePath);
    const requestedLevel = fixture.expected_level ?? 1;
    const report = evaluateFixture(fixture, requestedLevel, options.tier);
    const expectedExitCode = fixture.expected_exit_code ?? 0;
    const matches = report.exitCode === expectedExitCode;
    lines.push(
      `${matches ? "PASS" : "FAIL"} ${file} -> expected ${expectedExitCode}, got ${report.exitCode}`
    );
    if (!matches) {
      failed = true;
      lines.push(renderText(report));
      lines.push("");
    }
  }

  process.stdout.write(`${lines.join("\n")}\n`);
  process.exit(failed ? 1 : 0);
}

function runReportCommand(resultPath, options) {
  if (!resultPath) {
    process.stderr.write(
      "No report path provided.\nUsage: node scripts/run-conformance-tests.mjs report <path> [options]\n"
    );
    process.exit(3);
  }
  const report = loadJson(resolve(resultPath));
  if (!report || typeof report !== "object" || !report.summary || !Array.isArray(report.categories)) {
    process.stderr.write(
      `Report input must be a conformance report JSON object with summary and categories: ${resultPath}\n`
    );
    process.exit(3);
  }
  const rendered = renderReport(report, options.format);
  if (options.output) {
    writeFileSync(resolve(options.output), rendered, "utf8");
  } else {
    process.stdout.write(rendered);
  }
  process.exit(0);
}

const { command, options, positional } = parseArgs(process.argv);

switch (command) {
  case "test":
    runTestCommand(positional[0], options);
    break;
  case "verify-fixtures":
    runVerifyFixtures(options);
    break;
  case "report":
    runReportCommand(positional[0], options);
    break;
  case "version":
    process.stdout.write("mcpaql-conformance-fixtures 0.1.0\n");
    break;
  default:
    process.stderr.write(`Unknown command: ${command}\n`);
    process.exit(3);
}
