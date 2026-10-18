export interface MonitorTarget {
  name: string;
  url: string;
  expectStatus?: number;
  expectNotOk?: boolean;
}

export const MONITOR_URLS: MonitorTarget[] = [
  { name: 'api_robots', url: 'https://api.luckystore1947.com/robots.txt' },
  { name: 'luckystore_robots', url: 'https://luckystore1947.com/robots.txt' },
  { name: 'agent_robots', url: 'https://agent.luckystore1947.com/robots.txt' },
  { name: 'images_robots', url: 'https://images.luckystore1947.com/robots.txt' },
  { name: 'domainconnect_robots', url: 'https://_domainconnect.luckystore1947.com/robots.txt' },

  // Sensitive paths that must NOT be exposed publicly
  { name: 'git_head', url: 'https://images.luckystore1947.com/.git/HEAD', expectNotOk: true },
  { name: 'env_backup', url: 'https://images.luckystore1947.com/.env.backup', expectNotOk: true },

  // Public sitemaps
  { name: 'sitemap_api', url: 'https://api.luckystore1947.com/sitemap.xml' },
  { name: 'sitemap_storefront', url: 'https://luckystore1947.com/sitemap.xml' },
];

export interface MonitorCheckResult {
  name: string;
  url: string;
  timestamp: string;
  status: number | string;
  ok: boolean;
}

export async function runRobotsMonitor(): Promise<MonitorCheckResult[]> {
  const timestamp = new Date().toISOString();
  const results: MonitorCheckResult[] = [];

  for (const item of MONITOR_URLS) {
    try {
      const res = await fetch(item.url, { method: 'HEAD' });
      const status = res.status;
      const isExpected = item.expectNotOk ? status >= 400 : res.ok;
      const result: MonitorCheckResult = {
        name: item.name,
        url: item.url,
        timestamp,
        status,
        ok: isExpected,
      };
      results.push(result);

      if (!isExpected) {
        console.error(`[ROBOTS_MONITOR_ALERT] ${item.name} (${item.url}) returned unexpected status: ${status}`);
      } else {
        console.log(`[ROBOTS_MONITOR_OK] ${item.name} status: ${status}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        name: item.name,
        url: item.url,
        timestamp,
        status: message,
        ok: false,
      });
      console.error(`[ROBOTS_MONITOR_ERROR] ${item.name} (${item.url}) fetch failed: ${message}`);
    }
  }

  return results;
}
