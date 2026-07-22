'use client';

import React, { useState } from 'react';
import { 
  MapPin, Mail, Search, User, Heart, ShoppingBag, 
  Menu, Phone, Tag, Star, ClipboardList, RefreshCw, ArrowUp,
  Truck, ShieldCheck, Leaf, DollarSign, Headphones, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Category {
  name: string;
  count: number;
  icon: string;
}

interface Product {
  id: string;
  category: string;
  title: string;
  currentPrice: number;
  originalPrice: number;
  discountPercentage: number;
  rating: number;
  imageIcon: string;
  weights?: string[];
}

interface Vendor {
  id: string;
  name: string;
  rating: number;
  avatar: string;
}

interface Blog {
  id: string;
  category: string;
  title: string;
  date: string;
  author: string;
  image: string;
}

const categories: Category[] = [
  { name: 'Vegetables', count: 6, icon: '🥦' },
  { name: 'Fresh Fruits', count: 8, icon: '🍎' },
  { name: 'Desserts', count: 9, icon: '🍰' },
  { name: 'Drinks & Juice', count: 6, icon: '🧃' },
  { name: 'Fish & Meats', count: 6, icon: '🥩' },
  { name: 'Pets & Animals', count: 4, icon: '🐕' },
  { name: 'Beverage', count: 8, icon: '🥤' },
];

const featuredProducts: Product[] = [
  {
    id: 'p-1',
    category: 'Vegetables',
    title: 'Whole Foods Market, Organic Trimmed Green Beans',
    currentPrice: 3.00,
    originalPrice: 8.00,
    discountPercentage: 23,
    rating: 5.0,
    imageIcon: '🫛',
    weights: ['100g', '500g'],
  },
  {
    id: 'p-2',
    category: 'Vegetables',
    title: 'Whole Foods Market, Romaine Hearts Salad Bag',
    currentPrice: 19.00,
    originalPrice: 22.00,
    discountPercentage: 14,
    rating: 5.0,
    imageIcon: '🥬',
    weights: ['100g'],
  },
  {
    id: 'p-3',
    category: 'Desserts',
    title: 'Aptamil Gold+ ProNutra Biotik Stage 1 Infant',
    currentPrice: 24.00,
    originalPrice: 40.00,
    discountPercentage: 41,
    rating: 5.0,
    imageIcon: '🍼',
    weights: ['375g', '500g'],
  },
  {
    id: 'p-4',
    category: 'Beverage',
    title: 'Red Rock Deli Style Potato Chips, Lime & Cracked',
    currentPrice: 34.00,
    originalPrice: 45.00,
    discountPercentage: 24,
    rating: 5.0,
    imageIcon: '🥔',
    weights: ['100g'],
  },
  {
    id: 'p-5',
    category: 'Vegetables',
    title: 'Fresh and Sweet Watermelon Delights for Summer',
    currentPrice: 18.00,
    originalPrice: 45.00,
    discountPercentage: 33,
    rating: 5.0,
    imageIcon: '🍉',
    weights: ['375g', '500g'],
  },
  {
    id: 'p-6',
    category: 'Desserts',
    title: 'Chips Ahoy! Mini Chocolate Chip Cookies Snack-Sak',
    currentPrice: 20.00,
    originalPrice: 30.00,
    discountPercentage: 17,
    rating: 5.0,
    imageIcon: '🍪',
    weights: ['100g', '375g'],
  },
];

const vendors: Vendor[] = [
  { id: 'v-1', name: 'Ocean Freeze', rating: 5.0, avatar: '👨‍🌾' },
  { id: 'v-2', name: 'Bento Farm House', rating: 5.0, avatar: '👩‍🌾' },
  { id: 'v-3', name: 'Organic Farm', rating: 5.0, avatar: '🚜' },
  { id: 'v-4', name: 'Natural Food Store', rating: 5.0, avatar: '🌽' },
];

const trendingProducts: Product[] = [
  { id: 't-1', category: 'Snacks', title: 'Salted Crunchy Roasted Almonds Premium', currentPrice: 15.00, originalPrice: 20.00, discountPercentage: 25, rating: 5.0, imageIcon: '🥜' },
  { id: 't-2', category: 'Dairy', title: 'Organic Full Cream Pure Pasteurized Milk', currentPrice: 4.50, originalPrice: 6.00, discountPercentage: 25, rating: 5.0, imageIcon: '🥛' },
  { id: 't-3', category: 'Fresh Fruits', title: 'Golden Organic Honey Crispy Papaya', currentPrice: 12.00, originalPrice: 15.00, discountPercentage: 20, rating: 5.0, imageIcon: '🥭' },
  { id: 't-4', category: 'Beverage', title: 'Natural Sparkling Lemonade Soda Can', currentPrice: 2.50, originalPrice: 3.50, discountPercentage: 28, rating: 5.0, imageIcon: '🥤' },
  { id: 't-5', category: 'Vegetables', title: 'Farm Fresh Organic Curly Broccoli', currentPrice: 5.00, originalPrice: 7.00, discountPercentage: 28, rating: 5.0, imageIcon: '🥦' },
  { id: 't-6', category: 'Vegetables', title: 'Crispy Fresh Iceberg Green Lettuce', currentPrice: 3.50, originalPrice: 5.00, discountPercentage: 30, rating: 5.0, imageIcon: '🥬' },
  { id: 't-7', category: 'Vegetables', title: 'Sweet Red Bell Peppers Farm Fresh', currentPrice: 4.00, originalPrice: 6.00, discountPercentage: 33, rating: 5.0, imageIcon: '🫑' },
  { id: 't-8', category: 'Drinks', title: 'Cold Pressed Organic Orange Juice Bottle', currentPrice: 6.00, originalPrice: 8.50, discountPercentage: 29, rating: 5.0, imageIcon: '🧃' },
];

const sideProducts: Product[] = [
  { id: 's-1', category: 'Vegetables', title: 'Fresh Crisp Lettuce Leaves Pack', currentPrice: 12.00, originalPrice: 16.00, discountPercentage: 25, rating: 5.0, imageIcon: '🥬' },
  { id: 's-2', category: 'Vegetables', title: 'Organic Green Spinach Bunch', currentPrice: 8.00, originalPrice: 11.00, discountPercentage: 27, rating: 5.0, imageIcon: '🥦' },
  { id: 's-3', category: 'Fruits', title: 'Fresh Wild Blueberries Box', currentPrice: 14.00, originalPrice: 18.00, discountPercentage: 22, rating: 5.0, imageIcon: '🫐' },
];

const bestSellerProducts: Product[] = [
  { id: 'b-1', category: 'Snacks', title: 'Organic Potato Chips Crispy Lime', currentPrice: 3.20, originalPrice: 4.50, discountPercentage: 28, rating: 5.0, imageIcon: '🍟' },
  { id: 'b-2', category: 'Beverage', title: 'Natural Flavored Sparkling Water', currentPrice: 2.10, originalPrice: 3.00, discountPercentage: 30, rating: 5.0, imageIcon: '🥤' },
  { id: 'b-3', category: 'Dairy', title: 'Strawberry Organic Yogurt Tub', currentPrice: 4.80, originalPrice: 6.00, discountPercentage: 20, rating: 5.0, imageIcon: '🍧' },
];

const blogs: Blog[] = [
  { id: 'b-1', category: 'VEGETABLES', title: 'Delicious Food Recipes Of The Most Loved Cuisine', date: 'July 18, 2026', author: 'By Admin', image: '🥗' },
  { id: 'b-2', category: 'VEGETABLES', title: 'Discover The Secrets Of Outstanding Whole Foods', date: 'July 15, 2026', author: 'By Admin', image: '🥑' },
  { id: 'b-3', category: 'BLOGGER', title: 'Explore The Best Flavors Of Our Grill House', date: 'July 10, 2026', author: 'By Admin', image: '🍔' },
];

export default function FullZillyPreview(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('All');
  const [isCatMenuOpen, setIsCatMenuOpen] = useState(false);
  const [activeNavDropdown, setActiveNavDropdown] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 relative selection:bg-[#f0c444] selection:text-[#0B0B0D]">
      
      {/* ----------------- 1. TOP UTILITY BAR ----------------- */}
      <div className="hidden lg:flex bg-[#f0c444] text-[#0B0B0D] text-xs py-2 px-8 justify-between items-center border-b border-[#e0b434]">
        <div className="flex items-center space-x-6">
          <span className="flex items-center font-medium">
            <MapPin className="w-3.5 h-3.5 mr-1.5 opacity-90 text-[#0B0B0D]" /> Chittagong, Bangladesh
          </span>
          <span className="flex items-center font-medium">
            <Mail className="w-3.5 h-3.5 mr-1.5 opacity-90 text-[#0B0B0D]" /> info@luckystore1947.com
          </span>
        </div>
        <div className="text-center flex-1 font-semibold tracking-wide">
          Try Lucky Store for free — <span className="text-[#0B0B0D] font-extrabold underline cursor-pointer hover:opacity-80">Open store right now</span>
        </div>
        <div className="flex space-x-4 font-bold">
          <span className="cursor-pointer hover:underline">USD</span>
          <span className="cursor-pointer text-[#0B0B0D] underline">BDT</span>
        </div>
      </div>

      {/* ----------------- 2. MAIN HEADER ----------------- */}
      <header className="bg-white py-4 px-4 md:px-6 lg:px-8 border-b border-gray-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 lg:gap-8">
          
          {/* Official Lucky Store Logo */}
          <div className="flex items-center space-x-2.5 md:space-x-3 shrink-0 cursor-pointer select-none group">
            <div className="flex items-baseline space-x-1">
              <span className="font-extrabold text-lg md:text-2xl text-[#0B0B0D] tracking-tight uppercase leading-none">
                LUCKY STORE
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#f0c444] inline-block shrink-0 transition-transform group-hover:scale-125" aria-hidden="true" />
              <span className="hidden sm:inline font-mono text-xs text-gray-500 font-medium ml-1">1947</span>
            </div>
          </div>

          {/* Integrated Search Bar with Category Select */}
          <div className="hidden lg:flex flex-1 max-w-2xl border-2 border-[#f0c444] rounded-full overflow-hidden focus-within:shadow-md transition-all bg-white">
            <select className="bg-gray-50 px-4 py-3 border-r border-gray-200 outline-none text-xs text-gray-700 font-bold cursor-pointer hover:bg-gray-100 transition-colors">
              <option>All Categories</option>
              <option>Vegetables</option>
              <option>Fresh Fruits</option>
              <option>Desserts</option>
              <option>Beverage</option>
              <option>Fish & Meats</option>
            </select>
            <input 
              type="text" 
              placeholder="Type Your Products ..." 
              className="flex-1 px-4 outline-none text-gray-700 placeholder:text-gray-400 text-sm font-medium" 
            />
            <button className="bg-[#f0c444] hover:bg-[#e0b434] text-[#0B0B0D] px-8 py-3 font-extrabold flex items-center transition-colors cursor-pointer text-xs uppercase tracking-wider">
              Search <Search className="w-4 h-4 ml-2" />
            </button>
          </div>

          {/* Header Action Icons */}
          <div className="flex items-center space-x-3 md:space-x-5 text-gray-700">
            <button title="Account" className="hover:text-[#0B0B0D] transition-colors hidden sm:flex items-center justify-center p-2 rounded-full hover:bg-gray-100">
              <User className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            
            <button title="Compare" className="relative hover:text-[#0B0B0D] transition-colors hidden md:flex items-center justify-center p-2 rounded-full hover:bg-gray-100">
              <ClipboardList className="w-5 h-5 md:w-6 md:h-6" />
              <span className="absolute top-0 right-0 bg-[#f0c444] text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold text-[#0B0B0D] shadow-xs">0</span>
            </button>
            
            <button title="Wishlist" className="relative hover:text-[#0B0B0D] transition-colors flex items-center justify-center p-2 rounded-full hover:bg-gray-100">
              <Heart className="w-5 h-5 md:w-6 md:h-6" />
              <span className="absolute top-0 right-0 bg-[#f0c444] text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold text-[#0B0B0D] shadow-xs">0</span>
            </button>
            
            {/* Cart Button */}
            <button className="flex items-center space-x-3 hover:opacity-90 transition-opacity group">
              <div className="relative bg-[#FFF8E1] p-2.5 rounded-xl border border-[#f0c444]/40 group-hover:border-[#f0c444]">
                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-[#0B0B0D]" />
                <span className="absolute -top-1.5 -right-1.5 bg-[#f0c444] text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold text-[#0B0B0D] shadow-xs border border-white">0</span>
              </div>
              <div className="flex-col text-left text-xs font-semibold hidden lg:flex">
                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Shopping Cart</span>
                <span className="text-[#0B0B0D] font-black text-sm">BDT 0.00</span>
              </div>
            </button>
            
            <button className="lg:hidden hover:text-[#0B0B0D] p-1">
              <Menu className="w-6 h-6 md:w-7 md:h-7" />
            </button>
          </div>
        </div>
      </header>

      {/* ----------------- 3. PRIMARY NAVIGATION MENU ----------------- */}
      <nav className="hidden lg:block bg-white px-4 md:px-6 lg:px-8 border-b border-gray-200/80 shadow-xs relative z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Left: Zilly Style Category Menu Trigger & Nav Links */}
          <div className="flex items-center space-x-8">
            
            {/* Category Dropdown Button (Zilly Signature Feature) */}
            <div className="relative">
              <button 
                onClick={() => setIsCatMenuOpen(!isCatMenuOpen)}
                className="bg-[#0B0B0D] hover:bg-black text-white px-5 py-3.5 font-bold text-xs flex items-center space-x-3 rounded-t-xl transition-all cursor-pointer shadow-xs uppercase tracking-wider"
              >
                <Menu className="w-4 h-4 text-[#f0c444]" />
                <span>All Categories</span>
                <span className={`text-[10px] transition-transform ${isCatMenuOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* Category Dropdown Menu Popover */}
              {isCatMenuOpen && (
                <div className="absolute top-full left-0 w-64 bg-white border border-gray-100 shadow-2xl rounded-b-2xl py-2 z-50 animate-fade-in-up">
                  {categories.map((c) => (
                    <a
                      key={c.name}
                      href="#"
                      className="flex items-center justify-between px-5 py-2.5 hover:bg-[#FFF8E1] transition-colors text-xs font-bold text-gray-800 hover:text-[#0B0B0D] border-b border-gray-50 last:border-none"
                    >
                      <span className="flex items-center space-x-3">
                        <span className="text-base">{c.icon}</span>
                        <span>{c.name}</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">{c.count}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Nav Menu Links */}
            <ul className="flex items-center space-x-7 text-xs font-extrabold py-3.5 text-gray-700 tracking-wide uppercase">
              
              {/* Home */}
              <li 
                onMouseEnter={() => setActiveNavDropdown('home')}
                onMouseLeave={() => setActiveNavDropdown(null)}
                className="relative cursor-pointer text-[#0B0B0D] border-b-2 border-[#f0c444] pb-0.5 flex items-center space-x-1"
              >
                <span>Home</span>
                <span className="text-[9px]">▼</span>
                {activeNavDropdown === 'home' && (
                  <div className="absolute top-full left-0 w-44 bg-white border border-gray-100 shadow-xl rounded-xl py-2 text-xs text-gray-700 font-semibold uppercase tracking-normal">
                    <a href="#" className="block px-4 py-2 hover:bg-[#FFF8E1] hover:text-[#0B0B0D]">Home 01 (Default)</a>
                    <a href="#" className="block px-4 py-2 hover:bg-[#FFF8E1] hover:text-[#0B0B0D]">Home 02 (Grocery)</a>
                    <a href="#" className="block px-4 py-2 hover:bg-[#FFF8E1] hover:text-[#0B0B0D]">Home 03 (Organic)</a>
                  </div>
                )}
              </li>

              {/* Pages */}
              <li 
                onMouseEnter={() => setActiveNavDropdown('pages')}
                onMouseLeave={() => setActiveNavDropdown(null)}
                className="relative cursor-pointer hover:text-[#0B0B0D] transition-colors flex items-center space-x-1"
              >
                <span>Pages</span>
                <span className="text-[9px]">▼</span>
                {activeNavDropdown === 'pages' && (
                  <div className="absolute top-full left-0 w-44 bg-white border border-gray-100 shadow-xl rounded-xl py-2 text-xs text-gray-700 font-semibold uppercase tracking-normal">
                    <a href="#" className="block px-4 py-2 hover:bg-[#FFF8E1] hover:text-[#0B0B0D]">About Us</a>
                    <a href="#" className="block px-4 py-2 hover:bg-[#FFF8E1] hover:text-[#0B0B0D]">Daily Deals</a>
                    <a href="#" className="block px-4 py-2 hover:bg-[#FFF8E1] hover:text-[#0B0B0D]">FAQ Page</a>
                  </div>
                )}
              </li>

              {/* Shop */}
              <li 
                onMouseEnter={() => setActiveNavDropdown('shop')}
                onMouseLeave={() => setActiveNavDropdown(null)}
                className="relative cursor-pointer hover:text-[#0B0B0D] transition-colors flex items-center space-x-1"
              >
                <span>Shop</span>
                <span className="text-[9px]">▼</span>
                {activeNavDropdown === 'shop' && (
                  <div className="absolute top-full left-0 w-48 bg-white border border-gray-100 shadow-xl rounded-xl py-2 text-xs text-gray-700 font-semibold uppercase tracking-normal">
                    <a href="#" className="block px-4 py-2 hover:bg-[#FFF8E1] hover:text-[#0B0B0D]">Shop Grid Layout</a>
                    <a href="#" className="block px-4 py-2 hover:bg-[#FFF8E1] hover:text-[#0B0B0D]">Shop List Layout</a>
                    <a href="#" className="block px-4 py-2 hover:bg-[#FFF8E1] hover:text-[#0B0B0D]">Single Product</a>
                  </div>
                )}
              </li>

              {/* Vendor */}
              <li className="cursor-pointer hover:text-[#0B0B0D] transition-colors flex items-center space-x-1">
                <span>Vendor</span>
                <span className="text-[9px]">▼</span>
              </li>

              {/* Elements */}
              <li className="cursor-pointer hover:text-[#0B0B0D] transition-colors flex items-center space-x-1">
                <span>Elements</span>
                <span className="text-[9px]">▼</span>
              </li>

              {/* Blog */}
              <li className="cursor-pointer hover:text-[#0B0B0D] transition-colors flex items-center space-x-1">
                <span>Blog</span>
                <span className="text-[9px]">▼</span>
              </li>

              {/* Contact */}
              <li className="cursor-pointer hover:text-[#0B0B0D] transition-colors">
                Contact
              </li>
            </ul>
          </div>

          {/* Right Side: Weekly Discount Badge & Hotline Badge */}
          <div className="flex items-center space-x-5">
            <div className="hidden xl:flex items-center space-x-2 text-xs font-bold border border-[#f0c444]/40 px-4 py-1.5 rounded-full bg-[#FFF8E1] text-[#0B0B0D]">
              <Tag className="w-3.5 h-3.5 text-[#0B0B0D]" /> 
              <span>Weekly Discount!</span>
            </div>
            
            {/* Call Center / Hotline Box (Zilly Style) */}
            <div className="bg-[#eb5757] text-white px-5 py-2 rounded-r-2xl rounded-l-md flex items-center space-x-3 shadow-sm hover:bg-red-600 transition-all cursor-pointer active:scale-95">
              <Phone className="w-4 h-4 animate-bounce" />
              <div className="text-xs text-left leading-tight">
                <div className="opacity-90 text-[10px] font-medium uppercase tracking-wider">Hotline Number</div>
                <div className="font-black text-sm tracking-wide">+880 1234 567890</div>
              </div>
            </div>
          </div>

        </div>
      </nav>

      {/* ----------------- MAIN BODY CONTAINER ----------------- */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-12">

        {/* ----------------- 4. CATEGORIES ICON STRIP ----------------- */}
        <div className="flex overflow-x-auto gap-3 md:gap-4 pb-2 no-scrollbar items-center justify-between">
          {categories.map((cat, idx) => (
            <React.Fragment key={cat.name}>
              <div className="flex-shrink-0 bg-white shadow-xs rounded-full px-5 py-2.5 flex items-center space-x-3 border border-gray-100 cursor-pointer hover:shadow-md hover:border-[#f0c444] transition-all group">
                <div className="w-9 h-9 bg-[#FFF8E1] rounded-full flex items-center justify-center text-xl group-hover:bg-[#f0c444] group-hover:text-[#0B0B0D] transition-colors border border-[#f0c444]/30">
                  {cat.icon}
                </div>
                <div>
                  <div className="font-bold text-xs text-gray-900 leading-tight">{cat.name}</div>
                  <div className="text-[10px] text-gray-500 font-medium">{cat.count} Products</div>
                </div>
              </div>
              {idx < categories.length - 1 && (
                <div className="hidden md:flex text-gray-300 font-black tracking-widest flex-col justify-center leading-[4px] px-1">
                  . . .
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ----------------- 5. HERO BENTO GRID ----------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Main Left Hero Banner (lg:col-span-2) */}
          <div className="lg:col-span-2 bg-[#F6F4EE] rounded-[1.75rem] p-8 md:p-12 lg:p-14 flex items-center justify-between relative overflow-hidden min-h-[380px] md:min-h-[440px] lg:min-h-[480px] shadow-xs border border-gray-100/80">
            
            <div className="relative z-10 space-y-4 md:space-y-6 max-w-sm md:max-w-md">
              {/* Notched Ribbon Badge */}
              <div className="relative inline-block bg-[#eb5757] text-white font-extrabold text-[11px] md:text-xs px-4 py-1.5 shadow-xs uppercase tracking-wider rounded-l-md pr-6" style={{ clipPath: 'polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%)' }}>
                100% Farm Fresh Food
              </div>

              {/* Title Lockup */}
              <div className="space-y-1">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.05] tracking-tight font-serif italic drop-shadow-xs">
                  Fresh Organic
                </h1>
                <p className="text-2xl md:text-3xl font-bold text-[#1b8057] tracking-wide">
                  Food For All
                </p>
              </div>

              {/* Price */}
              <div className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                $59.00
              </div>

              {/* Action Button */}
              <button className="bg-[#1b8057] hover:bg-[#166645] text-white px-9 py-3.5 rounded-full font-extrabold shadow-md transition-all active:scale-95 text-sm cursor-pointer border border-emerald-600/30">
                Shop Now
              </button>
            </div>

            {/* Flatlay Produce Artwork Background & Graphic */}
            <div className="absolute right-0 top-0 bottom-0 w-3/5 bg-gradient-to-l from-emerald-100/40 via-amber-50/20 to-transparent rounded-l-full pointer-events-none"></div>
            <div className="absolute -right-4 bottom-2 text-[10rem] leading-none opacity-25 select-none pointer-events-none transform rotate-6">
              🥗🥑🍅
            </div>
            <div className="absolute right-12 top-6 text-7xl opacity-20 select-none pointer-events-none">
              🧄🍋
            </div>
          </div>

          {/* Right Column Container Stack */}
          <div className="flex flex-col justify-between space-y-6 h-full">
            
            {/* Top Right Card ("Premium Honeynuts") */}
            <div className="bg-[#F2F1ED] rounded-[1.75rem] p-6 md:p-8 flex items-center justify-between relative overflow-hidden min-h-[225px] shadow-xs border border-gray-100">
              <div className="relative z-10 space-y-2 max-w-[190px]">
                <h3 className="text-2xl font-black text-gray-900 leading-snug">Premium Honeynuts</h3>
                <p className="text-xs text-gray-500 font-semibold">100% Salted Organic Nuts</p>
                <div className="text-3xl font-black text-[#eb5757] pt-1">$15.00</div>
                <button className="bg-white text-gray-900 px-6 py-2 rounded-full text-xs font-extrabold shadow-xs hover:bg-gray-50 transition-all cursor-pointer border border-gray-100">
                  Shop Now
                </button>
              </div>
              <div className="relative z-10 text-6xl shrink-0 transform hover:scale-105 transition-transform">
                🥜
              </div>
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-amber-100/50 rounded-full blur-xl pointer-events-none"></div>
            </div>

            {/* Bottom Right Split Cards */}
            <div className="grid grid-cols-2 gap-4 min-h-[225px]">
              
              {/* Blue Card ("New Baby Diaper") */}
              <div className="bg-[#0066FF] text-white rounded-[1.75rem] p-5 flex flex-col justify-between relative overflow-hidden shadow-xs border border-blue-500/30">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm md:text-base leading-tight">New Baby Diaper</h4>
                  <p className="text-[11px] text-blue-100 font-medium">Top Quality Product</p>
                </div>
                <div className="text-5xl text-center my-2 transform hover:scale-110 transition-transform">👶</div>
                <button className="bg-white text-[#0066FF] hover:bg-blue-50 px-5 py-2 rounded-full text-[11px] font-extrabold text-center transition-colors w-max mx-auto shadow-xs cursor-pointer">
                  Shop Now
                </button>
              </div>

              {/* Pink Card ("Dark wash FaceWash") */}
              <div className="bg-[#FFF0F4] text-gray-900 rounded-[1.75rem] p-5 flex flex-col justify-between relative overflow-hidden shadow-xs border border-pink-100">
                <div className="space-y-1">
                  <div className="bg-[#eb5757] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full w-max shadow-xs">
                    15% OFF
                  </div>
                  <h4 className="font-extrabold text-sm md:text-base leading-tight pt-1">Dark wash FaceWash</h4>
                  <p className="text-[11px] text-gray-500 font-medium">All Fixed Size</p>
                </div>
                <div className="text-5xl text-center my-2 transform hover:scale-110 transition-transform">🧴</div>
                <button className="bg-white text-gray-900 hover:bg-gray-50 px-5 py-2 rounded-full text-[11px] font-extrabold text-center transition-colors w-max mx-auto shadow-xs border border-gray-100 cursor-pointer">
                  Shop Now
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* ----------------- 6. FEATURED PRODUCTS SECTION ----------------- */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Featured Products</h2>
            
            {/* Filter Tabs */}
            <div className="flex items-center space-x-2 md:space-x-4 text-xs font-bold overflow-x-auto no-scrollbar">
              {['All (12)', 'Desserts (9)', 'Vegetables (8)', 'Beverage (8)'].map((tab) => {
                const tabName = tab.split(' ')[0];
                const isActive = activeTab === tabName;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tabName)}
                    className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                      isActive ? 'bg-[#f0c444] text-[#0B0B0D] shadow-xs' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
              <div className="flex space-x-1 pl-2">
                <button className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredProducts.map((product) => (
              <div key={product.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col justify-between relative group hover:shadow-xl hover:border-[#f0c444] transition-all">
                
                {/* Wishlist Icon */}
                <button className="absolute top-3 right-3 text-gray-400 hover:text-[#eb5757] transition-colors z-10">
                  <Heart className="w-4 h-4" />
                </button>

                {/* Product Thumbnail */}
                <div className="w-full h-36 bg-gray-50/60 rounded-xl flex items-center justify-center text-5xl mb-3 group-hover:scale-105 transition-transform duration-300">
                  {product.imageIcon}
                </div>

                {/* Info */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">{product.category}</p>
                  <h3 className="text-xs font-bold text-gray-800 leading-snug line-clamp-2 min-h-[32px]">
                    {product.title}
                  </h3>

                  {/* Weights */}
                  {product.weights && (
                    <div className="flex space-x-1 py-1">
                      {product.weights.map((w) => (
                        <span key={w} className="text-[9px] bg-gray-100 text-gray-600 font-semibold px-1.5 py-0.5 rounded">
                          {w}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stars */}
                  <div className="flex items-center space-x-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-sm font-extrabold text-[#0B0B0D]">BDT {product.currentPrice.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 line-through">BDT {product.originalPrice.toFixed(2)}</span>
                    <span className="bg-[#eb5757] text-white text-[9px] font-bold px-1 py-0.5 rounded ml-auto">
                      -{product.discountPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ----------------- 7. MIDDLE PROMO BANNER ----------------- */}
        <div className="bg-[#FFF0ED] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-red-100 shadow-xs relative overflow-hidden">
          <div className="space-y-2 text-center md:text-left z-10">
            <span className="text-xs font-extrabold text-[#eb5757] uppercase tracking-wider">Special Collection</span>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900">
              The Finest New Collection 2026 — <br className="hidden md:block"/>
              Nourishing Women Body Lotions
            </h3>
          </div>

          <div className="flex items-center space-x-6 z-10 shrink-0">
            <div className="bg-[#0066FF] text-white font-extrabold text-xs px-5 py-3 rounded-full text-center shadow-md">
              Starting From <br/><span className="text-xl">BDT 4500</span>
            </div>
            <div className="text-6xl">🧴✨</div>
          </div>
        </div>

        {/* ----------------- 8. TOP SELLER VENDORS ----------------- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-xl font-black text-gray-900 relative">
              Top Seller Vendors
              <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-[#f0c444]"></span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {vendors.map((v) => (
              <div key={v.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center space-x-3 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#FFF8E1] rounded-full flex items-center justify-center text-2xl border border-[#f0c444]/30">
                  {v.avatar}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-gray-900">{v.name}</h4>
                  <div className="flex items-center space-x-1 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-[10px] text-gray-400 font-bold ml-1">({v.rating.toFixed(1)})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ----------------- 9. DEAL OF THE WEEK ----------------- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl md:text-2xl font-black text-gray-900">Deal Of The Week</h2>
              {/* Countdown */}
              <div className="flex items-center space-x-1 text-xs font-black">
                <span className="bg-[#eb5757] text-white px-2 py-1 rounded">705</span>:
                <span className="bg-[#eb5757] text-white px-2 py-1 rounded">09</span>:
                <span className="bg-[#eb5757] text-white px-2 py-1 rounded">59</span>:
                <span className="bg-[#eb5757] text-white px-2 py-1 rounded">45</span>
              </div>
            </div>
          </div>

          <div className="bg-[#FFF8E1] rounded-3xl p-6 border border-[#f0c444]/50 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Spotlight Banner */}
            <div className="bg-white p-6 rounded-2xl flex flex-col justify-between shadow-xs border border-[#f0c444]/30">
              <div className="text-center space-y-2">
                <div className="text-7xl">🥔</div>
                <h3 className="text-sm font-extrabold text-gray-900">Organic Idaho Russet Potatoes Basket</h3>
                <div className="text-2xl font-black text-[#eb5757]">BDT 4500</div>
              </div>
              <button className="bg-[#f0c444] text-[#0B0B0D] font-extrabold py-2.5 rounded-full text-xs hover:bg-[#e0b434] transition-colors mt-4 w-full cursor-pointer">
                Add To Cart
              </button>
            </div>

            {/* Right 2x3 Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
              {featuredProducts.map((item) => (
                <div key={`deal-${item.id}`} className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
                  <div className="text-3xl text-center my-1">{item.imageIcon}</div>
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-bold text-gray-800 line-clamp-1">{item.title}</h4>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-[#0B0B0D]">BDT {item.currentPrice.toFixed(2)}</span>
                      <span className="text-[10px] text-gray-400 line-through">BDT {item.originalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ----------------- 10. THREE-COLUMN PROMO BANNERS ----------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-[#E6F0FF] rounded-2xl p-6 flex items-center justify-between border border-blue-100 shadow-xs">
            <div>
              <p className="text-xs text-blue-600 font-bold">Organic Fruits</p>
              <h3 className="text-lg font-black text-gray-900">Baby Jam</h3>
              <p className="text-xs text-gray-500 font-semibold mt-1">From <span className="font-bold text-gray-900">BDT 1200</span></p>
              <button className="mt-3 bg-white text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold shadow-xs">Shop Now</button>
            </div>
            <div className="text-5xl">🫙</div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#F4FBDF] rounded-2xl p-6 flex items-center justify-between border border-lime-200 shadow-xs">
            <div>
              <p className="text-xs text-lime-700 font-bold">Organic Fruits</p>
              <h3 className="text-lg font-black text-gray-900">Fresh Juice</h3>
              <p className="text-xs text-gray-500 font-semibold mt-1">From <span className="font-bold text-gray-900">BDT 1400</span></p>
              <button className="mt-3 bg-white text-lime-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-xs">Shop Now</button>
            </div>
            <div className="text-5xl">🧃</div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#F3E8FF] rounded-2xl p-6 flex items-center justify-between border border-purple-200 shadow-xs">
            <div>
              <p className="text-xs text-purple-700 font-bold">Kids Category</p>
              <h3 className="text-lg font-black text-gray-900">Car Toys</h3>
              <p className="text-xs text-gray-500 font-semibold mt-1">From <span className="font-bold text-gray-900">BDT 800</span></p>
              <button className="mt-3 bg-white text-purple-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-xs">Shop Now</button>
            </div>
            <div className="text-5xl">🧸</div>
          </div>

        </div>

        {/* ----------------- 11. TRENDING PRODUCTS ----------------- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-xl md:text-2xl font-black text-gray-900">Trending Products</h2>
            <div className="flex space-x-1">
              <button className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
              <button className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {trendingProducts.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all group">
                <div className="w-full h-32 bg-gray-50 rounded-xl flex items-center justify-center text-4xl mb-3 group-hover:scale-105 transition-transform">
                  {item.imageIcon}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">{item.category}</p>
                  <h3 className="text-xs font-bold text-gray-900 line-clamp-2">{item.title}</h3>
                  <div className="flex items-center space-x-1 pt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-extrabold text-[#0B0B0D]">BDT {item.currentPrice.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 line-through">BDT {item.originalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ----------------- 12. WOODEN ANNOUNCEMENT BAR ----------------- */}
        <div className="bg-[#2D1E18] text-white rounded-3xl p-6 md:p-8 flex items-center justify-between relative overflow-hidden shadow-md">
          <div className="space-y-1 z-10">
            <p className="text-xs text-[#f0c444] font-bold uppercase tracking-wider">Exclusive Offer</p>
            <h3 className="text-2xl md:text-3xl font-black">Daily Grocery — Tuesday Night Weekend Deal!</h3>
          </div>
          <div className="bg-[#eb5757] text-white px-5 py-2 rounded-xl text-sm font-extrabold z-10 shadow-md shrink-0">
            15% Discount
          </div>
        </div>

        {/* ----------------- 13. MULTI-WIDGET PRODUCT MATRIX ----------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Spotlight Aptamil Box */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-between text-center space-y-4 shadow-xs">
            <span className="text-xs font-extrabold text-[#eb5757] uppercase">Hot Deal</span>
            <div className="text-8xl my-2">🍼</div>
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-gray-900">Aptamil Gold+ ProNutra Infant Formula</h3>
              <div className="flex justify-center space-x-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
              </div>
              <div className="text-xl font-black text-[#0B0B0D]">BDT 2400 – BDT 4000</div>
            </div>
            <button className="bg-[#f0c444] text-[#0B0B0D] py-3 rounded-full font-extrabold text-xs hover:bg-[#e0b434] transition-colors cursor-pointer">
              Add To Cart
            </button>
          </div>

          {/* On Sell Products List */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-2">On Sell Products</h3>
            <div className="space-y-3">
              {sideProducts.map((sp) => (
                <div key={sp.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center text-3xl shrink-0">
                    {sp.imageIcon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{sp.title}</h4>
                    <div className="flex items-center space-x-1 my-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-[#0B0B0D]">BDT {sp.currentPrice.toFixed(2)}</span>
                      <span className="text-[10px] text-gray-400 line-through">BDT {sp.originalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Seller List */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-2">Best Seller</h3>
            <div className="space-y-3">
              {bestSellerProducts.map((bp) => (
                <div key={bp.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center text-3xl shrink-0">
                    {bp.imageIcon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{bp.title}</h4>
                    <div className="flex items-center space-x-1 my-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-[#0B0B0D]">BDT {bp.currentPrice.toFixed(2)}</span>
                      <span className="text-[10px] text-gray-400 line-through">BDT {bp.originalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>

      {/* ----------------- 14. TICKER MARQUEE BANNER ----------------- */}
      <div className="bg-[#f0c444] text-[#0B0B0D] py-3 px-4 text-xs font-extrabold overflow-hidden border-y border-[#e0b434]">
        <div className="flex space-x-8 justify-around whitespace-nowrap animate-pulse">
          <span>◆ Free Standard Delivery On All Orders Above BDT 5000</span>
          <span>◆ Fresh Organic Vegetables & Fruit Direct From Chittagong Farms</span>
          <span>◆ 100% Secure Payment Guarantee</span>
        </div>
      </div>

      {/* ----------------- 15. LATEST NEWS & BLOG ----------------- */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-2xl font-black text-gray-900">Latest News & Blog</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogs.map((b) => (
            <div key={b.id} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-full h-48 bg-[#FFF8E1] flex items-center justify-center text-7xl">
                {b.image}
              </div>
              <div className="p-6 space-y-2">
                <span className="text-[10px] bg-[#FFF8E1] text-[#0B0B0D] font-extrabold px-2.5 py-1 rounded-md uppercase border border-[#f0c444]/30">
                  {b.category}
                </span>
                <h3 className="text-base font-black text-gray-900 leading-snug hover:text-[#0B0B0D] cursor-pointer transition-colors pt-1">
                  {b.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 font-medium">
                  <span>{b.date}</span>
                  <span>{b.author}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ----------------- 16. BRAND LOGO STRIP ----------------- */}
      <div className="bg-white py-8 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between opacity-60 text-sm font-extrabold tracking-wider text-gray-500 overflow-x-auto gap-8">
          <span>BabyCare</span>
          <span>Veggie</span>
          <span>electrostudio</span>
          <span>Kettlepack</span>
          <span>Sweetgram</span>
          <span>Joyfulpark</span>
        </div>
      </div>

      {/* ----------------- 17. VALUE PROPOSITIONS ----------------- */}
      <div className="bg-[#111827] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div className="flex flex-col items-center space-y-2">
            <Truck className="w-6 h-6 text-[#f0c444]" />
            <h4 className="text-xs font-bold">Free Delivery</h4>
            <p className="text-[10px] text-gray-400">For all orders over BDT 5000</p>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <ShieldCheck className="w-6 h-6 text-[#f0c444]" />
            <h4 className="text-xs font-bold">Quality Guarantee</h4>
            <p className="text-[10px] text-gray-400">100% Certified organic</p>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Leaf className="w-6 h-6 text-[#f0c444]" />
            <h4 className="text-xs font-bold">100% Natural</h4>
            <p className="text-[10px] text-gray-400">Direct from local farms</p>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <DollarSign className="w-6 h-6 text-[#f0c444]" />
            <h4 className="text-xs font-bold">Best Price Offer</h4>
            <p className="text-[10px] text-gray-400">Guaranteed lowest pricing</p>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Headphones className="w-6 h-6 text-[#f0c444]" />
            <h4 className="text-xs font-bold">Fast Support 24/7</h4>
            <p className="text-[10px] text-gray-400">Dedicated customer care</p>
          </div>
        </div>
      </div>

      {/* ----------------- 18. FOOTER ----------------- */}
      <footer className="bg-[#0B0B0D] text-white pt-12 pb-6 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-5 gap-8 text-xs pb-12 border-b border-gray-800">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 shrink-0 select-none group">
              <div className="flex items-baseline space-x-1">
                <span className="font-extrabold text-xl text-white tracking-tight uppercase leading-none">
                  LUCKY STORE
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f0c444] inline-block shrink-0" aria-hidden="true" />
                <span className="font-mono text-xs text-gray-400 font-medium ml-0.5">1947</span>
              </div>
            </div>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              Lucky Store is your premier grocery & general storefront in Chittagong, Bangladesh. Delivering fresh farm produce, groceries, and daily essentials since 1947.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-[#f0c444]">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-white cursor-pointer">About Us</li>
              <li className="hover:text-white cursor-pointer">Contact Us</li>
              <li className="hover:text-white cursor-pointer">Shop Products</li>
              <li className="hover:text-white cursor-pointer">Shopping Cart</li>
              <li className="hover:text-white cursor-pointer">Checkout</li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-[#f0c444]">Categories</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-white cursor-pointer">Fresh Vegetables</li>
              <li className="hover:text-white cursor-pointer">Organic Fruits</li>
              <li className="hover:text-white cursor-pointer">Cold Beverages</li>
              <li className="hover:text-white cursor-pointer">Fish & Meats</li>
              <li className="hover:text-white cursor-pointer">Desserts & Bakery</li>
            </ul>
          </div>

          {/* Privacy & Policy */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-[#f0c444]">Privacy Policy</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-white cursor-pointer">Terms & Conditions</li>
              <li className="hover:text-white cursor-pointer">Privacy Policy</li>
              <li className="hover:text-white cursor-pointer">Return Policy</li>
              <li className="hover:text-white cursor-pointer">Help & FAQs</li>
              <li className="hover:text-white cursor-pointer">Vendor Register</li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-[#f0c444]">Sign Up Newsletter</h4>
            <p className="text-gray-400 text-[11px]">Get daily updates and special discounts delivered to your inbox.</p>
            <div className="flex overflow-hidden rounded-lg">
              <input type="email" placeholder="Your Email Address" className="px-3 py-2 text-gray-900 outline-none text-xs flex-1 bg-white" />
              <button className="bg-[#f0c444] text-[#0B0B0D] px-4 font-bold hover:bg-[#e0b434] transition-colors cursor-pointer">Go</button>
            </div>
          </div>

        </div>

        {/* Bottom Copyright Bar */}
        <div className="max-w-7xl mx-auto px-4 pt-6 flex flex-col md:flex-row items-center justify-between text-[11px] text-gray-500 gap-4">
          <p>© 2026 Lucky Store (luckystore1947.com). All Rights Reserved.</p>
          <div className="flex space-x-3 font-bold text-gray-300">
            <span>bKash</span>
            <span>Nagad</span>
            <span>VISA</span>
            <span>MasterCard</span>
          </div>
        </div>
      </footer>

      {/* ----------------- FLOATING ELEMENTS ----------------- */}
      
      {/* Real-time Purchase Toast */}
      <div className="hidden sm:flex fixed bottom-6 left-6 bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl items-start space-x-4 max-w-[320px] z-50 border border-gray-100 animate-fade-in-up">
        <div className="w-12 h-12 md:w-14 md:h-14 bg-[#FFF8E1] rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-[#f0c444]/30 text-2xl md:text-3xl">
          🥭
        </div>
        <div className="pt-0.5">
          <p className="text-[10px] md:text-[11px] text-gray-500 font-medium mb-1">From Chittagong, BD</p>
          <p className="text-xs md:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
            Purchased - Mexican Nature&apos;s Sweet Bounty Fresh Organic Giant Papaya
          </p>
          <p className="text-[10px] md:text-[11px] text-gray-400 mt-1 md:mt-2 font-medium">About 1 month ago</p>
        </div>
      </div>

      {/* Floating Back To Top */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 bg-[#f0c444] text-[#0B0B0D] p-3 rounded-full shadow-2xl hover:bg-[#e0b434] transition-all z-50 cursor-pointer border border-[#f0c444]"
      >
        <ArrowUp className="w-5 h-5" />
      </button>

    </div>
  );
}
