export function Icon({ kind }: { kind: string }) {
  const paths: Record<string, string> = { join: 'M12 4v16M4 12h16', held: 'M4 10a8 8 0 1 1 1 8M4 4v6h6', relayed: 'M5 19L19 5M5 5h14v14', weak: 'M12 3L2 21h20L12 3zM12 9v6M12 17v2', good: 'M5 12l5 5L20 6', joining: 'M4 12h3M11 12h3M18 12h3', leader: 'M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z' };
  return <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d={paths[kind] ?? paths.joining}/></svg>;
}
