/** Host presentation only (PERF-002, PERF-023); never called by simulation or conformance.
 * Assets are already decoded round resources. draw must render synchronously,
 * forcing GPU work each frame (WebGL flush or a 1-pixel read). width and height are
 * the TV viewport multiplied by devicePixelRatio (backing pixels). Never
 * schedule frames or load resources. The shell owns timing and always calls destroy.
 */
export type BenchmarkScene<Target, Assets> = (target: Target, options: { width: number; height: number; assets: Assets }) => {
    draw(timestamp: number): void;
    destroy(): void;
};
/** Optional declaration on a game's host presentation, separate from its pure module. */
export interface GamePresentation<Target, Assets> {
  benchmarkScene?: BenchmarkScene<Target, Assets>;
  /** Resolve from the round's resource cache; the eventual renderer reuses these resources.
   * Omit for scenes whose already prepared resources are captured by their closure. */
  loadBenchmarkAssets?(detail: 'full' | 'half'): Promise<Assets>;
}
