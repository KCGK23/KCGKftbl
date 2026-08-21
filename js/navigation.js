const pages = [
  ['index.html', 'Player'], ['pages/fixtures.html', 'Fixtures'], ['pages/results.html', 'Results'],
  ['pages/league.html', 'League'], ['pages/stats.html', 'Stats'], ['pages/admin.html', 'Admin']
];

export function mountNavigation(active) {
  const host = document.querySelector('[data-site-navigation]');
  if (!host) return;
  const prefix = location.pathname.includes('/pages/') ? '../' : '';
  host.innerHTML = `<nav class="site-nav" aria-label="Main navigation">${pages.map(([path, label]) => {
    const href = prefix + path;
    return `<a href="${href}"${label === active ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('')}</nav>`;
}
