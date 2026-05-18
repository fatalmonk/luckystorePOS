// Demo products for "Try Without Account" mode
// 50 common Bangladeshi SKUs with realistic retail pricing

class DemoProduct {
  final String id;
  final String name;
  final String category;
  final double price;
  final String unit;
  final String icon;
  final String? barcode;

  const DemoProduct({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.unit,
    required this.icon,
    this.barcode,
  });
}

// Top 20 favorites by typical sales velocity
const List<DemoProduct> demoFavorites = [
  DemoProduct(id: 'R01', name: 'চাল (Miniket)', category: 'rice', price: 75, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'O01', name: 'সয়াবিন তেল', category: 'oil', price: 165, unit: 'L', icon: '🛢️'),
  DemoProduct(id: 'L01', name: 'মসুর ডাল', category: 'lentils', price: 140, unit: 'kg', icon: '🥘'),
  DemoProduct(id: 'S01', name: 'লক্স সাবান', category: 'soap', price: 45, unit: 'pc', icon: '🧼'),
  DemoProduct(id: 'B01', name: 'বিস্কুট (Olympic)', category: 'biscuits', price: 15, unit: 'pc', icon: '🍪'),
  DemoProduct(id: 'T01', name: 'তাজা চা', category: 'tea', price: 120, unit: '200g', icon: '🍵'),
  DemoProduct(id: 'D01', name: 'হুইল ডিটারজেন্ট', category: 'detergent', price: 65, unit: '500g', icon: '🧴'),
  DemoProduct(id: 'R02', name: 'চিনিগুড়া চাল', category: 'rice', price: 95, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'X01', name: 'এসি লবণ', category: 'salt', price: 35, unit: 'kg', icon: '🧂'),
  DemoProduct(id: 'X02', name: 'ফ্রেশ চিনি', category: 'sugar', price: 78, unit: 'kg', icon: '🍬'),
  DemoProduct(id: 'M01', name: 'পাউডার দুধ', category: 'dairy', price: 450, unit: '400g', icon: '🥛'),
  DemoProduct(id: 'S02', name: 'লাইফবয় সাবান', category: 'soap', price: 35, unit: 'pc', icon: '🧼'),
  DemoProduct(id: 'N01', name: 'নুডুলস (Maggi)', category: 'noodles', price: 20, unit: 'pc', icon: '🍜'),
  DemoProduct(id: 'O02', name: 'সরিষার তেল', category: 'oil', price: 180, unit: 'L', icon: '🛢️'),
  DemoProduct(id: 'C01', name: 'কোকা-কোলা', category: 'drinks', price: 90, unit: '1.25L', icon: '🥤'),
  DemoProduct(id: 'R03', name: 'নাজিরশাইল চাল', category: 'rice', price: 85, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'E01', name: 'প্রাণ চানাচুর', category: 'snacks', price: 25, unit: 'pc', icon: '🥜'),
  DemoProduct(id: 'B02', name: 'মেরি বিস্কুট', category: 'biscuits', price: 20, unit: 'pc', icon: '🍪'),
  DemoProduct(id: 'T02', name: 'ব্রুক বন্ড', category: 'tea', price: 110, unit: '200g', icon: '🍵'),
  DemoProduct(id: 'S03', name: 'সেফগার্ড সাবান', category: 'soap', price: 55, unit: 'pc', icon: '🧼'),
];

// All 50 demo products
const List<DemoProduct> demoProducts = [
  // Rice (10)
  DemoProduct(id: 'R01', name: 'চাল (Miniket)', category: 'rice', price: 75, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'R02', name: 'চিনিগুড়া চাল', category: 'rice', price: 95, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'R03', name: 'নাজিরশাইল চাল', category: 'rice', price: 85, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'R04', name: 'কাঠারীভোগ চাল', category: 'rice', price: 70, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'R05', name: 'বাসমতী চাল', category: 'rice', price: 180, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'R06', name: 'পাজাম চাল', category: 'rice', price: 65, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'R07', name: 'ব্রিজল চাল', category: 'rice', price: 58, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'R08', name: 'আটাশ চাল', category: 'rice', price: 52, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'R09', name: 'সোনা ময়ূর চাল', category: 'rice', price: 72, unit: 'kg', icon: '🍚'),
  DemoProduct(id: 'R10', name: 'মিনিকেট 5kg', category: 'rice', price: 320, unit: 'bag', icon: '🍚'),

  // Lentils (5)
  DemoProduct(id: 'L01', name: 'মসুর ডাল', category: 'lentils', price: 140, unit: 'kg', icon: '🥘'),
  DemoProduct(id: 'L02', name: 'মুগ ডাল', category: 'lentils', price: 160, unit: 'kg', icon: '🥘'),
  DemoProduct(id: 'L03', name: 'ছোলা ডাল', category: 'lentils', price: 120, unit: 'kg', icon: '🥘'),
  DemoProduct(id: 'L04', name: 'বুটের ডাল', category: 'lentils', price: 130, unit: 'kg', icon: '🥘'),
  DemoProduct(id: 'L05', name: 'খেসারি ডাল', category: 'lentils', price: 90, unit: 'kg', icon: '🥘'),

  // Oil (5)
  DemoProduct(id: 'O01', name: 'সয়াবিন তেল', category: 'oil', price: 165, unit: 'L', icon: '🛢️'),
  DemoProduct(id: 'O02', name: 'সরিষার তেল', category: 'oil', price: 180, unit: 'L', icon: '🛢️'),
  DemoProduct(id: 'O03', name: 'তিলের তেল', category: 'oil', price: 320, unit: 'L', icon: '🛢️'),
  DemoProduct(id: 'O04', name: 'নারিকেল তেল', category: 'oil', price: 280, unit: 'L', icon: '🛢️'),
  DemoProduct(id: 'O05', name: 'ডালডা (ভ্যানাস্পতি)', category: 'oil', price: 140, unit: 'L', icon: '🛢️'),

  // Soap (5)
  DemoProduct(id: 'S01', name: 'লক্স সাবান', category: 'soap', price: 45, unit: 'pc', icon: '🧼'),
  DemoProduct(id: 'S02', name: 'লাইফবয় সাবান', category: 'soap', price: 35, unit: 'pc', icon: '🧼'),
  DemoProduct(id: 'S03', name: 'সেফগার্ড সাবান', category: 'soap', price: 55, unit: 'pc', icon: '🧼'),
  DemoProduct(id: 'S04', name: 'কেয়া সাবান', category: 'soap', price: 30, unit: 'pc', icon: '🧼'),
  DemoProduct(id: 'S05', name: 'ডেটল সাবান', category: 'soap', price: 60, unit: 'pc', icon: '🧼'),

  // Biscuits (5)
  DemoProduct(id: 'B01', name: 'বিস্কুট (Olympic)', category: 'biscuits', price: 15, unit: 'pc', icon: '🍪'),
  DemoProduct(id: 'B02', name: 'মেরি বিস্কুট', category: 'biscuits', price: 20, unit: 'pc', icon: '🍪'),
  DemoProduct(id: 'B03', name: 'টাইগার বিস্কুট', category: 'biscuits', price: 10, unit: 'pc', icon: '🍪'),
  DemoProduct(id: 'B04', name: 'প্রান বিস্কুট', category: 'biscuits', price: 25, unit: 'pc', icon: '🍪'),
  DemoProduct(id: 'B05', name: 'আলমোন্ড বিস্কুট', category: 'biscuits', price: 35, unit: 'pc', icon: '🍪'),

  // Tea (5)
  DemoProduct(id: 'T01', name: 'তাজা চা', category: 'tea', price: 120, unit: '200g', icon: '🍵'),
  DemoProduct(id: 'T02', name: 'ব্রুক বন্ড', category: 'tea', price: 110, unit: '200g', icon: '🍵'),
  DemoProduct(id: 'T03', name: 'ইস্পাহানি চা', category: 'tea', price: 130, unit: '200g', icon: '🍵'),
  DemoProduct(id: 'T04', name: 'কেয়া চা', category: 'tea', price: 95, unit: '200g', icon: '🍵'),
  DemoProduct(id: 'T05', name: 'স্পেশাল চা', category: 'tea', price: 180, unit: '200g', icon: '🍵'),

  // Salt/Sugar (5)
  DemoProduct(id: 'X01', name: 'এসি লবণ', category: 'salt', price: 35, unit: 'kg', icon: '🧂'),
  DemoProduct(id: 'X02', name: 'ফ্রেশ চিনি', category: 'sugar', price: 78, unit: 'kg', icon: '🍬'),
  DemoProduct(id: 'X03', name: 'মিষ্টি সতেজ চিনি', category: 'sugar', price: 80, unit: 'kg', icon: '🍬'),
  DemoProduct(id: 'X04', name: 'সেন্টা লবণ', category: 'salt', price: 30, unit: 'kg', icon: '🧂'),
  DemoProduct(id: 'X05', name: 'আয়োডিনযুক্ত লবণ', category: 'salt', price: 38, unit: 'kg', icon: '🧂'),

  // Detergent (5)
  DemoProduct(id: 'D01', name: 'হুইল ডিটারজেন্ট', category: 'detergent', price: 65, unit: '500g', icon: '🧴'),
  DemoProduct(id: 'D02', name: 'সার্ফ এক্সেল', category: 'detergent', price: 95, unit: '500g', icon: '🧴'),
  DemoProduct(id: 'D03', name: 'টাইড', category: 'detergent', price: 110, unit: '500g', icon: '🧴'),
  DemoProduct(id: 'D04', name: 'চাচা সাবান', category: 'detergent', price: 45, unit: 'pc', icon: '🧴'),
  DemoProduct(id: 'D05', name: 'রিন সাবান', category: 'detergent', price: 40, unit: 'pc', icon: '🧴'),

  // Spices (5)
  DemoProduct(id: 'P01', name: 'রাধুনি হলুদ', category: 'spices', price: 220, unit: '200g', icon: '🌶️'),
  DemoProduct(id: 'P02', name: 'প্রান মরিচ', category: 'spices', price: 180, unit: '200g', icon: '🌶️'),
  DemoProduct(id: 'P03', name: 'বিডি চিটার মসলা', category: 'spices', price: 85, unit: '100g', icon: '🌶️'),
  DemoProduct(id: 'P04', name: 'গরম মসলা', category: 'spices', price: 150, unit: '100g', icon: '🌶️'),
  DemoProduct(id: 'P05', name: 'জিরা গুঁড়া', category: 'spices', price: 120, unit: '100g', icon: '🌶️'),
];

// Category names in Bangla for display
const Map<String, String> demoCategoryNames = {
  'rice': 'চাল',
  'lentils': 'ডাল',
  'oil': 'তেল',
  'soap': 'সাবান',
  'biscuits': 'বিস্কুট',
  'tea': 'চা',
  'salt': 'লবণ',
  'sugar': 'চিনি',
  'detergent': 'ডিটারজেন্ট',
  'spices': 'মসলা',
  'dairy': 'দুগ্ধ',
  'noodles': 'নুডুলস',
  'drinks': 'পানীয়',
  'snacks': 'নাশতা',
};
