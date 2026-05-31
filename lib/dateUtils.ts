/**
 * Format date as: "30 May 2026"
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Returns a compact, human-friendly relative date label suitable for small UI elements.
 * Examples: "Today", "Yesterday", "2d ago", "30 May"
 */
export function formatRelativeShort(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();

  // Normalize times to local dates
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfGiven = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round((startOfToday.getTime() - startOfGiven.getTime()) / msPerDay);

  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff > 1 && dayDiff <= 6) return `${dayDiff}d ago`;

  // For dates older than a week, show day + short month; omit the year when it's the same year
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();

  if (year === now.getFullYear()) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${year}`;
}

