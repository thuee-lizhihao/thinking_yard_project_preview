import site from './site.json' with { type: 'json' };
export function basePath() {
  const value = process.env.SITE_BASE_PATH ?? (process.env.GITHUB_PAGES === 'true' ? site.basePath : '');
  if (value && !/^\/[a-zA-Z0-9_/-]+$/.test(value)) throw new Error('SITE_BASE_PATH must be empty or an absolute URL path.');
  return value.replace(/\/+$/, '');
}
export function siteURL() { return `${process.env.SITE_ORIGIN || site.origin}${basePath()}/`; }
