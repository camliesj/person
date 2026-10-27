const text = (name, label, extra = {}) => ({ name, label, widget: 'string', ...extra });
const image = (name, label) => ({ name, label, widget: 'image', choose_url: false, media_library: { config: { max_file_size: 5242880 } } });
const common = [
  text('title', '标题'), text('slug', '网址名称', { hint: '例如 my-first-project。发布后尽量不要更改。', pattern: ['^[a-z0-9]+(?:-[a-z0-9]+)*$', '请使用小写英文、数字和连字符'] }),
  { name: 'summary', label: '简短介绍', widget: 'text' },
  { name: 'date', label: '日期', widget: 'datetime', date_format: 'YYYY-MM-DD', time_format: false, format: 'YYYY-MM-DD' },
  text('category', '分类', { hint: '相同分类名称会自动归在一起。' }), image('cover', '封面图'), text('coverAlt', '图片说明', { hint: '描述画面，帮助使用屏幕阅读器的访客。' }),
  { name: 'draft', label: '暂不展示', widget: 'boolean', default: false, hint: '打开后，即使合并到主分支也不在网站展示。正常发布请保持关闭。' },
  { name: 'sample', label: '标记为示例内容', widget: 'boolean', default: false },
  { name: 'tags', label: '标签', widget: 'list', required: false, default: [] },
];
export const cmsConfig = {
  load_config_file: false,
  backend: { name: 'github', repo: 'camliesj/person', branch: 'main', auth_endpoint: 'api/auth', squash_merges: true },
  locale: 'zh_Hans', publish_mode: 'editorial_workflow',
  media_folder: 'public/uploads', public_folder: '/uploads',
  media_processing: { enabled: true, width: 2000, height: null, quality: 83, format: { enabled: true, default: 'webp' }, strip_metadata: true },
  logo_url: '/favicon.svg', display_url: '/', show_preview_links: true,
  slug: { encoding: 'ascii', clean_accents: true, sanitize_replacement: '-' },
  collections: [
    { name: 'projects', label: '作品', label_singular: '作品', folder: 'src/content/projects', create: true, identifier_field: 'slug', slug: '{{slug}}', preview_path: 'works/{{slug}}/', summary: '{{title}} · {{category}}', fields: [...common,
      { name: 'featured', label: '在首页精选展示', widget: 'boolean', default: false },
      { name: 'order', label: '精选顺序', widget: 'number', value_type: 'int', min: 0, default: 10, hint: '数字越小，越靠前。首页展示前两项。' },
      { name: 'gallery', label: '更多图片', widget: 'list', required: false, default: [], fields: [image('image', '图片'), text('alt', '图片说明')] },
      { name: 'links', label: '相关链接', widget: 'list', required: false, default: [], fields: [text('label', '按钮文字'), text('url', '链接地址', { pattern: ['^https://', '链接必须以 https:// 开头'] })] },
      { name: 'body', label: '作品正文', widget: 'markdown', modes: ['raw'], hint: '使用 Markdown 编写正文，可插入标题、链接和图片。' },
    ] },
    { name: 'notes', label: '日常记录', label_singular: '记录', folder: 'src/content/notes', create: true, identifier_field: 'slug', slug: '{{slug}}', preview_path: 'notes/{{slug}}/', summary: '{{title}} · {{date}}', fields: [...common, { name: 'body', label: '正文', widget: 'markdown', modes: ['raw'], hint: '使用 Markdown 编写正文，可插入标题、链接和图片。' }] },
    { name: 'settings', label: '个人资料与首页', files: [{ name: 'site', label: '网站资料', file: 'src/data/site.json', fields: [
      text('title', '网站名称'), text('name', '昵称'), { name: 'description', label: '网站介绍', widget: 'text' },
      { name: 'heroTitle', label: '首页大标题', widget: 'text', hint: '建议分成两行。' }, { name: 'intro', label: '首页自我介绍', widget: 'text' },
      image('heroImage', '首页主图'), text('heroImageAlt', '首页主图说明'), text('heroCaption', '主图下方文字'),
      { name: 'aboutTitle', label: '关于我的标题', widget: 'text' }, { name: 'aboutText', label: '关于我的简短介绍', widget: 'text' },
      { name: 'bio', label: '详细自我介绍', widget: 'text' }, image('portrait', '个人照片'), text('portraitAlt', '个人照片说明'),
      { name: 'interests', label: '兴趣与方向', widget: 'list' },
      { name: 'timeline', label: '个人经历', widget: 'list', required: false, default: [], fields: [text('year', '年份'), text('text', '经历说明')] },
      text('email', '公开联系邮箱', { required: false, default: '', hint: '留空则不显示邮箱。填写后会公开显示。' }),
      { name: 'socials', label: '公开社交链接', widget: 'list', required: false, fields: [text('label', '平台名称'), text('url', '网址', { pattern: ['^https://', '请使用 https:// 链接'] })] },
      { name: 'demoNotice', label: '显示初稿提示', widget: 'boolean', default: true, hint: '替换完示例内容后，可以关闭页脚的初稿提示。' },
    ] }] },
  ],
};
