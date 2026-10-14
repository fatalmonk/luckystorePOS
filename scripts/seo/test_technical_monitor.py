"""Offline tests for parsing and evidence classification."""
import unittest
from technical_monitor import PageParser, parse_sitemap, robots_summary, schema_types

class MonitorTests(unittest.TestCase):
    def test_sitemap_namespace(self):
        kind, urls = parse_sitemap('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.luckystore1947.com/</loc></url></urlset>')
        self.assertEqual(kind, 'urlset')
        self.assertEqual(len(urls), 1)

    def test_sitemap_index(self):
        kind, urls = parse_sitemap('<sitemapindex><sitemap><loc>https://www.luckystore1947.com/a.xml</loc></sitemap></sitemapindex>')
        self.assertEqual((kind, len(urls)), ('sitemapindex', 1))

    def test_html(self):
        p = PageParser()
        p.feed('<link rel="canonical" href="https://www.luckystore1947.com/"><link rel="alternate" hreflang="en-BD" href="/"><script type="application/ld+json">{"@type":["Store","GroceryStore"]}</script>')
        self.assertEqual(len(p.canonicals), 1)
        self.assertEqual(len(p.alternates), 1)
        self.assertIn('GroceryStore', schema_types(p.jsonld[0]['data']))

    def test_invalid_jsonld(self):
        p = PageParser()
        p.feed('<script type="application/ld+json">{broken}</script>')
        self.assertFalse(p.jsonld[0]['valid'])

    def test_robots_does_not_infer_allow(self):
        data = robots_summary('User-agent: *\nDisallow: /private\n')
        self.assertFalse(data['tracked_agents']['GPTBot']['explicit_group'])
        self.assertEqual(data['tracked_agents']['GPTBot']['rules'][0]['path'], '/private')

if __name__ == '__main__':
    unittest.main()
