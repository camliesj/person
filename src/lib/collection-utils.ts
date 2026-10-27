export interface EntryLike { data: { draft: boolean; date: Date; slug: string; featured?: boolean; order?: number } }
export function published<T extends EntryLike>(entries: T[]): T[] {
  return entries.filter((entry) => !entry.data.draft).sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.slug.localeCompare(b.data.slug));
}
export function featured<T extends EntryLike>(entries: T[]): T[] {
  return published(entries).filter((entry) => entry.data.featured).sort((a, b) => (a.data.order ?? 10) - (b.data.order ?? 10));
}
export function assertUniqueSlugs(entries: EntryLike[]) {
  const seen = new Set<string>();
  for (const { data } of entries) {
    if (seen.has(data.slug)) throw new Error(`重复的内容网址：${data.slug}`);
    seen.add(data.slug);
  }
}
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' }).format(date).replaceAll('/', '.');
}
