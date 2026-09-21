export function getDuplicates<T>(items: T[], groupFn: (item: T) => string) {
  const groups = Object.groupBy(items, groupFn);
  return Object.values(groups)
    .filter((list) => list!.length > 1)
    .map((list) => list![0]);
}
