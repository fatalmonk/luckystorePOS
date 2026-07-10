import fs from 'fs';

const urls = [
  { name: 'api', url: 'https://api.luckystore1947.com/robots.txt' },
  { name: 'luckystore', url: 'https://luckystore1947.com/robots.txt' },
  { name: 'agent', url: 'https://agent.luckystore1947.com/robots.txt' },
  { name: 'images', url: 'https://images.luckystore1947.com/robots.txt' },
  { name: '_domainconnect', url: 'https://_domainconnect.luckystore1947.com/robots.txt' },

  // Most visited & sensitive paths
  { name: 'git_head', url: 'https://images.luckystore1947.com/.git/HEAD' },
  { name: 'env_backup', url: 'https://images.luckystore1947.com/.env.backup' },
  { name: 'sitemap', url: 'https://api.luckystore1947.com/sitemap.xml' },
];

async function check(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { status: res.status, ok: res.ok };
  } catch (e) {
    return { error: e.message };
  }
}

(async () => {
  const results = [];
  const timestamp = new Date().toISOString();
  for (const { name, url } of urls) {
    const r = await check(url);
    const line = `${name}\t${url}\t${timestamp}\t${r.status ?? r.error}`;
    results.push(line);
    console.log(line);
  }
  fs.writeFileSync('robots.log', results.join('\n') + '\n');
})();
