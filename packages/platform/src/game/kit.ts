export * from './index';
// Test-only entry exposed as @kaki/platform/kit; keep it out of the runtime entry.
export type { FolderReader, PurityFinding, PurityOptions, SourceFile } from './purity';
export { importsOf, readSources, scanSource, scanSources, stripCommentsAndStrings } from './purity';
export type {
  CheckId,
  CheckResult,
  ConformanceOptions,
  ConformanceReport,
  FuzzOptions,
  PadState,
  Scenario,
  ScenarioSummary,
  ScenarioTick,
  Script,
  ScriptContext,
} from './conformance';
export {
  CONFORMANCE_CHECKS,
  MIN_STEPS,
  assertConformance,
  checkResults,
  formatReport,
  fuzzScript,
  makePlayers,
  runConformance,
} from './conformance';

// Correctness-test wall-clock limit for loaded machines, not a performance budget.
export function conformanceTimeout(measuredLoadedMs: number): number {
  return Math.max(15_000, Math.ceil(4 * measuredLoadedMs / 1000) * 1000);
}
