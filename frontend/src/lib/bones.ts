export function bonesFor(value: number): number {
  if (value === 55) {
    return 7
  }
  if (value % 11 === 0) {
    return 5
  }
  if (value % 10 === 0) {
    return 3
  }
  if (value % 5 === 0) {
    return 2
  }
  return 1
}
