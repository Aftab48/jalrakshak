import { runScenarioChecks } from "../lib/simulation-engine";

/**
 * Verifies the V2 early-warning contract for every demo scenario against the
 * real intelligence pipeline. Pure engine checks — no database required.
 */
function main() {
  const checks = runScenarioChecks();
  const failed: string[] = [];
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.scenario}: ${check.expectation}`);
    console.log(`     actual: ${check.actual}`);
    if (!check.passed) failed.push(check.scenario);
  }
  if (failed.length) {
    console.error(`\nFailed scenarios: ${failed.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${checks.length} scenario contracts verified.`);
  }
}

main();