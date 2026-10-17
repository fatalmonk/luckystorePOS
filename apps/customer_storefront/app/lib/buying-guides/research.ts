import type { BuyingGuide } from './model';
import { toProductSlug } from '../products/slugify';

// Exact anonymous public-catalogue observations on 2026-10-15. These are research
// records, not approval, packaging verification, health advice or national rankings.
const checkedAt = '2026-10-15T14:37:00Z';
function reviewGuide(input: {
  slug: string; title: string; category: BuyingGuide['category'];
  products: { id: string; name: string; amount: number; unit?: 'g' | 'ml' }[];
  criteria: string[];
  checkedAt?: string;
}): BuyingGuide {
  const evidence: BuyingGuide['evidence'] = {
    method: { title: 'Lucky Store comparison and disclosure policy', url: 'https://www.luckystore1947.com/best/editorial', checkedAt },
  };
  const fact = (text: string, ref = 'method') => ({ text, evidence: [ref] });
  const unit = input.products[0].unit ?? 'g';
  const products = input.products.map(p => {
    evidence[p.id] = { title: `Catalogue declaration: ${p.name}`, url: `https://www.luckystore1947.com/product/${toProductSlug(p.name, p.id)}`, checkedAt: input.checkedAt ?? checkedAt };
    return { id: p.id, verifiedName: p.name,
      quantity: { value: p.amount, unit: p.unit ?? 'g', evidence: p.id },
      description: fact(`The catalogue lists this product as ${p.name}. Confirm the label before purchasing.`, p.id),
      useCase: fact(`Comparing a catalogue-declared ${p.amount}${p.unit ?? 'g'} pack with other available pack sizes.`, p.id) };
  });
  return {
    slug: input.slug, title: input.title, state: 'review', revision: 1, mode: 'unranked',
    category: input.category, products, evidence, relatedSlugs: [],
    description: `Compare selected ${input.category.name.toLowerCase()} at Lucky Store by pack size, current price and availability.`,
    introduction: 'Start with the pack size and current price, then check the label and availability. This is an unranked comparison of selected Lucky Store products; it does not identify an overall best product in Bangladesh.',
    definition: fact('This comparison uses exact catalogue products and declared pack quantities. Different names or pack sizes are not evidence of equivalent ingredients, nutrition, taste or suitability.'),
    takeaways: [fact(`Compare price per 100${unit} as well as the total pack price.`), fact('Use the declared pack size to compare equal quantities.'), fact('Check current availability before choosing.'), fact('Read the product label for ingredients and intended use.'), fact('Check delivery eligibility before placing an order.')],
    methodology: fact(`We compare four observable fields: declared pack quantity, current pack price, calculated price per 100${unit}, and current stock availability. Products are listed in a fixed editorial order, not ranked for taste, health or nutritional quality. Catalogue names are the current quantity source; packaging checks and final editorial approval remain required before publication.`),
    criteria: input.criteria.map(label => ({ label, explanation: fact(`We compare ${label.toLowerCase()} only from the cited catalogue record or a reviewed package declaration.`) })),
    faqs: [
      { question: 'How do I compare different pack sizes?', answer: fact(`Divide pack price by its declared quantity in ${unit} and multiply by 100. Compare the resulting price per 100${unit} alongside the total pack cost.`) },
      { question: `What does the price per 100${unit} mean?`, answer: fact('It is a calculation from the current catalogue price and verified quantity. It does not measure taste, nutritional quality or suitability.') },
      { question: 'How should I choose a pack size?', answer: fact('Compare the pack quantity and total price against the amount you intend to buy. Check the label before choosing.') },
      { question: 'What happens when a product is unavailable?', answer: fact('We mark it as unavailable and do not present an unqualified shopping recommendation. Browse the category for current alternatives.') },
      { question: 'How were these products ranked?', answer: fact('They are not ranked. This guide compares selected catalogue products without assigning an overall winner.') },
      { question: 'What should I check before ordering?', answer: fact('Check the product page, pack label, current availability and delivery information. Prices and stock may change before checkout.') },
    ],
  };
}

const biscuitsGuide = reviewGuide({ slug: 'biscuits-bangladesh', title: 'Olympic biscuits at Lucky Store: compare three pack options',
  category: { id: 'f17d879c-9f74-49bc-969d-d62e03a07fc1', slug: 'biscuits-and-cookies', name: 'Biscuits & Cookies' },
  criteria: ['Product type', 'Declared net weight', 'Current price', 'Availability'],
  products: [
    { id: 'd0bdf0ae-dd95-4ea7-9a40-fdc8f3f7ce00', name: 'Olympic Energy Plus Biscuits 150g', amount: 150 },
    { id: 'a1bbc055-f184-43fb-b27f-ae68cea81e3b', name: 'Olympic Energy Plus Biscuits Family Pack 300g', amount: 300 },
    { id: 'edc4a1c5-34cb-4581-9daa-75b92a3df8cf', name: 'Olympic Milk Marie Biscuits 250g', amount: 250 },
  ] });

biscuitsGuide.description = 'Compare two Olympic Energy Plus pack sizes with an Olympic Milk Marie pack using current Lucky Store prices, unit prices, and sellable stock.';
biscuitsGuide.introduction = 'This unranked guide compares three Olympic biscuit packs currently recorded by Lucky Store: Energy Plus in 150g and 300g packs, and Milk Marie in a 250g pack. It helps shoppers compare upfront price, declared net weight, price per 100g, and current availability; it does not claim a taste, nutrition, or overall market winner.';
biscuitsGuide.definition = { text: 'The shortlist contains two pack sizes of the same Energy Plus catalogue line and one differently named Milk Marie catalogue line. Pack name and weight establish what is being compared; they do not establish equivalent ingredients, taste, or nutritional value.', evidence: biscuitsGuide.products.map(product => product.id) };
biscuitsGuide.takeaways = [
  { text: 'Energy Plus appears in both 150g and 300g catalogue packs, so compare total spend and price per 100g before choosing a size.', evidence: [biscuitsGuide.products[0].id, biscuitsGuide.products[1].id] },
  { text: 'Milk Marie is a separately named 250g catalogue product and should not be treated as the same biscuit simply because the pack weight sits between the Energy Plus sizes.', evidence: [biscuitsGuide.products[2].id] },
  { text: 'Current price and sellable stock come from the live Lucky Store catalogue and can change before checkout.', evidence: ['method'] },
  { text: 'The shortlist covers three Lucky Store products from one brand, not every biscuit sold in Bangladesh.', evidence: biscuitsGuide.products.map(product => product.id) },
  { text: 'Check the physical package label for ingredients, allergens, and manufacturer declarations before ordering.', evidence: ['method'] },
];
biscuitsGuide.methodology = { text: 'We selected three exact Olympic catalogue IDs already under editorial review. We compare the declared net weight recorded in each catalogue name, current selling price, calculated price per 100g, and reservation-aware sellable stock. The order is unranked. No score is assigned for taste, nutrition, ingredients, popularity, or national market standing because those claims were not independently verified.', evidence: ['method', ...biscuitsGuide.products.map(product => product.id)] };
biscuitsGuide.products[0].description = { text: 'The 150g Energy Plus record is the smaller of the two Energy Plus packs in this shortlist.', evidence: [biscuitsGuide.products[0].id, biscuitsGuide.products[1].id] };
biscuitsGuide.products[0].useCase = { text: 'Consider when you want the lower declared Energy Plus pack quantity and prefer a smaller upfront purchase.', evidence: [biscuitsGuide.products[0].id] };
biscuitsGuide.products[1].description = { text: 'The 300g Energy Plus Family Pack record contains twice the declared weight of the 150g Energy Plus record.', evidence: [biscuitsGuide.products[0].id, biscuitsGuide.products[1].id] };
biscuitsGuide.products[1].useCase = { text: 'Consider when you intend to buy the larger Energy Plus pack and have compared its current price per 100g.', evidence: [biscuitsGuide.products[1].id] };
biscuitsGuide.products[2].description = { text: 'The 250g Milk Marie record is a differently named Olympic biscuit line, not another Energy Plus pack size.', evidence: [biscuitsGuide.products[2].id] };
biscuitsGuide.products[2].useCase = { text: 'Consider only if the Milk Marie product identity and 250g declared pack match what you intend to order.', evidence: [biscuitsGuide.products[2].id] };

export const REVIEW_GUIDES: readonly BuyingGuide[] = [
  biscuitsGuide,
  reviewGuide({ slug: 'milk-powder-bangladesh', title: 'Milk powder in Bangladesh: compare selected full-cream packs',
    category: { id: '9fbe1ff0-575b-483c-b276-19bd9be03ba8', slug: 'dairy-and-eggs', name: 'Dairy & Eggs' },
    criteria: ['Declared product type', 'Pack size', 'Current price', 'Availability'],
    products: [
      { id: '30559d5c-638d-421a-adf5-8f9929db2c3f', name: 'Diploma Instant Full Cream Milk Powder 1 kg', amount: 1000 },
      { id: '6cc6a653-0e68-4792-9cad-0cd45ecfef00', name: 'Diploma Instant Full Cream Milk Powder 200 g', amount: 200 },
      { id: '95c86e99-34c8-4ed3-823d-2ca8446fdbd9', name: 'Diploma Instant Full Cream Milk Powder 500 g', amount: 500 },
    ] }),
  reviewGuide({ slug: 'ice-cream-bangladesh', title: 'Ice cream in Bangladesh: compare selected tubs and pack sizes',
    checkedAt: '2026-10-15T14:49:00Z',
    category: { id: '790dcc72-87ac-4635-a6c2-c0e2bd0c664e', slug: 'ice-cream', name: 'Ice-Cream' },
    criteria: ['Flavour', 'Declared volume', 'Current price', 'Availability'],
    products: [
      { id: '08dc7fe1-7717-4a82-abaf-b903c16da996', name: 'Igloo Chocolate (1/2 L)', amount: 500, unit: 'ml' },
      { id: '4c016973-cb67-4227-9db8-f5fe5b112822', name: 'Igloo Chocolate 1 L', amount: 1000, unit: 'ml' },
      { id: '141eec92-9937-46a2-9d42-88e301db6ec2', name: 'Igloo Vanilla 1 L', amount: 1000, unit: 'ml' },
    ] }),
];
