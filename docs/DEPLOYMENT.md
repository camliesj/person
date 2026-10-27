# 部署与发布指南

## 1. 创建 Cloudflare Pages Git 项目

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，进入 Workers & Pages，创建 Pages 项目并选择连接 Git。
2. 安装或授权 Cloudflare 的 GitHub 集成，只选择 `camliesj/person` 仓库。
3. 项目名称建议 `camliesj-person`（实际可用性以控制台为准），生产分支 `main`，根目录留空。
4. 框架选择 Astro；构建命令 `npm test && npm run check && npm run build`；输出目录 `dist`。
5. 设置构建环境 `NODE_VERSION=24.15.0`，并将 `SITE_URL` 设置为项目实际的 HTTPS 正式地址。地址不带路径，例如 `https://你的项目.pages.dev`。
6. 函数兼容性日期设置为 `2026-10-27`。完成首次部署，确认首页和 `/works/` 能打开。

应选择 Git 集成项目；不要先创建 Direct Upload 项目，因为它不能直接切换为 Git 集成。生产 `main` 更新会自动部署，其他分支可生成预览。`functions/` 会随 Pages 构建打包，只有 `/api/auth` 及其子路径使用函数额度。

仓库的 `wrangler.jsonc` 仅用于本地预览，特意不含 `pages_build_output_dir`；生产变量由控制台管理，避免配置文件覆盖控制台设置。以后如改为代码管理绑定，需先按 [Cloudflare 配置指南](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) 迁移所有生产配置。

无需付费域名、数据库或服务器。免费配额由平台实时规则和账户用量决定；首次发布前在账户中核对。国内可达性需要实际网络验证。

## 2. 创建 GitHub OAuth App

在 [GitHub OAuth Apps](https://github.com/settings/developers) 中创建个人 OAuth App：

| 字段 | 值 |
| --- | --- |
| Application name | 日常之间内容后台 |
| Homepage URL | 实际正式地址 |
| Authorization callback URL | `https://实际正式域名/api/auth/callback` |
| Device Flow | 不启用 |

取得 Client ID，并生成 Client Secret。密钥仅输入 Cloudflare 的 Secret 环境变量，不粘贴到聊天、仓库或前端代码。

在 Pages 项目的 **Production** 环境配置以下变量，然后重新部署：

| 变量 | 类型与用途 |
| --- | --- |
| `SITE_URL` | 明文；完整的正式 HTTPS 来源，例如 `https://你的项目.pages.dev`；同时供构建和函数使用 |
| `GITHUB_CLIENT_ID` | 明文；OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | Secret；OAuth App 的 Client Secret |

Preview 环境不要添加 OAuth 密钥。后台只允许从 `SITE_URL` 指定的正式域名登录；更换域名时，必须同时修改 `SITE_URL` 和 GitHub callback，再重新部署。

登录申请 GitHub `public_repo` 范围，这是 OAuth App 对公开仓库的写入权限，GitHub 无法把这个范围缩小为单个公开仓库；函数另行检查登录者必须是 `camliesj` 且能写入目标仓库。确认授权页面的应用名称和范围后再授权。退出后台可移除浏览器中的登录状态；如需撤销令牌，在 GitHub Settings → Applications → Authorized OAuth Apps 撤销该应用。

## 3. 验证真实编辑流程

1. 打开正式网站 `/admin/`；顶部应提示“保存为草稿 → 发布 → 等待网站构建完成”。
2. 使用 `camliesj` 登录，新建一件验收作品，填写标题、唯一英文网址名称、日期、摘要、分类、封面说明和正文。
3. 上传一张非敏感图片；关闭“暂不展示”，再保存为草稿。
4. 确认编辑工作流中存在草稿，而正式网站列表、详情地址和站点地图都没有它。注意公开仓库的草稿分支本身可被浏览。
5. 将状态切换为待发布并发布；确认 GitHub `main` 有合并后的提交，Cloudflare 构建成功，正式页面及图片可访问。
6. 保留验收内容或在后台删除，再确认下一次构建结果。

编辑器预览只用于查看内容排版。本站提供的正式预览链接在草稿尚未部署时可能返回 404，应等待对应部署完成。

## 4. 故障反馈与恢复

- **“后台登录尚未配置”**：检查三个环境变量是否都存在于生产环境、是否已重新部署。
- **预览地址不提供登录服务**：返回正式域名；这是设计行为。
- **取消授权 / 状态校验失败**：后台和回调窗口会显示中文反馈。关闭弹窗后重新登录，检查浏览器是否禁用弹窗或 Cookie。
- **其他账号 / 无仓库写权限**：登录会被拒绝，不会把令牌交给编辑器。
- **编辑器发布失败**：Decap 会显示错误，内容不会自动成为线上页面。检查授权、仓库权限、网络和分支规则，在工作流中确认草稿仍在后重试。
- **GitHub 合并成功但网站没更新**：查看 Pages Deployments 的构建日志。本项目内容校验、测试或构建失败会阻止新版本上线，原部署继续服务。修复后重新构建；若需回退可使用 Pages 部署记录回滚，再妥善恢复 Git 内容。
- **国内访问不稳定**：分别实测首页、作品、图片、后台脚本及 GitHub 登录；不要仅以外部探测服务判断。保留可用预览与源码，再根据实际错误决定托管调整。

## 5. 本地开发与日常维护

后台发布会改动远程 Git 历史。开发前检查本地工作区并同步远程；存在未提交修改时先妥善保存，不能直接覆盖。涉及密钥调试时可复制 `.dev.vars.example` 为忽略的 `.dev.vars`，但本地 HTTP 地址仍不能走生产 OAuth。常规测试用模拟 GitHub 响应，不需要真实密钥。

每次升级 Decap 后重新验证中文登录、媒体配置及编辑流程；CMS 的预编译文件由构建脚本复制到站点，单改其子依赖版本不能保证修补预编译文件。

参考：[Pages Git 集成](https://developers.cloudflare.com/pages/configuration/git-integration/)、[Pages 限制](https://developers.cloudflare.com/pages/platform/limits/)、[Functions 费用](https://developers.cloudflare.com/pages/functions/pricing/)、[Decap GitHub 后端](https://decapcms.org/docs/github-backend/)、[Decap 编辑工作流](https://decapcms.org/docs/editorial-workflows/)。
