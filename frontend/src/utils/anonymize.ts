export const anonymizeEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) return "*".repeat(email.length);

  const visibleChars = Math.min(3, localPart.length);
  const maskedLocal =
    localPart.substring(0, visibleChars) + "*".repeat(Math.max(0, localPart.length - visibleChars));

  return `${maskedLocal}@${domain}`;
};
