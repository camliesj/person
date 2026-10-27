import { readdir, readFile, stat, access } from 'node:fs/promises';
import { join, resolve, relative, extname } from 'node:path';
const root = resolve('dist');
async function filesAt(dir) {
  const items = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(items.map((item) => item.isDirectory() ? filesAt(join(dir, item.name)) : [join(dir, item.name)]));
  return groups.flat();
}
const files = await filesAt(root);
const pages = files.filter((name) => name.endsWith('.html'));
const issues = [];
for (const file of pages) {
  const html = await readFile(file, 'utf8');
  if (!html.includes('lang="zh-CN"')) issues.push(`${relative(root, file)}: 页面缺少中文语言声明`);
  if (!html.includes('<title>')) issues.push(`${relative(root, file)}: 页面缺少标题`);
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    const value = match[1];
    if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/api/')) continue;
    const pathname = decodeURIComponent(value.split('?')[0]);
    let target = resolve(root, `.${pathname}`);
    if (!target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`) && target !== root) { issues.push(`路径越界：${value}`); continue; }
    if (pathname.endsWith('/')) target = join(target, 'index.html');
    try { await access(target); } catch { issues.push(`${relative(root, file)}: 链接或资源不存在 ${value}`); }
  }
  for (const match of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(match[0])) issues.push(`${relative(root, file)}: 图片缺少 alt`);
  if (!file.includes(`${join('dist', 'admin')}`) && /unpublished-example/.test(html)) issues.push('草稿出现在正式页面');
}
if (files.some((file) => file.includes('unpublished-example'))) issues.push('生成了未发布内容的路由');
for (const file of files) {
  if ((await stat(file)).size > 25 * 1024 * 1024) issues.push(`${relative(root, file)}: 超过 Pages 单文件限制`);
  if (/\.(env|vars)$/.test(file) || file.endsWith('.map')) issues.push(`${relative(root, file)}: 不应发布的文件`);
  if (extname(file) === '.xml' && (await readFile(file, 'utf8')).includes('unpublished-example')) issues.push('草稿进入了站点地图');
}
if (issues.length) throw new Error(issues.join('\n'));
console.log(`Verified ${pages.length} HTML pages: links, assets, alt text, draft exclusion, and Pages size limits.`);
