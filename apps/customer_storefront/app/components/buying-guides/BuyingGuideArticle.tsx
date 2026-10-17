import React from 'react';
import Link from 'next/link';
import type { BuyingGuide } from '../../lib/buying-guides/model';
import { GUIDE_BASE_URL, guideUrl } from '../../lib/buying-guides/model';
import type { GuideProduct } from '../../lib/buying-guides/catalogue';
import { formatBdt } from '../../lib/formatPrice';
import { JsonLd } from '../seo/JsonLd';
import { GuideAddToCartButton, GuideProductLink, GuideView } from './GuideTracking';
import { GuideProductImage } from './GuideProductImage';
import styles from './buying-guides.module.css';

export function BuyingGuideArticle({ guide, products, related = [] }: {
  guide: BuyingGuide; products: GuideProduct[]; related?: BuyingGuide[];
}) {
  const url = guideUrl(guide.slug);
  const units = guide.products[0].quantity.unit;
  const availableCount = products.filter(p => p.available).length;
  const showRanking = guide.mode === 'ranked' && availableCount >= 3;
  return <article className={styles.article}>
    <GuideView slug={guide.slug} revision={guide.revision} />
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: guide.title, description: guide.description, mainEntityOfPage: url,
        datePublished: guide.publishedAt, dateModified: guide.updatedAt,
        author: { '@type': guide.author!.kind, name: guide.author!.name, url: guide.author!.profileUrl },
        publisher: { '@type': 'Organization', name: 'Lucky Store', url: GUIDE_BASE_URL } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: GUIDE_BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Buying guides', item: `${GUIDE_BASE_URL}/best` },
        { '@type': 'ListItem', position: 3, name: guide.title, item: url },
      ] },
      ...products.filter(p => p.current).map(p => ({
        '@type': 'Product', name: p.current!.name, url: `${GUIDE_BASE_URL}${p.href}`,
        image: p.current!.image_url ?? undefined,
        sku: p.current!.sku ?? undefined,
        brand: p.current!.brand ? { '@type': 'Brand', name: p.current!.brand } : undefined,
        offers: { '@type': 'Offer', price: p.current!.price, priceCurrency: 'BDT',
          availability: `https://schema.org/${p.available ? 'InStock' : 'OutOfStock'}`, url: `${GUIDE_BASE_URL}${p.href}` },
      })),
    ] }} />
    <nav aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/best">Buying guides</Link></nav>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Lucky Store buying guides</p>
      <h1>{guide.title}</h1>
      <p>{guide.description}</p>
      <p className={styles.byline}>By <a href={guide.author!.profileUrl}>{guide.author!.name}</a> · Published <time dateTime={guide.publishedAt}>{guide.publishedAt!.slice(0, 10)}</time>
        {guide.updatedAt !== guide.publishedAt && <> · Updated <time dateTime={guide.updatedAt}>{guide.updatedAt!.slice(0, 10)}</time></>}</p>
      <p>{guide.introduction}</p>
      <Link className={styles.cta} href={`/category/${guide.category.slug}`}>Shop {guide.category.name}</Link>
    </header>
    <aside className={styles.disclosure}>Lucky Store sells the products compared here. This guide covers our selected catalogue products, not every product sold in Bangladesh. <Link href="/best/editorial">Read our editorial policy</Link>.</aside>
    <section><h2>Key takeaways</h2><ul>{guide.takeaways.map(t => <li key={t.text}>{t.text}</li>)}</ul></section>
    <section><h2>Understanding {guide.category.name.toLowerCase()}</h2><p>{guide.definition.text}</p></section>
    <section><h2>How we {guide.mode === 'ranked' ? 'ranked' : 'compared'} these products</h2><p>{guide.methodology.text}</p>
      <ul data-comparison-criteria>{guide.criteria.map(criterion => <li key={criterion.label}><strong>{criterion.label}:</strong> {criterion.explanation.text}</li>)}</ul>
      <p>Prices and stock are checked when this page is requested. Price per 100{units} is calculated as pack price × 100 ÷ declared pack quantity. Check the product page and label before ordering.</p>
      {guide.mode === 'ranked' && <p>Editorial order reflects the approved research revision. Current prices and stock do not automatically change the ranking.</p>}
    </section>
    <section><h2>{guide.mode === 'ranked' ? 'The shortlist' : 'Products to compare'}</h2>
      {availableCount < 3 && <p role="status">Fewer than three selected products are currently available. Use this as a buying guide; check current options before choosing.</p>}
      <div className={styles.products}>{products.map(p => <section key={p.id} className={styles.product}>
        {p.current?.image_url && <GuideProductImage src={p.current.image_url} alt={`${p.current.name} product pack`} />}
        <h3>{showRanking && p.available ? `${p.rank}. ` : ''}{p.current?.name ?? p.verifiedName}</h3>
        {!p.available && <p className={styles.status}>{p.current ? 'Currently out of stock' : 'Product details need re-verification'}</p>}
        <p>{p.description.text}</p><p>Declared pack size: {p.quantity.value}{p.quantity.unit}</p>
        {p.current && <p><strong>{formatBdt(p.current.price)}</strong> · {formatBdt(p.unitPrice)} / 100{units}</p>}
        <p>Consider for: {p.useCase.text}</p>
        {p.rationale && <p>Research rationale: {p.rationale.text}</p>}
        {p.available && p.href && p.current ? <div className={styles.actions}>
          <GuideAddToCartButton className={styles.cartButton} slug={guide.slug} revision={guide.revision} product={{
            id: p.current.id, name: p.current.name, emoji: '', price: p.current.price,
            originalPrice: p.current.mrp ?? undefined,
            unit: `${p.quantity.value}${p.quantity.unit}`, category: guide.category.name,
            category_id: p.current.category_id, stock: p.current.sellable_qty,
            description: p.description.text, image_url: p.current.image_url ?? undefined,
            brand: p.current.brand ?? undefined,
          }} />
          <GuideProductLink href={p.href} slug={guide.slug} revision={guide.revision} productId={p.id}>Shop this product</GuideProductLink>
        </div> : p.href && <GuideProductLink href={p.href} slug={guide.slug} revision={guide.revision} productId={p.id}>View product details</GuideProductLink>}
      </section>)}</div>
    </section>
    <section><h2>Side-by-side comparison</h2>
      <div className={styles.tableScroll} role="region" aria-label="Product comparison" tabIndex={0}><table>
        <caption>Current catalogue prices; unit prices calculated from verified pack quantities</caption>
        <thead><tr><th scope="col">Product</th><th scope="col">Pack size</th><th scope="col">Pack price</th><th scope="col">Price / 100{units}</th><th scope="col">Availability</th></tr></thead>
        <tbody>{products.map(p => <tr key={p.id}><th scope="row">{p.current?.name ?? p.verifiedName}</th><td>{p.quantity.value}{p.quantity.unit}</td><td>{p.current ? formatBdt(p.current.price) : 'Not verified'}</td><td>{p.unitPrice === null ? 'Not verified' : formatBdt(p.unitPrice)}</td><td>{p.available ? 'In stock' : p.current ? 'Out of stock' : 'Not verified'}</td></tr>)}</tbody>
      </table></div>
    </section>
    <section><h2>Which option fits your needs?</h2><div className={styles.tableScroll} role="region" aria-label="Shopping use cases" tabIndex={0}><table>
      <caption>Editorial shopping considerations</caption><thead><tr><th scope="col">Product</th><th scope="col">Consider when</th><th scope="col">Check before buying</th></tr></thead>
      <tbody>{products.map(p => <tr key={p.id}><th scope="row">{p.verifiedName}</th><td>{p.useCase.text}</td><td>Label, pack size and current availability</td></tr>)}</tbody>
    </table></div></section>
    <section><h2>Frequently asked questions</h2>{guide.faqs.map(f => <div key={f.question}><h3>{f.question}</h3><p>{f.answer.text}</p></div>)}</section>
    <section><h2>Sources and verification</h2><ul>{Object.entries(guide.evidence).map(([id, e]) => <li key={id}><a href={e.url}>{e.title}</a> · Checked <time dateTime={e.checkedAt}>{e.checkedAt.slice(0, 10)}</time></li>)}</ul></section>
    {related.length > 0 && <section><h2>Related buying guides</h2><ul>{related.map(g => <li key={g.slug}><Link href={`/best/${g.slug}`}>{g.title}</Link></li>)}</ul></section>}
    <section className={styles.closing}><h2>Ready to choose?</h2><p>Browse current products and check <Link href="/delivery">delivery eligibility</Link> before ordering.</p><Link className={styles.cta} href={`/category/${guide.category.slug}`}>Shop {guide.category.name}</Link></section>
  </article>;
}
