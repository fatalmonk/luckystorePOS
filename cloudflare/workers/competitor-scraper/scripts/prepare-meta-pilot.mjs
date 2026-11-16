import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { findBestMatch, parsePackageInfo } from '../src/matcher.ts';

// Offline preparation only. No retailer access, AI inference, Supabase, or Cloudflare writes.
const root = resolve(import.meta.dirname, '../../../..');
const data = JSON.parse(readFileSync(resolve(root, 'catalog/meta-catalog-2026-11-17.json'), 'utf8'));
if (data.catalog_id !== '1044868008554441' || data.products.length !== 172) throw Error('Unexpected Meta catalog snapshot');
const productIds = new Set();
const unitTokens = { g:'g',gm:'g',kg:'kg', ml:'ml',l:'l',ltr:'l',litre:'l',liter:'l' };
function units(name) {
  const sizes = [...name.matchAll(/(?:^|[^a-z0-9])(\d+(?:\.\d+)?)\s*(kg|g|gm|ml|l|ltr|litre|liter)\b/gi)].map(m=>({quantity:Number(m[1]),unit:unitTokens[m[2].toLowerCase()]}));
  const counts = [...name.matchAll(/\b(\d+)\s*(pack|packs|pcs|pieces|bags|bottles|cans|sachets|tea\s*bags|p)\b/gi)].map(m=>({quantity:Number(m[1]),unit:m[2].toLowerCase().replace(/\s+/g,'-')}));
  const explicitMultipack=/\b\d+\s*[x×]\s*\d+\b/i.test(name);
  const marketingName=/(standard pack|family pack|loose|tea bag$|cup$)/i.test(name);
  const canonical=sizes.map(({quantity,unit})=>({quantity:unit==='kg'||unit==='l'?quantity*1000:quantity,unit:unit==='kg'?'g':unit==='l'?'ml':unit}));
  const unique=new Set(canonical.map(x=>x.quantity+':'+x.unit));
  const ambiguous=explicitMultipack || (sizes.length>1&&unique.size>1) || (sizes.length>0&&counts.length>0) || (sizes.length===0&&counts.length===0);
  return {sizes:canonical,counts,ambiguous,marketingName,comparable:canonical.length===1&&!ambiguous};
}
const rows=data.products.map(p=>{
  if(!p.retailer_id||productIds.has(p.retailer_id))throw Error('Duplicate or missing product ID');
  productIds.add(p.retailer_id);
  if(p.currency!=='BDT'||!Number.isFinite(Number(p.price))||Number(p.price)<=0)throw Error('Invalid source price');
  const pack=units(p.name);
  return {retailer_id:p.retailer_id,name:p.name,brand:p.brand,meta_price_bdt:Number(p.sale_price||p.price),price_kind:p.sale_price?'sale':'regular',source_product_url:p.url,source:'Meta Commerce Catalog snapshot',observed_date:data.fetch_date,pack_sizes:pack.sizes,pack_counts:pack.counts,pack_ambiguous:pack.ambiguous,pack_quality:pack.comparable?'normalized':'manual-review',source_structured_size_present:!!p.size,barcode:null};
});
// Favor measurable-pack packaged products and one row per brand+name; do not infer sales rank.
const pilot=rows.filter(r=>r.pack_quality==='normalized'&&r.brand&&r.name&&!/loose/i.test(r.name)).slice(0,25);
if(pilot.length!==25)throw Error('Insufficient deterministic 25-SKU pilot candidates');
const escape=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=[['retailer_id','product_name','brand','luckystore_price_bdt','package_size','luckystore_product_url','the_basket_bdt','khulshi_mart_bdt','agora_bdt','competitor_source_evidence','match_status'].join(',')];
for(const p of pilot){csv.push([p.retailer_id,p.name,p.brand,p.meta_price_bdt,p.pack_sizes.map(x=>x.quantity+x.unit).join(' + '),p.source_product_url,'','','','Not collected — retailer feed authorization pending','missing'].map(escape).join(','))}
writeFileSync(resolve(root,'catalog/meta-normalized-2026-11-17.json'),JSON.stringify({source:'Meta snapshot (not current storefront inventory)',generated_at:'2026-11-17',rows},null,2)+'\n');
writeFileSync(resolve(root,'catalog/pilot-25-readiness.csv'),csv.join('\n')+'\n');
// Synthetic-only fixture: identical product title/pack vs wrong pack, validating matcher without fabricated real competitor prices.
const synthetic=pilot.map(p=>{
  const pack=p.pack_sizes[0];
  const local={id:p.retailer_id,name:p.name,sku:p.retailer_id,barcode:null,package_quantity:pack.quantity,package_unit:pack.unit};
  const competitor={competitor_product_id:'retailer:fixture-'+p.retailer_id,competitor_product_url:null,name:p.name,price:1,original_price:null,currency:'BDT',package_quantity:pack.quantity,package_unit:pack.unit,raw_data:{test_only:true}};
  const same=findBestMatch(competitor,[local]);
  const bad={...competitor, name:p.name.replace(/\d+(?:\.\d+)?\s*(kg|g|gm|ml|l|ltr|litre|liter)\b/i,`${pack.quantity*2} ${pack.unit}`),package_quantity:pack.quantity*2};
  const changed=findBestMatch(bad,[local]);
  return {retailer_id:p.retailer_id,exact_match:same.item_id===p.retailer_id,wrong_pack_rejected:changed.item_id===null};
});
const summary={catalog_items:rows.length,unique_ids:productIds.size,reported_user_target:178,unavailable_from_meta:6,with_source_structured_size:rows.filter(x=>x.source_structured_size_present).length,with_deterministically_normalized_pack:rows.filter(x=>x.pack_quality==='normalized').length,requiring_manual_pack_review:rows.filter(x=>x.pack_quality==='manual-review').length,pilot_skus:pilot.length,verified_competitor_prices:0,authorized_competitor_feeds:0,synthetic_exact_matches:synthetic.filter(x=>x.exact_match).length,synthetic_wrong_pack_rejections:synthetic.filter(x=>x.wrong_pack_rejected).length,limitations:['The Meta catalog has no populated structured size fields or manufacturer barcodes.','These 25 are identifiable-pack pilot candidates, not ranked best-sellers.','All competitor price fields are intentionally blank until authorized source evidence is obtained.','Synthetic matcher examples are never competitor price observations.']};
writeFileSync(resolve(root,'catalog/pilot-readiness-report.json'),JSON.stringify({summary,synthetic_fixture_results:synthetic},null,2)+'\n');
if(summary.synthetic_exact_matches!==25||summary.synthetic_wrong_pack_rejections!==25)throw Error('Synthetic matching safety validation failed: '+JSON.stringify(summary));
console.log(JSON.stringify(summary,null,2));
