export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Appends a short random suffix to guarantee uniqueness without a DB round-trip. */
export function uniqueSlug(input: string): string {
  const base = slugify(input);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
