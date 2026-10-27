import { getCollection } from 'astro:content';
import { published, assertUniqueSlugs } from './collection-utils';
export async function getProjects() {
  const entries = await getCollection('projects'); assertUniqueSlugs(entries); return published(entries);
}
export async function getNotes() {
  const entries = await getCollection('notes'); assertUniqueSlugs(entries); return published(entries);
}
