export const getFormattedUTCTime = (): string => {
  const now = new Date();
  // Use UTC methods for GMT 0
  const date = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = now.getUTCFullYear();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  return `${date}.${month}.${year} ${hours}:${minutes}:${seconds}`;
};