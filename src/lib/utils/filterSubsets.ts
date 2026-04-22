/**
 * Given a list of groups, removes any group that is a proper subset of another group in the list.
 *
 * Example: [[a,b,c], [a,b], [b,c]] → [[a,b,c]]
 * because [a,b] and [b,c] are subsets of [a,b,c].
 */
export function filterSubsets(groups: string[][]): string[][] {
  return groups.filter((group) => {
    return !groups.some((other) => {
      if (other === group || other.length <= group.length) return false;
      const otherSet = new Set(other);
      return group.every((pak) => otherSet.has(pak));
    });
  });
}
