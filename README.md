# 日常之间 · 个人作品与生活记录

奶油白、陶土色与鼠尾草绿组成的中文个人网站。使用 Astro、TypeScript、原生 CSS 和本地打包的 Decap CMS；内容和代码均保存在 [camliesj/person](https://github.com/camliesj/person)。

## 已实现

- 首页、可分类筛选的作品列表、作品详情、日常记录列表与阅读页、关于、404。
- 手机单列、桌面双列、键盘焦点、跳过导航、图片说明与减少动画偏好。
- `/admin/` 中文内容后台；作品、记录、个人资料、图片、分类和精选顺序均可编辑。
- Markdown 内容校验、草稿排除、生产环境 SEO 与站点地图。
- Cloudflare Pages Functions OAuth：仅允许 `camliesj`，校验状态 cookie、正式域名、窗口消息来源和仓库写入权限。
- GitHub Actions 校验工作流、OAuth 和内容测试、构建后本地链接及资源检查。

当前内容明确标为示例，人物照片为占位图，不代表真实经历。摄影风格图片为 AI 生成，说明和提示词见 [素材说明](docs/ASSETS.md)。

## 本地运行

需要 Node.js 24（版本记录在 `.node-version`）。

```sh
npm ci
npm run build
npm run dev
```

开发地址为 `http://localhost:4321`。第一次先构建一次，以生成后台使用的本地脚本。前台开发以后可直接 `npm run dev`。

完整检查与含登录函数的本地预览：

```sh
npm test
npm run check
npm run build
npm run pages:dev
```

Pages 预览地址为 `http://localhost:8788`。未配置 OAuth 时后台会明确提示；生产登录只允许配置的 HTTPS 正式域名，本地不会模拟真实 GitHub 登录。

## 编辑内容

| 内容 | 文件 |
| --- | --- |
| 首页与个人资料 | `src/data/site.json` |
| 作品 | `src/content/projects/*.md` |
| 日常记录 | `src/content/notes/*.md` |
| 图片 | `public/uploads/` |
| 后台字段定义 | `scripts/cms-config.mjs` |
| 全站样式 | `src/styles/global.css` |
| 登录服务与测试 | `server/oauth.ts`、`tests/` |

后台配置生成自 `scripts/cms-config.mjs`，修改后运行构建；不要只修改生成的 `public/admin/config.json`。正文使用 Markdown 源码编辑并提供预览。图片支持中文文件名；上传时后台可压缩为 WebP。`sample: true` 显示示例标签，`draft: true` 则排除所有正式路由和列表。关闭页脚初稿提示前，请先替换示例作品和资料。

## 部署与后台接通

按 [部署与发布指南](docs/DEPLOYMENT.md) 将 Cloudflare Pages **连接 GitHub 仓库**，设置正式域名和 GitHub OAuth App。提交代码不等于已经部署：首次上线需要 Cloudflare 账户登录、仓库授权和 OAuth 环境变量。

后续流程：后台登录 → 编辑 → 保存草稿 → 标记待发布 → 发布到 `main` → Cloudflare 构建成功 → 前台更新。构建失败时线上保持上一版；排查流程见部署指南。公开仓库里的草稿不具有隐私保护。

## GitHub 同步

本项目按 [AGENTS.md](AGENTS.md) 约定，在每轮代码修改并检查后提交、普通推送至 `origin/main`。这不是文件监视服务；其他编辑器里的保存不会自动上传。后台可能产生远程提交，本地开发前先 `git fetch origin` 并检查差异，在工作区干净且可快进时执行 `git pull --ff-only`。

依赖、构建产物、真实环境文件、Wrangler 凭据和预览截图均被 `.gitignore` 排除。上游依赖状况与验收边界见 [验收记录](docs/VERIFICATION.md)。
