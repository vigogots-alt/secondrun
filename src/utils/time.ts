export const getFormattedUTCTime = (): string => {
  // Returns a string in simplified extended ISO format (ISO 8601),
  // which is always 24 or 27 characters long (YYYY-MM-DDTHH:mm:ss.sssZ or ±YYYYYY-MM-DDTHH:mm:ss.sssZ).
  // The timezone is always UTC (denoted by the suffix "Z").
  return new Date().toISOString();
};