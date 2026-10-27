import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const localImage = z.string().regex(/^\/uploads\/[^?#\\\u0000-\u001f]+$/, '图片需来自本站 uploads 目录')
  .refine((value) => value.split('/').slice(2).every((segment) => segment && segment !== '.' && segment !== '..'), '图片路径无效');
const common = {
  title: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().min(1).max(240),
  date: z.coerce.date(),
  category: z.string().min(1),
  cover: localImage,
  coverAlt: z.string().min(1),
  draft: z.boolean().default(false),
  sample: z.boolean().default(false),
};
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({ ...common,
    featured: z.boolean().default(false),
    order: z.number().int().min(0).default(10),
    tags: z.array(z.string()).nullish().transform((value) => value ?? []),
    gallery: z.array(z.object({ image: localImage, alt: z.string().min(1) })).nullish().transform((value) => value ?? []),
    links: z.array(z.object({ label: z.string().min(1), url: z.url({ protocol: /^https$/ }) })).nullish().transform((value) => value ?? []),
  }),
});
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({ ...common, tags: z.array(z.string()).nullish().transform((value) => value ?? []) }),
});
export const collections = { projects, notes };
