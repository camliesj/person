(async () => {
  const status = document.getElementById('admin-status');
  try {
    const response = await fetch('/admin/config.json');
    if (!response.ok) throw new Error('后台配置加载失败');
    const config = await response.json();
    config.backend.base_url = window.location.origin;
    config.site_url = window.location.origin;
    config.display_url = window.location.origin;
    if (!window.CMS) throw new Error('编辑器加载失败，请刷新后重试');
    window.CMS.init({ config });
    window.CMS.registerPreviewStyle('/styles/reading.css');
    try {
      const result = await fetch('/api/auth/status', { cache: 'no-store' });
      const auth = result.ok ? await result.json() : null;
      status.textContent = auth?.configured ? '保存为草稿 → 发布 → 等待网站构建完成。' : '后台登录尚未配置；可以查看编辑器，发布功能待接通。';
    } catch { status.textContent = '暂时无法连接登录服务，请稍后重试。'; }
  } catch (error) {
    status.textContent = `${error.message}。请检查网络，或稍后刷新重试。`;
    status.setAttribute('role', 'alert');
  }
})();
