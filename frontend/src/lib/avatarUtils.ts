// Avatar utility functions for WhatsApp-style profile pictures

/**
 * Generate consistent color based on user ID or name
 * Returns a Tailwind-compatible gradient class
 */
export function getAvatarColor(id: string | undefined): string {
  if (!id) return 'from-gray-400 to-gray-500';
  
  // WhatsApp-style vibrant colors
  const colors = [
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-orange-400 to-orange-600',
    'from-teal-400 to-teal-600',
    'from-indigo-400 to-indigo-600',
    'from-rose-400 to-rose-600',
    'from-cyan-400 to-cyan-600',
    'from-amber-400 to-amber-600',
  ];
  
  // Generate consistent index from ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Get initials from name (max 2 characters)
 */
export function getInitials(firstName?: string, lastName?: string, fallback = '?'): string {
  if (!firstName && !lastName) return fallback;
  
  const first = firstName?.trim()?.[0]?.toUpperCase() || '';
  const last = lastName?.trim()?.[0]?.toUpperCase() || '';
  
  return (first + last) || fallback;
}

/**
 * Get initials from full name string
 */
export function getInitialsFromFullName(fullName?: string, fallback = '?'): string {
  if (!fullName) return fallback;
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return fallback;
  
  if (parts.length === 1) {
    return parts[0][0]?.toUpperCase() || fallback;
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Validate if image URL is accessible
 */
export function isValidImageUrl(url?: string | null): boolean {
  if (!url) return false;
  
  // Check if it's a valid URL format
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}








