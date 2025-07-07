/** Format seconds as m:ss.SSS */
export function formatTime(timeSecond: number): string {
  if (!isFinite(timeSecond) || timeSecond < 0) return '0:00.000';
  const minutes = Math.floor(timeSecond / 60);
  const seconds = Math.floor(timeSecond % 60);
  const milliseconds = Math.round((timeSecond - Math.floor(timeSecond)) * 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}
