export function requireJwtSecret(): string {
  const key = process.env.JWT_SECRET;
  if (!key || key.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return key;
}
