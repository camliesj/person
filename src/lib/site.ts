import { z } from 'astro/zod';
import data from '../data/site.json';
const publicUrl = z.url({ protocol: /^https$/ });
const image = z.string().regex(/^\/uploads\/[^?#\\\u0000-\u001f]+$/).refine((value) => value.split('/').slice(2).every((segment) => segment && segment !== '.' && segment !== '..'));
export const site = z.object({
  title: z.string().min(1), name: z.string().min(1), description: z.string().min(1),
  heroTitle: z.string().min(1), intro: z.string().min(1), heroImage: image,
  heroImageAlt: z.string().min(1), heroCaption: z.string(),
  aboutTitle: z.string().min(1), aboutText: z.string().min(1), bio: z.string(),
  portrait: image, portraitAlt: z.string().min(1),
  interests: z.array(z.string()).nullish().transform((value) => value ?? []),
  timeline: z.array(z.object({ year: z.string(), text: z.string() })).nullish().transform((value) => value ?? []),
  email: z.union([z.literal(''), z.email()]).nullish().transform((value) => value ?? ''),
  socials: z.array(z.object({ label: z.string(), url: publicUrl })).nullish().transform((value) => value ?? []), demoNotice: z.boolean(),
}).parse(data);
