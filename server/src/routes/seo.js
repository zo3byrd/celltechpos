const router = require('express').Router();

// Sitemap — lists all public pages for Google to crawl
router.get('/sitemap.xml', (req, res) => {
  const base = 'https://celltechpos.com';
  const now = new Date().toISOString().split('T')[0];

  const pages = [
    { url: '/',        changefreq: 'weekly',  priority: '1.0' },
    { url: '/contact', changefreq: 'monthly', priority: '0.7' },
    { url: '/privacy', changefreq: 'yearly',  priority: '0.3' },
    { url: '/terms',   changefreq: 'yearly',  priority: '0.3' },
    { url: '/signup',  changefreq: 'monthly', priority: '0.8' },
    { url: '/login',   changefreq: 'monthly', priority: '0.5' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${base}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// robots.txt — tell crawlers what to index
router.get('/robots.txt', (req, res) => {
  const txt = `User-agent: *
Allow: /
Disallow: /app/
Disallow: /superadmin/
Disallow: /api/

Sitemap: https://celltechpos.com/sitemap.xml
`;
  res.set('Content-Type', 'text/plain');
  res.send(txt);
});

module.exports = router;
