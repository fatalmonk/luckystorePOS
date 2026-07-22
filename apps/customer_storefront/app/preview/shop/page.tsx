'use client';

import React from 'react';
import { 
  Search, 
  User, 
  Heart, 
  ShoppingCart, 
  Menu, 
  Phone, 
  Star, 
  LayoutGrid, 
  List, 
  ChevronDown,
  MapPin,
  Mail,
  RefreshCw,
  Eye,
  Share2
} from 'lucide-react';

// --- Types ---
type Product = {
  id: string;
  category: string;
  title: string;
  imageFallback: string;
  priceMin: number;
  priceMax?: number;
  originalPrice?: number;
  discountPercentage?: number;
  rating: number;
  reviewCount: number;
  options: string[];
  action: 'Select Options' | 'Add To Cart';
};

type FilterCategory = {
  name: string;
  count: number;
};

// --- Mock Data (Converted to BDT) ---
const PRODUCTS: Product[] = [
  {
    id: 'p1',
    category: 'Fresh Fruits',
    imageFallback: '🥭',
    options: ['1kg', '500gm'],
    priceMin: 2800,
    priceMax: 6800,
    discountPercentage: 33,
    title: '100% Premium Quality Garden Fresh Mango',
    rating: 5,
    reviewCount: 1,
    action: 'Select Options',
  },
  {
    id: 'p2',
    category: 'Desserts',
    imageFallback: '🍼',
    options: ['100gm', '375ml'],
    priceMin: 3000,
    priceMax: 3600,
    discountPercentage: 44,
    title: 'Aptamil Gold+ ProNutra Biotik Stage 1 Infant...',
    rating: 5,
    reviewCount: 1,
    action: 'Select Options',
  },
  {
    id: 'p3',
    category: 'Vegetables',
    imageFallback: '🥑',
    options: ['100gm'],
    priceMin: 2600,
    originalPrice: 3300,
    discountPercentage: 21,
    title: 'Avocado Creamy Elegance Pure, Fresh, and...',
    rating: 5,
    reviewCount: 1,
    action: 'Select Options',
  },
  {
    id: 'p4',
    category: 'Toys',
    imageFallback: '🐶',
    options: ['M', 'S'],
    priceMin: 6600,
    priceMax: 8100,
    discountPercentage: 8,
    title: 'Baby & Toddler Toy Smart Stages Puppy With...',
    rating: 5,
    reviewCount: 1,
    action: 'Select Options',
  },
];

const CATEGORIES: FilterCategory[] = [
  { name: 'Beverage', count: 8 },
  { name: 'Desserts', count: 9 },
  { name: 'Drinks & Juice', count: 6 },
  { name: 'Fish & Meats', count: 6 },
  { name: 'Fresh Fruits', count: 8 },
  { name: 'Pets & Animals', count: 4 },
  { name: 'Toys', count: 3 },
  { name: 'Vegetables', count: 6 },
];

// --- Components ---

const TopHeader = (): React.JSX.Element => (
  <div className="bg-[#0B0B0D] text-white text-xs py-2 px-6 flex justify-between items-center">
    <div className="flex items-center space-x-6">
      <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#f0c444]" /> Chittagong, Bangladesh</span>
      <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#f0c444]" /> info@luckystore1947.com</span>
    </div>
    <div className="flex items-center space-x-4">
      <span className="cursor-pointer hover:text-[#f0c444] text-[11px] font-bold">FB</span>
      <span className="cursor-pointer hover:text-[#f0c444] text-[11px] font-bold">TW</span>
      <span className="cursor-pointer hover:text-[#f0c444] text-[11px] font-bold">IG</span>
      <span className="cursor-pointer hover:text-[#f0c444] text-[11px] font-bold">LN</span>
    </div>
  </div>
);

const MainHeader = (): React.JSX.Element => (
  <div className="py-5 px-6 flex items-center justify-between border-b border-gray-100 bg-white">
    <div className="flex items-center space-x-2 shrink-0 cursor-pointer select-none group">
      <div className="flex items-baseline space-x-1">
        <span className="font-extrabold text-2xl text-[#0B0B0D] tracking-tight uppercase leading-none">
          LUCKY STORE
        </span>
        <span className="w-2.5 h-2.5 rounded-full bg-[#f0c444] inline-block shrink-0" aria-hidden="true" />
        <span className="font-mono text-xs text-gray-500 font-medium ml-1">1947</span>
      </div>
    </div>

    <div className="flex-1 max-w-2xl mx-8 flex border-2 border-[#f0c444] rounded-full overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-r border-gray-200 text-xs font-bold text-gray-700 min-w-[160px] cursor-pointer">
        <Menu className="w-4 h-4 text-[#0B0B0D]" />
        <span className="flex-1">All Categories</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>
      <input 
        type="text" 
        placeholder="Type Your Products ..." 
        className="flex-1 px-4 outline-none text-sm"
      />
      <button className="bg-[#f0c444] hover:bg-[#e0b434] text-[#0B0B0D] px-8 font-extrabold flex items-center gap-2 transition-colors cursor-pointer text-xs uppercase tracking-wider">
        Search <Search className="w-4 h-4" />
      </button>
    </div>

    <div className="flex items-center gap-6">
      <button className="text-gray-700 hover:text-[#0B0B0D] transition-colors"><User className="w-6 h-6" /></button>
      <div className="flex items-center gap-4">
        <div className="relative cursor-pointer group">
          <RefreshCw className="w-6 h-6 text-gray-700 group-hover:text-[#0B0B0D] transition-colors" />
          <span className="absolute -top-2 -right-2 bg-[#f0c444] text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full text-[#0B0B0D]">0</span>
        </div>
        <div className="relative cursor-pointer group">
          <Heart className="w-6 h-6 text-gray-700 group-hover:text-[#0B0B0D] transition-colors" />
          <span className="absolute -top-2 -right-2 bg-[#f0c444] text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full text-[#0B0B0D]">0</span>
        </div>
        <div className="relative cursor-pointer group flex items-center gap-3">
          <div className="relative bg-[#FFF8E1] p-2 rounded-xl border border-[#f0c444]/40">
            <ShoppingCart className="w-6 h-6 text-[#0B0B0D]" />
            <span className="absolute -top-2 -right-2 bg-[#f0c444] text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full text-[#0B0B0D]">0</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Navbar = (): React.JSX.Element => (
  <nav className="flex items-center justify-between py-3.5 px-6 border-b border-gray-200/80 bg-white text-xs font-extrabold uppercase tracking-wider">
    <div className="flex space-x-8 text-gray-700">
      <span className="cursor-pointer flex items-center gap-1 hover:text-[#0B0B0D]">Home <ChevronDown className="w-3 h-3 text-gray-400" /></span>
      <span className="cursor-pointer flex items-center gap-1 hover:text-[#0B0B0D]">Pages <ChevronDown className="w-3 h-3 text-gray-400" /></span>
      <span className="cursor-pointer flex items-center gap-1 text-[#0B0B0D] border-b-2 border-[#f0c444] pb-0.5">Shop <ChevronDown className="w-3 h-3 text-[#0B0B0D]" /></span>
      <span className="cursor-pointer flex items-center gap-1 hover:text-[#0B0B0D]">Vendor <ChevronDown className="w-3 h-3 text-gray-400" /></span>
      <span className="cursor-pointer flex items-center gap-1 hover:text-[#0B0B0D]">Elements <ChevronDown className="w-3 h-3 text-gray-400" /></span>
      <span className="cursor-pointer flex items-center gap-1 hover:text-[#0B0B0D]">Blog <ChevronDown className="w-3 h-3 text-gray-400" /></span>
      <span className="cursor-pointer hover:text-[#0B0B0D]">Contact</span>
    </div>
    <div className="flex items-center space-x-6">
      <div className="flex items-center space-x-2 text-xs font-bold border border-[#f0c444]/40 px-4 py-1.5 rounded-full bg-[#FFF8E1] text-[#0B0B0D]">
        <span className="text-[#0B0B0D]">%</span>
        <span>Weekly Discount!</span>
      </div>
      <div className="flex items-center space-x-3 bg-[#eb5757] text-white px-5 py-2 rounded-r-2xl rounded-l-md shadow-xs cursor-pointer">
        <Phone className="w-4 h-4" />
        <div className="flex flex-col text-xs leading-tight text-left">
          <span className="opacity-90 text-[10px]">Hotline Number</span>
          <span className="font-extrabold text-sm">+880 1234 567890</span>
        </div>
      </div>
    </div>
  </nav>
);

const Breadcrumbs = (): React.JSX.Element => (
  <div className="px-6 py-4 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
    <span className="hover:text-[#0B0B0D] cursor-pointer">Home</span> <span className="mx-2">›</span> <span className="text-[#0B0B0D] font-extrabold">Shop</span>
  </div>
);

const Sidebar = (): React.JSX.Element => (
  <aside className="w-[300px] flex-shrink-0 flex flex-col gap-8 pr-6">
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
      <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3 mb-4">Categories</h3>
      <ul className="flex flex-col gap-3">
        {CATEGORIES.map((cat) => (
          <li key={cat.name} className="flex justify-between items-center text-xs font-bold text-gray-700 hover:text-[#0B0B0D] cursor-pointer group">
            <span className="flex items-center gap-3">
              <span className="w-4 h-4 border border-gray-300 rounded-sm group-hover:border-[#f0c444]"></span>
              {cat.name}
            </span>
            <span className="text-gray-400 font-medium">({cat.count})</span>
          </li>
        ))}
      </ul>
    </div>
  </aside>
);

const ProductCard = ({ product }: { product: Product }): React.JSX.Element => {
  return (
    <div className="group border border-gray-100 rounded-2xl p-5 bg-white hover:border-[#f0c444] hover:shadow-xl transition-all duration-300 relative flex flex-col h-full">
      {/* Category Label */}
      <span className="text-[10px] uppercase font-bold text-gray-400 mb-2">{product.category}</span>
      
      {/* Floating Actions (Visible on Hover) */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 z-10">
        <button className="bg-white p-2 rounded-full shadow-md text-gray-500 hover:text-[#0B0B0D] hover:bg-[#FFF8E1]"><Heart className="w-4 h-4" /></button>
        <button className="bg-white p-2 rounded-full shadow-md text-gray-500 hover:text-[#0B0B0D] hover:bg-[#FFF8E1]"><RefreshCw className="w-4 h-4" /></button>
        <button className="bg-white p-2 rounded-full shadow-md text-gray-500 hover:text-[#0B0B0D] hover:bg-[#FFF8E1]"><Eye className="w-4 h-4" /></button>
      </div>

      {/* Discount Tag */}
      {product.discountPercentage && (
        <span className="absolute top-4 left-4 bg-[#eb5757] text-white text-[10px] font-extrabold px-2 py-0.5 rounded z-10">
          -{product.discountPercentage}%
        </span>
      )}

      {/* Image Fallback */}
      <div className="w-full h-48 flex items-center justify-center text-7xl bg-gray-50 rounded-xl mb-4 group-hover:scale-105 transition-transform duration-500">
        {product.imageFallback}
      </div>

      {/* Weight/Size Options */}
      <div className="flex gap-2 mb-4 justify-center">
        {product.options.map((opt) => (
          <span key={opt} className="text-[10px] text-gray-500 font-semibold border border-gray-200 rounded-full px-2.5 py-0.5 bg-gray-50">
            {opt}
          </span>
        ))}
      </div>

      {/* Price Area */}
      <div className="flex flex-col items-center gap-1 mb-2">
        <div className="flex items-center gap-2">
          {product.originalPrice && (
            <span className="text-xs text-gray-400 line-through">
              BDT {product.originalPrice.toFixed(2)}
            </span>
          )}
          <span className="text-base font-black text-[#0B0B0D]">
            BDT {product.priceMin.toFixed(2)}
            {product.priceMax ? ` - BDT ${product.priceMax.toFixed(2)}` : ''}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xs text-gray-800 font-extrabold leading-snug text-center line-clamp-2 hover:text-[#0B0B0D] cursor-pointer mb-3 flex-1">
        {product.title}
      </h3>

      {/* Rating */}
      <div className="flex justify-center items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-3 h-3 ${i < product.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} 
          />
        ))}
      </div>

      {/* Action Button */}
      <button 
        className="w-full py-2.5 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition-colors border-2 border-[#f0c444] bg-[#f0c444] text-[#0B0B0D] hover:bg-[#e0b434] cursor-pointer"
      >
        {product.action}
      </button>
    </div>
  );
};

const ProductArea = (): React.JSX.Element => (
  <div className="flex-1 flex flex-col gap-6">
    <div className="flex justify-between items-center bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
          <LayoutGrid className="w-5 h-5 text-[#0B0B0D] cursor-pointer" />
          <List className="w-5 h-5 text-gray-400 cursor-pointer hover:text-[#0B0B0D]" />
        </div>
        <span className="text-xs text-gray-500 font-semibold">Showing 1–16 of 50 results</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gray-500 font-semibold">Sort by:</span>
        <div className="border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer bg-white min-w-[160px] justify-between font-bold text-gray-700">
          <span>Default Sorting</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {PRODUCTS.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  </div>
);

export default function ShopPreviewPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-[#f0c444] selection:text-[#0B0B0D]">
      <TopHeader />
      <MainHeader />
      <Navbar />
      <Breadcrumbs />
      
      <main className="max-w-[1600px] mx-auto px-6 py-10 flex items-start">
        <Sidebar />
        <ProductArea />
      </main>

      {/* Floating Elements */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        <div className="bg-[#0B0B0D] text-white p-3 rounded-l-xl shadow-2xl flex flex-col items-center cursor-pointer border border-[#f0c444]/40">
          <ShoppingCart className="w-6 h-6 mb-1 text-[#f0c444]" />
          <span className="text-[10px] font-bold">0 Item</span>
          <span className="text-[10px] bg-[#f0c444] text-[#0B0B0D] px-2 py-0.5 rounded mt-1 font-extrabold">BDT 0.00</span>
        </div>
      </div>
    </div>
  );
}
