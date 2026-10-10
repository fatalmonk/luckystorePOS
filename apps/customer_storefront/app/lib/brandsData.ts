import { withLocale, type Locale } from './i18n/config';

export interface BrandDefinition {
  slug: string;
  name: string;
  bengaliName: string;
  searchQuery: string;
  searchQueries?: readonly string[];
  aliases?: readonly string[];
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  badgeEn: string;
  badgeBn: string;
  summaryEn: string;
  summaryBn: string;
  sameAs?: readonly string[];
  logoUrl?: string;
}

export const POPULAR_BRANDS: readonly BrandDefinition[] = [
  {
    slug: 'radhuni',
    name: 'Radhuni',
    bengaliName: 'রাঁধুনী',
    searchQuery: 'Radhuni',
    aliases: ['Radhuni', 'রাঁধুনী', 'Square', 'Radhuni Spices'],
    logoUrl: '/images/brands/radhuni.webp',
    titleEn: 'Radhuni Spices & Cooking Ingredients in Chattogram | Lucky Store',
    titleBn: 'রাঁধুনী মসলা ও রান্নার সামগ্রী চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Buy authentic Radhuni spices, mustard oil & recipe mixes at Lucky Store in Chawkbazar, Chattogram. Same-day delivery with 100% doorstep inspection.',
    descBn: 'চট্টগ্রামের চকবাজারে লাকি স্টোরে আসল রাঁধুনী মসলা, সরিষার তেল ও গুঁড়া মসলা কিনুন। ক্যাশ অন ডেলিভারি ও ডোরস্টেপ চেকিং সুবিধা।',
    badgeEn: 'Pure Spices & Oils',
    badgeBn: 'খাঁটি মসলা ও তেল',
    summaryEn: 'Explore authentic Radhuni ground spices, turmeric, chili, coriander, meat curry mixes, and pure kachi ghani mustard oil delivered same-day in Chattogram.',
    summaryBn: 'রাঁধুনী খাঁটি গুঁড়া মসলা, হলুদ, মরিচ, ধনিয়া, বিরিয়ানি মিক্স ও সরিষার তেল ঘরে বসে অনলাইনে অর্ডার করুন।',
    sameAs: ['https://squaretoiletries.com', 'https://en.wikipedia.org/wiki/Square_Group'],
  },
  {
    slug: 'aarong',
    name: 'Aarong',
    bengaliName: 'আড়ং',
    searchQuery: 'Aarong',
    aliases: ['Aarong', 'Aarong Dairy', 'আড়ং', 'BRAC', 'Aarong Milk'],
    logoUrl: '/images/brands/aarong_dairy.webp',
    titleEn: 'Aarong Dairy, Milk & Pure Ghee in Chattogram | Lucky Store',
    titleBn: 'আড়ং ডেইরি, দুধ ও খাঁটি ঘি চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Shop fresh Aarong liquid milk, standardized milk, yogurt & pure cow milk ghee from Lucky Store in Chattogram. Fast doorstep grocery delivery.',
    descBn: 'চট্টগ্রামে লাকি স্টোর থেকে টাটকা আড়ং তরল দুধ, প্যাকেটজাত দুধ ও খাঁটি গাওয়া ঘি অর্ডার করুন। দ্রুত হোম ডেলিভারি।',
    badgeEn: 'Fresh Dairy & Ghee',
    badgeBn: 'টাটকা ডেইরি ও ঘি',
    summaryEn: 'Wholesome Aarong dairy products including pure cow milk ghee, pasteurized liquid milk, and fresh dairy staples delivered cold to your home.',
    summaryBn: 'আড়ং এর সেরা মানের গাওয়া ঘি ও প্যাকেটজাত খাঁটি তরল দুধ এখন লাকি স্টোরে সহজলভ্য।',
    sameAs: ['https://www.aarong.com', 'https://en.wikipedia.org/wiki/Aarong'],
  },
  {
    slug: 'rupchanda',
    name: 'Rupchanda',
    bengaliName: 'রূপচাঁদা',
    searchQuery: 'Rupchanda',
    aliases: ['Rupchanda', 'রূপচাঁদা', 'BEOL', 'Rupchanda Oil'],
    logoUrl: '/images/brands/rupchanda.webp',
    titleEn: 'Rupchanda Fortified Soybean Oil in Chattogram | Lucky Store',
    titleBn: 'রূপচাঁদা ফর্টিফাইড সয়াবিন তেল চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Check current Rupchanda 1L, 2L & 5L soybean oil prices in Chattogram. Order online from Lucky Store with Cash on Delivery and doorstep inspection.',
    descBn: 'চট্টগ্রামে রূপচাঁদা সয়াবিন তেলের বর্তমান বাজারদর দেখে অনলাইনে অর্ডার করুন। ক্যাশ অন ডেলিভারি ও দ্রুত ডেলিভারি।',
    badgeEn: 'Vitamin A Fortified',
    badgeBn: 'ভিটামিন এ সমৃদ্ধ',
    summaryEn: 'Leading edible oil brand Rupchanda Vitamin A fortified soybean oil and premium mustard oil available at transparent displayed prices.',
    summaryBn: 'রূপচাঁদা ভিটামিন এ সমৃদ্ধ বিশুদ্ধ সয়াবিন তেল ও খাঁটি সরিষার তেল ঘরে বসেই ডেলিভারি নিন।',
    sameAs: ['https://beol-bd.com'],
  },
  {
    slug: 'teer',
    name: 'Teer',
    bengaliName: 'তীর',
    searchQuery: 'Teer',
    aliases: ['Teer', 'তীর', 'City Group', 'Teer Oil', 'Teer Atta'],
    logoUrl: '/images/brands/teer.webp',
    titleEn: 'Teer Soybean Oil, Atta & Essentials in Chattogram | Lucky Store',
    titleBn: 'তীর সয়াবিন তেল, আটা ও ময়দা চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Shop Teer fortified soybean oil, whole wheat atta, maida & suji in Chattogram at displayed bazaar prices from Lucky Store.',
    descBn: 'লাকি স্টোর থেকে তীর সয়াবিন তেল, লাল আটা, ময়দা ও সুজি বর্তমান বাজারদরে ঘরে বসেই অর্ডার করুন।',
    badgeEn: 'Daily Kitchen Staples',
    badgeBn: 'নিত্য প্রয়োজনীয় খাদ্যপণ্য',
    summaryEn: 'High quality Teer fortified cooking oil, premium flour, and baking essentials delivered directly from Chawkbazar.',
    summaryBn: 'তীর ব্যান্ডের ফর্টিফাইড ভোজ্য তেল এবং উন্নত মানের আটা ও ময়দা কিনুন সাশ্রয়ী মূল্যে।',
    sameAs: ['https://citygroup.com.bd'],
  },
  {
    slug: 'fresh',
    name: 'Fresh',
    bengaliName: 'ফ্রেশ',
    searchQuery: 'Fresh',
    aliases: ['Fresh', 'ফ্রেশ', 'Meghna', 'MGI'],
    logoUrl: '/images/brands/fresh.webp',
    titleEn: 'Fresh Sugar, Edible Oil & Pantry in Chattogram | Lucky Store',
    titleBn: 'ফ্রেশ চিনি, তেল ও নিত্যপণ্য চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Buy Fresh refined sugar, pure soybean oil, salt & pantry staples online from Lucky Store in Chawkbazar, Chattogram.',
    descBn: 'চট্টগ্রামের চকবাজারে লাকি স্টোর থেকে ফ্রেশ সাদা চিনি, আয়োডিনযুক্ত লবণ ও ভোজ্য তেল সহজে কিনুন।',
    badgeEn: 'Purity & Quality',
    badgeBn: 'বিশুদ্ধতা ও মান',
    summaryEn: 'Meghna Group Fresh brand refined sugar, iodized salt, cooking oil, and spices delivered to your home.',
    summaryBn: 'ফ্রেশ ব্র্যান্ডের প্যাকেটজাত চিনি, লবণ এবং মসলা ঘরে বসে অনলাইনে অর্ডার করুন।',
    sameAs: ['https://www.mgi.org'],
  },
  {
    slug: 'ispahani',
    name: 'Ispahani',
    bengaliName: 'ইস্পাহানি',
    searchQuery: 'Ispahani',
    aliases: ['Ispahani', 'ইস্পাহানি', 'Ispahani Mirzapore', 'Mirzapore', 'Blender\'s Choice'],
    logoUrl: '/images/brands/ispahani.webp',
    titleEn: 'Ispahani Mirzapore Tea & Blends in Chattogram | Lucky Store',
    titleBn: 'ইস্পাহানি মির্জাপুর চা চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Order fresh Ispahani Mirzapore Best Leaf, Black Tea & Blender\'s Choice from Lucky Store in Chattogram. Same-day local delivery.',
    descBn: 'চট্টগ্রামে আসল ইস্পাহানি মির্জাপুর বেস্ট লিফ ও ব্লেন্ডারস চয়েস চা অনলাইনে কিনুন লাকি স্টোরে।',
    badgeEn: 'Chittagong Heritage Tea',
    badgeBn: 'ঐতিহ্যবাহী সেরা চা',
    summaryEn: 'Bangladesh\'s premier tea brand Ispahani Mirzapore fresh premium tea bags and bulk leaf blends delivered in peak aroma.',
    summaryBn: 'চট্টগ্রামের ঐতিহ্যবাহী ইস্পাহানি মির্জাপুর চা ও প্রিমিয়াম টি ব্যাগ সরাসরি ঘরে পৌঁছে দেওয়া হচ্ছে।',
    sameAs: ['https://www.ispahanibd.com', 'https://en.wikipedia.org/wiki/M._M._Ispahani_Limited'],
  },
  {
    slug: 'polar',
    name: 'Polar',
    bengaliName: 'পোলার',
    searchQuery: 'Polar',
    aliases: ['Polar', 'পোলার', 'Dhaka Ice Cream'],
    logoUrl: '/images/brands/polar.webp',
    titleEn: 'Polar Ice Cream & Frozen Desserts in Chattogram | Lucky Store',
    titleBn: 'পোলার আইসক্রিম ও ফ্রোজেন ডেজার্ট চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Indulge in Polar ice cream tubs, cones, chocobars & kulfi delivered cold to your doorstep in Chawkbazar, Chattogram.',
    descBn: 'চকবাজার ও আশেপাশের এলাকায় পোলার কাপ, কোন, চকবার ও কুলফি আইসক্রিম বরফ শীতল অবস্থায় হোম ডেলিভারি নিন।',
    badgeEn: 'Chilled & Frozen Delivery',
    badgeBn: 'বরফ শীতল ডেলিভারি',
    summaryEn: 'Creamy Polar vanilla, chocolate, mango, and sundae ice cream delivered with proper cold insulation right to your doorstep.',
    summaryBn: 'পোলার ব্র্যান্ডের সুস্বাদু চকবার, কোন এবং ১ লিটার ফ্যামিলি প্যাক আইসক্রিম কিনুন লাকি স্টোরে।',
    sameAs: ['https://polarbd.com'],
  },
  {
    slug: 'igloo',
    name: 'Igloo',
    bengaliName: 'ইগলু',
    searchQuery: 'Igloo',
    logoUrl: '/images/brands/igloo.webp',
    titleEn: 'Igloo Ice Cream & Treats in Chattogram | Lucky Store',
    titleBn: 'ইগলু আইসক্রিম চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Order Igloo ice cream tubs, premium cones, chocobars & sandwiches from Lucky Store in Chattogram. Guaranteed frozen on arrival.',
    descBn: 'লাকি স্টোর থেকে ইগলু প্রিমিয়াম আইসক্রিম, কোন ও কুলফি বরফ জমাট অবস্থায় ঘরে ডেলিভারি পান।',
    badgeEn: 'Pure Dairy Ice Cream',
    badgeBn: 'খাঁটি ডেইরি আইসক্রিম',
    summaryEn: 'Rich Igloo ice cream varieties perfect for hot afternoons and family desserts, delivered fast within 1 km.',
    summaryBn: 'ইগলু আইসক্রিমের হরেক রকমের স্বাদ ও ফ্যামিলি প্যাক অনলাইনে অর্ডার করুন।',
    sameAs: ['https://igloobd.com'],
  },
  {
    slug: 'nestle',
    name: 'Nestlé',
    bengaliName: 'নেসলে',
    searchQuery: 'Nestle',
    aliases: ['Nestle', 'Nestlé', 'নেসলে', 'Nescafé', 'Nescafe', 'Maggi', 'KitKat', 'Nido', 'Milo', 'Koko Crunch', 'Coffee Mate', 'Cerelac'],
    logoUrl: '/images/brands/nestle.webp',
    titleEn: 'Nestlé, Maggi & Nescafé in Chattogram | Lucky Store',
    titleBn: 'নেসলে, ম্যাগি ও নেসক্যাফে চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Shop Maggi 2-Minute Noodles, Nescafé Classic Coffee, Nido Milk & KitKat from Lucky Store in Chattogram with Cash on Delivery.',
    descBn: 'চট্টগ্রামের চকবাজারে লাকি স্টোর থেকে ম্যাগি নুডলস, নেসক্যাফে কফি, নিডো দুধ ও কিটক্যাট কিনুন।',
    badgeEn: 'Global Nutrition & Taste',
    badgeBn: 'সেরা স্বাদ ও পুষ্টি',
    summaryEn: 'Original Nestlé groceries: Maggi noodles and masala, Nescafé rich coffee, Coffee-Mate, and Nido fortified milk powder.',
    summaryBn: 'আসল ম্যাগি নুডলস, নেসক্যাফে কফি ও নিডো দুধ ঘরে বসেই দ্রুত ডেলিভারি পান।',
    sameAs: ['https://www.nestle.com.bd', 'https://en.wikipedia.org/wiki/Nestl%C3%A9'],
  },
  {
    slug: 'pran',
    name: 'Pran',
    bengaliName: 'প্রাণ',
    searchQuery: 'Pran',
    aliases: ['Pran', 'প্রাণ', 'Pran Foods', 'PRAN-RFL'],
    logoUrl: '/images/brands/pran.webp',
    titleEn: 'Pran Spices, Snacks & Pantry Foods in Chattogram | Lucky Store',
    titleBn: 'প্রাণ মসলা, স্ন্যাক্স ও খাদ্যপণ্য চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Browse Pran spices, biscuits, toast, drinks & culinary staples online at Lucky Store in Chawkbazar, Chattogram.',
    descBn: 'প্রাণ ব্র্যান্ডের মসলা, টোস্ট বিস্কুট, চানাচুর ও জুস লাকি স্টোর থেকে অনলাইনে অর্ডার করুন।',
    badgeEn: 'Household Favorites',
    badgeBn: 'জনপ্রিয় খাদ্যপণ্য',
    summaryEn: 'Everyday pantry and snacking options from Pran, delivered swiftly across the Chawkbazar neighborhood.',
    summaryBn: 'প্রাণ এর হরেক রকমের শুকনো খাবার, মসলা ও ডেইরি আইটেম সহজে কিনুন।',
    sameAs: ['https://www.pranfoods.net', 'https://en.wikipedia.org/wiki/PRAN-RFL_Group'],
  },
  {
    slug: 'dove',
    name: 'Dove',
    bengaliName: 'ডাভ',
    searchQuery: 'Dove',
    aliases: ['Dove', 'ডাভ', 'Dove Beauty Bar'],
    logoUrl: '/images/brands/dove.webp',
    titleEn: 'Dove Beauty Bars, Shampoos & Care in Chattogram | Lucky Store',
    titleBn: 'ডাভ বিউটি বার, শ্যাম্পু ও প্রসাধন চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Shop genuine Dove moisturizing beauty bars, intense repair shampoos & conditioners in Chattogram from Lucky Store.',
    descBn: 'আসল ডাভ ময়েশ্চারাইজিং সাবান, শ্যাম্পু ও কন্ডিশনার লাকি স্টোরে ঘরে বসেই অর্ডার করুন।',
    badgeEn: 'Gentle Moisturizing Care',
    badgeBn: 'কোমল ত্বকের যত্ন',
    summaryEn: 'Authentic Dove gentle skin cleansing bars and hair care products with 1/4 moisturizing cream.',
    summaryBn: 'ডাভ বিউটি বার এবং হেয়ার কেয়ার পণ্য ডোরস্টেপ চেকিং এর সুবিধাসহ ডেলিভারি নিন।',
    sameAs: ['https://www.unilever.com.bd', 'https://en.wikipedia.org/wiki/Dove_(toiletries)'],
  },
  {
    slug: 'lux',
    name: 'Lux',
    bengaliName: 'লাক্স',
    searchQuery: 'Lux',
    aliases: ['Lux', 'লাক্স', 'Lux Soap'],
    logoUrl: '/images/brands/lux.webp',
    titleEn: 'Lux Fragrant Beauty Soap in Chattogram | Lucky Store',
    titleBn: 'লাক্স সুগন্ধি সাবান চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Order Lux beauty soap bars & body washes with floral fragrances from Lucky Store in Chattogram. Same-day delivery.',
    descBn: 'লাক্স সুবাসিত গ্লিসারিন ও পারফিউম সাবান লাকি স্টোর থেকে অনলাইনে কিনুন।',
    badgeEn: 'Floral Fragrance Soaps',
    badgeBn: 'সুগন্ধি রূপচর্চা',
    summaryEn: 'Lux beauty soap bars with essential oils and floral infusions for daily refreshing skincare.',
    summaryBn: 'লাক্স বিউটি সাবানের বিভিন্ন ভ্যারিয়েন্ট ঘরে বসেই অর্ডার করুন।',
    sameAs: ['https://www.unilever.com.bd', 'https://en.wikipedia.org/wiki/Lux_(soap)'],
  },
  {
    slug: 'sunsilk',
    name: 'Sunsilk',
    bengaliName: 'সানসিল্ক',
    searchQuery: 'Sunsilk',
    aliases: ['Sunsilk', 'সানসিল্ক'],
    logoUrl: '/images/brands/sunsilk.webp',
    titleEn: 'Sunsilk Shampoos & Hair Conditioners in Chattogram | Lucky Store',
    titleBn: 'সানসিল্ক শ্যাম্পু ও হেয়ার কেয়ার চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Buy Sunsilk Black Shine, Thick & Long, and Hairfall Solution shampoos in Chattogram from Lucky Store.',
    descBn: 'সানসিল্ক ব্ল্যাক শাইন এবং হেয়ারফল সল্যুশন শ্যাম্পু চকবাজার লাকি স্টোরে সহজলভ্য।',
    badgeEn: 'Hair Care Solutions',
    badgeBn: 'চুলের যত্ন',
    summaryEn: 'Popular Sunsilk shampoos and hair nourishing solutions available in multiple bottle sizes.',
    summaryBn: 'সানসিল্ক ব্র্যান্ডের শ্যাম্পুর বিভিন্ন সাইজ ঘরে বসেই ডেলিভারি নিন।',
    sameAs: ['https://www.unilever.com.bd', 'https://en.wikipedia.org/wiki/Sunsilk'],
  },
  {
    slug: 'dettol',
    name: 'Dettol',
    bengaliName: 'ডেটল',
    searchQuery: 'Dettol',
    aliases: ['Dettol', 'ডেটল', 'Reckitt', 'Reckitt Benckiser'],
    logoUrl: '/images/brands/dettol.webp',
    titleEn: 'Dettol Antiseptic, Soap & Hygiene in Chattogram | Lucky Store',
    titleBn: 'ডেটল অ্যান্টিসেপ্টিক ও সাবান চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Keep your home protected with Dettol antiseptic liquid, hand wash & soap bars from Lucky Store in Chattogram.',
    descBn: 'আসল ডেটল অ্যান্টিসেপটিক লিকুইড, হ্যান্ডওয়াশ ও সাবান লাকি স্টোরে কিনুন।',
    badgeEn: 'Germ Protection',
    badgeBn: 'জীবাণু সুরক্ষা',
    summaryEn: 'Trusted Dettol personal protection and hygiene supplies for families in Chawkbazar.',
    summaryBn: 'পরিবারের সুরক্ষায় ডেটল লিকুইড এবং সাবান অনলাইনে অর্ডার করুন।',
    sameAs: ['https://www.reckitt.com', 'https://en.wikipedia.org/wiki/Dettol'],
  },
  {
    slug: 'bashundhara',
    name: 'Bashundhara',
    bengaliName: 'বসুন্ধরা',
    searchQuery: 'Bashundhara',
    aliases: ['Bashundhara', 'বসুন্ধরা', 'Bashundhara Tissue'],
    logoUrl: '/images/brands/bashundhara.webp',
    titleEn: 'Bashundhara Tissue & Household Paper in Chattogram | Lucky Store',
    titleBn: 'বসুন্ধরা টিস্যু ও পেপার পণ্য চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Order Bashundhara facial tissue, toilet tissue, kitchen towels & napkins from Lucky Store in Chattogram.',
    descBn: 'বসুন্ধরা ফেসিয়াল টিস্যু, টয়লেট রোল ও কিচেন টাওয়েল সাশ্রয়ী মূল্যে ঘরে বসেই পান।',
    badgeEn: 'Soft & Hygienic Paper',
    badgeBn: 'কোমল ও স্বাস্থ্যকর পেপার',
    summaryEn: 'Bashundhara hygienic paper products and daily household cleaning paper delivered straight to your door.',
    summaryBn: 'বসুন্ধরা টিস্যু পেপারের যাবতীয় সাইজ ও ভ্যারাইটি ঘরে বসেই ডেলিভারি নিন।',
    sameAs: ['https://bashundharagroup.com', 'https://en.wikipedia.org/wiki/Bashundhara_Group'],
  },
  {
    slug: 'olympic',
    name: 'Olympic',
    bengaliName: 'অলিম্পিক',
    searchQuery: 'Olympic',
    aliases: ['Olympic', 'অলিম্পিক', 'Olympic Biscuits', 'Olympic Industries'],
    logoUrl: '/images/brands/olympic.webp',
    titleEn: 'Olympic Biscuits, Cookies & Bakery in Chattogram | Lucky Store',
    titleBn: 'অলিম্পিক বিস্কুট ও ড্রাই কেক চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Shop Olympic Energy Plus, Nutty, Tip & dry cake snacks online from Lucky Store in Chawkbazar, Chattogram.',
    descBn: 'অলিম্পিক এনার্জি প্লাস, কুকিজ ও চানাচুর লাকি স্টোর থেকে অনলাইনে অর্ডার করুন।',
    badgeEn: 'Crispy Tea-Time Biscuits',
    badgeBn: 'চায়ের আড্ডার বিস্কুট',
    summaryEn: 'Olympic crispy biscuits and tea-time bakery treats available in fresh stock.',
    summaryBn: 'অলিম্পিক বিস্কুট ও হালকা নাস্তার সেরা আইটেম অনলাইনে সহজে কিনুন।',
    sameAs: ['https://olympicbd.com', 'https://en.wikipedia.org/wiki/Olympic_Industries'],
  },
  {
    slug: 'fortune',
    name: 'Fortune',
    bengaliName: 'ফরচুন',
    searchQuery: 'Fortune',
    aliases: ['Fortune', 'ফরচুন', 'Adani Wilmar', 'Fortune Oil'],
    logoUrl: '/images/brands/fortune.webp',
    titleEn: 'Fortune Foods & Specialty Products in Chattogram | Lucky Store',
    titleBn: 'ফরচুন ফুডস ও স্পেশাল পণ্য চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Order Fortune culinary products and Fortune Cookies from Lucky Store in Chawkbazar, Chattogram.',
    descBn: 'লাকি স্টোর থেকে ফরচুন পণ্য ও ফরচুন কুকিজ অনলাইনে কিনুন। দ্রুত হোম ডেলিভারি।',
    badgeEn: 'Premium Quality Foods',
    badgeBn: 'উন্নত মানের খাবার',
    summaryEn: 'Premium Fortune food products and localized fortune treats backed by doorstep verification.',
    summaryBn: 'ফরচুন ফুডস এবং ফ্রেশ পণ্যের কালেকশন লাকি স্টোরে সহজলভ্য।',
    sameAs: ['https://beol-bd.com'],
  },
  {
    slug: 'cadbury',
    name: 'Cadbury',
    bengaliName: 'ক্যাডবেরি',
    searchQuery: 'Cadbury',
    aliases: ['Cadbury', 'ক্যাডবেরি', 'Dairy Milk', 'Cadbury Dairy Milk', 'Mondelez'],
    logoUrl: '/images/brands/cadbury.webp',
    titleEn: 'Cadbury Dairy Milk & Chocolates in Chattogram | Lucky Store',
    titleBn: 'ক্যাডবেরি ডেইরি মিল্ক ও চকলেট চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Buy original Cadbury Dairy Milk, Bubbly, Crispello, Fuse & Oreo chocolates at Lucky Store in Chawkbazar, Chattogram. 100% doorstep inspection.',
    descBn: 'আসল ক্যাডবেরি ডেইরি মিল্ক, বাবলি ও চকলেট বার লাকি স্টোরে অনলাইনে অর্ডার করুন। ক্যাশ অন ডেলিভারি ও ডোরস্টেপ চেকিং সুবিধা।',
    badgeEn: 'Chocolates & Confectionery',
    badgeBn: 'চকলেট ও মিষ্টি কনফেকশনারি',
    summaryEn: 'Indulge in authentic Cadbury Dairy Milk chocolate bars, Bubbly, Crispello, Fuse, and cocoa treats delivered fresh to your doorstep in Chattogram.',
    summaryBn: 'ক্যাডবেরি ডেইরি মিল্ক, বাবলি, সিল্ক এবং ক্রিসপেলো সহ সেরা স্বাদের আসল চকলেট দ্রুত হোম ডেলিভারি নিন।',
    sameAs: ['https://www.cadbury.co.uk', 'https://en.wikipedia.org/wiki/Cadbury'],
  },
  {
    slug: 'abul-khair',
    name: 'Abul Khair',
    bengaliName: 'আবুল খায়ের',
    searchQuery: 'Marks',
    searchQueries: ['Marks', 'Seylon', 'Starship', 'AMA', 'Coffee Bite'],
    aliases: [
      'Abul Khair',
      'আবুল খায়ের',
      'Abul Khair Group',
      'AKG',
      'Marks',
      'Marks Milk',
      'AMA',
      'Ama',
      'Seylon',
      'Seylon Tea',
      'Starship',
      'Coffee Bite',
    ],
    logoUrl: '/images/brands/abul_khair.webp',
    titleEn: 'Abul Khair Group Products in Chattogram | Marks, Seylon & Starship',
    titleBn: 'আবুল খায়ের গ্রুপের পণ্য চট্টগ্রাম | মার্কস, সিলন ও স্টারশিপ',
    descEn: 'Buy authentic Abul Khair products: Marks Milk Powder, Seylon Tea, Starship Milk & Coffee Bite at Lucky Store in Chawkbazar, Chattogram. 100% doorstep inspection.',
    descBn: 'চট্টগ্রামের চকবাজারে লাকি স্টোরে আসল মার্কস মিল্ক পাউডার, সিলন চা, স্টারশিপ ও আবুল খায়ের পণ্য অর্ডার করুন। ডোরস্টেপ চেকিং ও ক্যাশ অন ডেলিভারি।',
    badgeEn: 'Dairy, Tea & Beverages',
    badgeBn: 'দুধ, চা ও পানীয়',
    summaryEn: 'Chattogram-headquartered conglomerate powerhouse behind Marks Full Cream Milk Powder, AMA, Seylon Tea, Starship milkshakes, and Coffee Bite confectionery.',
    summaryBn: 'চট্টগ্রামের ঐতিহ্যবাহী আবুল খায়ের গ্রুপের সেরা পণ্য: মার্কস ফুল ক্রিম মিল্ক পাউডার, সিলন চা, স্টারশিপ মিল্ক ও কফি বাইট সহজে কিনুন।',
    sameAs: ['https://www.abulkhairgroup.com', 'https://en.wikipedia.org/wiki/Abul_Khair_Group'],
  },
  {
    slug: 'arla',
    name: 'Arla',
    bengaliName: 'আরলা',
    searchQuery: 'Dano',
    searchQueries: ['Dano', 'Arla'],
    aliases: [
      'Arla',
      'আরলা',
      'Arla Foods',
      'Dano',
      'ডানো',
      'Dano Power',
      'Dano Delight',
      'Dano Daily Pushti',
    ],
    logoUrl: '/images/brands/arla.webp',
    titleEn: 'Arla Dano Milk Powder & Dairy in Chattogram | Lucky Store',
    titleBn: 'আরলা ডানো মিল্ক পাউডার ও ডেইরি চট্টগ্রাম | লাকি স্টোর',
    descEn: 'Buy genuine Arla Dano Power, Dano Delight & Dano Daily Pushti milk powder online at Lucky Store in Chawkbazar, Chattogram. 100% doorstep inspection.',
    descBn: 'আসল আরলা ডানো পাওয়ার, ডানো ডিলাইট ও ডানো ডেইলি পুষ্টি মিল্ক পাউডার লাকি স্টোর থেকে কিনুন। ক্যাশ অন ডেলিভারি ও ডোরস্টেপ চেকিং সুবিধা।',
    badgeEn: 'Nutritious Dairy & Milk',
    badgeBn: 'পুষ্টিকর ডেইরি ও দুধ',
    summaryEn: 'European cooperative dairy giant Arla Foods, trusted manufacturer of Dano Power full cream milk powder, Dano Delight, and Dano Daily Pushti.',
    summaryBn: 'ইউরোপীয় বিশ্বখ্যাত ডেইরি ব্র্যান্ড আরলা ফুডস এর ডানো পাওয়ার ফুল ক্রিম মিল্ক পাউডার, ডানো ডিলাইট ও ডেইলি পুষ্টি এখন লাকি স্টোরে।',
    sameAs: ['https://www.arlafoods.com.bd', 'https://en.wikipedia.org/wiki/Arla_Foods'],
  },
  {
    slug: 'new-zealand-dairy',
    name: 'New Zealand Dairy',
    bengaliName: 'নিউজিল্যান্ড ডেইরি',
    searchQuery: 'Diploma',
    searchQueries: ['Diploma', 'BelleAme', 'Doodles', 'Detos', 'Red Cow', 'Happy Cow', 'Toi-Moi'],
    aliases: [
      'New Zealand Dairy',
      'নিউজিল্যান্ড ডেইরি',
      'NZ Dairy',
      'Diploma',
      'ডিপ্লোমা',
      'Happy Cow',
      'Red Cow',
      'Red Cow Butter Oil',
      'Doodles',
      'Doodles Noodles',
      'Doodles Korean Ramen',
      'Detos',
      'Toi-Moi',
      'BelleAme',
      'Belle Ame',
      'Bellame',
    ],
    logoUrl: '/images/brands/newzealand_dairy.webp',
    titleEn: 'New Zealand Dairy Products in Chattogram | Diploma, Red Cow & BelleAme',
    titleBn: 'নিউজিল্যান্ড ডেইরি পণ্য চট্টগ্রাম | ডিপ্লোমা, রেড কাউ ও বেলামে',
    descEn: 'Buy genuine New Zealand Dairy products: Diploma milk powder, Red Cow butter oil, Doodles noodles & BelleAme biscuits online at Lucky Store in Chattogram. 100% doorstep inspection.',
    descBn: 'আসল ডিপ্লোমা দুধ, রেড কাউ বাটার অয়েল, ডুডলস নুডলস ও বেলামে বিস্কুট লাকি স্টোর থেকে ঘরে বসেই অর্ডার করুন। ডোরস্টেপ চেকিং ও দ্রুত ডেলিভারি।',
    badgeEn: 'Dairy, Bakery & Snacks',
    badgeBn: 'দুধ, বেকারি ও স্ন্যাক্স',
    summaryEn: 'Premier food & dairy enterprise producing Diploma Milk Powder, Red Cow Butter Oil, Doodles Noodles, Detos, and premium BelleAme bakery biscuits.',
    summaryBn: 'নিউজিল্যান্ড ডেইরি বাংলাদেশের জনপ্রিয় ব্র্যান্ড: ডিপ্লোমা মিল্ক পাউডার, রেড কাউ বাটার অয়েল, ডুডলস নুডলস ও বেলামে বিস্কুট সহজে কিনুন।',
    sameAs: ['https://www.newzealanddairybd.com', 'https://www.newzealanddairybd.com/brands'],
  },
] as const;

export function getBrandBySlug(slug: string): BrandDefinition | undefined {
  const norm = slug.toLowerCase().trim();
  return POPULAR_BRANDS.find((b) => b.slug === norm);
}

export function getAllBrandSlugs(): string[] {
  return POPULAR_BRANDS.map((b) => b.slug);
}

export function isProductOfBrand(
  product: { brand?: string; name?: string },
  brand: BrandDefinition
): boolean {
  const pBrand = typeof product.brand === 'string' ? product.brand.trim() : '';
  if (!pBrand) return false;

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const targetNorm = normalize(brand.name);
  const pBrandNorm = normalize(pBrand);

  if (pBrandNorm === targetNorm) return true;

  if (brand.aliases && brand.aliases.some((alias) => normalize(alias) === pBrandNorm)) {
    return true;
  }

  return false;
}

export function getBrandByName(brandName?: string): BrandDefinition | undefined {
  if (!brandName || typeof brandName !== 'string') return undefined;
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const targetNorm = normalize(brandName);

  // 1. Exact match on name, bengaliName, slug, or alias
  const exact = POPULAR_BRANDS.find((b) => {
    if (normalize(b.name) === targetNorm) return true;
    if (normalize(b.bengaliName) === targetNorm) return true;
    if (b.slug === targetNorm) return true;
    if (b.aliases && b.aliases.some((alias) => normalize(alias) === targetNorm)) {
      return true;
    }
    return false;
  });
  if (exact) return exact;

  // 2. Contiguous token sequence / word-boundary match (e.g. "Ispahani Tea Ltd" contains "Ispahani", "New Zealand Dairy Ltd" contains "New Zealand Dairy")
  const tokenMatch = POPULAR_BRANDS.find((b) => {
    const brandNameNorm = normalize(b.name);
    const escaped = brandNameNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    return regex.test(targetNorm);
  });
  if (tokenMatch) return tokenMatch;

  return undefined;
}

export function getBrandHref(brandName?: string, locale: Locale = 'en'): string {
  const brand = getBrandByName(brandName);
  if (brand) {
    return withLocale(`/brand/${brand.slug}`, locale);
  }
  return withLocale('/brand', locale);
}
