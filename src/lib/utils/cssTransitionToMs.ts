export const cssTimeToMs = (time: string): number => {
  const trimmedTime = time.trim();

  if (trimmedTime.endsWith('ms')) {
    const numeric = trimmedTime.slice(0, -2);
    const value = +numeric;
    return isNaN(value) ? 0 : value;
  }

  if (trimmedTime.endsWith('s')) {
    const numeric = trimmedTime.slice(0, -1);
    const value = +numeric;
    return isNaN(value) ? 0 : value * 1000;
  }

  return 0;
};
