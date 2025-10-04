
export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET = '+05:30';

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return IST_TIMEZONE;
  }
}

export function getTimezoneAbbreviation(timezone: string): string {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    return timeZonePart?.value || timezone;
  } catch {
    return timezone;
  }
}

export function formatToLocalTime(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const userTimezone = getUserTimezone();
  
  return date.toLocaleString('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatTimeToLocal(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const userTimezone = getUserTimezone();
  
  return date.toLocaleTimeString('en-US', {
    timeZone: userTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatWithTimezone(timestamp: string | Date, includeTimezone: boolean = true): string {
  const userTimezone = getUserTimezone();
  const formatted = formatToLocalTime(timestamp);
  
  if (!includeTimezone) return formatted;
  
  const tzAbbr = getTimezoneAbbreviation(userTimezone);
  return `${formatted} ${tzAbbr}`;
}

export function getTimezoneDisplay(): string {
  const userTimezone = getUserTimezone();
  const tzAbbr = getTimezoneAbbreviation(userTimezone);
  
  try {
    const date = new Date();
    const offset = date.toLocaleString('en-US', {
      timeZone: userTimezone,
      timeZoneName: 'longOffset'
    }).split(' ').pop();
    
    return `${tzAbbr} (${offset})`;
  } catch {
    return tzAbbr;
  }
}

export function formatForChart(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const userTimezone = getUserTimezone();
  
  return date.toLocaleString('en-US', {
    timeZone: userTimezone,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export const formatToIST = formatToLocalTime;
export const formatTimeToIST = formatTimeToLocal;

// Get current date in user's local timezone as YYYY-MM-DD
export function getTodayInLocalTimezone(): string {
  const userTimezone = getUserTimezone();
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return formatter.format(now); // Returns YYYY-MM-DD format
}