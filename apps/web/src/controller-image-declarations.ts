/** Phone art declarations are data-only leaves: never import host rules or secret content.
 * Kept apart from game-registry so a phone's picture preload never pulls in host game modules. */
export async function loadControllerImages(id: string): Promise<Readonly<Record<string,string>>> {
  switch (id) {
    case 'tabao-rush': return (await import('../../../games/tabao-rush/src/rules/controller-images')).controllerImages;
    default: return {};
  }
}
