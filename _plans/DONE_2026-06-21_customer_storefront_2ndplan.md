Here is a suite of meta-prompts designed to refactor the Lucky Store UI.

### The "System Context" Prompt

*Before running the feature-specific prompts, feed your AI this context so it understands the rules of your codebase.*

> **System Prompt:**
> "You are an expert frontend developer. We are updating the 'Lucky Store' e-commerce UI. Our goal is to improve the user experience without losing the app's fast, utilitarian, and mobile-first feel.
> **Strict Constraints:**
> 1. Use ONLY our established Tailwind CSS design tokens. Do not introduce arbitrary values (e.g., avoid `w-[320px]`, use `w-80`).
> 2. Maintain the current minimalist color palette. Use our existing brand colors and standard Tailwind gray scales.
> 3. Keep the inline quantity adjusters (+ and - buttons) exactly as they are—they are critical for our fast-checkout flow.
> 4. Ensure all new layout elements are responsive but heavily optimized for mobile viewports."
> 
> 

---

### Feature 1: Promotional Badging & Pricing Psychology

This prompt updates the individual product card to handle sales and discounts visually.

> **Prompt:**
> "Refactor our existing Product Card component to support promotional states.
> **Requirements:**
> * Add an optional `badge` prop (e.g., 'On Sale', 'New', 'Clearance'). If present, display it as a small, absolute-positioned pill over the top-left of the product image using standard Tailwind utility classes (e.g., `bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium`).
> * Update the pricing section to accept an `originalPrice` prop. If `originalPrice` exists, display it immediately before the current price.
> * Format the `originalPrice` with a strike-through (`line-through`), a smaller text size (`text-sm`), and a muted color (`text-gray-400`).
> * Ensure the current price remains bold and prominent. Do not change the layout of the +/- quantity buttons."
> 
> 

---

### Feature 2: Horizontal Scrolling (Carousels) for Categories

This prompt breaks up the endless vertical scroll into digestible, swipeable rows.

> **Prompt:**
> "Create a new `ProductCarousel` component to replace our single vertical 'Popular Now' list.
> **Requirements:**
> * The component should take a `title` prop (e.g., 'Daily Essentials') and an array of product objects.
> * Display the title as a section header (`text-lg font-bold mb-3`).
> * Implement a horizontal scrolling container using Tailwind. Use `flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4`.
> * Hide the scrollbar for a cleaner look (use CSS hide-scrollbar utilities if configured, or standard `-ms-overflow-style: none; scrollbar-width: none;`).
> * Ensure each product card inside the carousel has a fixed width on mobile (e.g., `w-40` or `w-48`) and snaps to the start (`snap-start`) so users can easily swipe through items."
> 
> 

---

### Feature 3: Visual Navigation Pills

This prompt transforms the text-heavy category list into a modern app-like navigation bar.

> **Prompt:**
> "Refactor the 'Categories' section from a vertical text list into a horizontally scrollable row of visual navigation pills.
> **Requirements:**
> * Wrap the category links in a horizontal scrolling container (`flex overflow-x-auto gap-2 py-2 hide-scrollbar`).
> * Style each category item as a clickable pill button. Use standard Tailwind classes like `whitespace-nowrap px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-medium`.
> * Add an 'active' state styling (e.g., `bg-blue-600 text-white`) for the currently selected category.
> * Keep the emojis next to the text, but ensure they are aligned centrally within the pill."
> 
> 

---

### Feature 4: Richer Product Imagery

This prompt ensures the layout doesn't break when images are missing and standardizes the image display.

> **Prompt:**
> "Update the Product Card component to standardize how we display product images, replacing the reliance on emojis.
> **Requirements:**
> * Wrap the image in a container with a fixed aspect ratio (use Tailwind's `aspect-square`).
> * Apply `object-cover` to the `<img>` tag to ensure images fill the space uniformly without distortion.
> * Add a unified fallback state: If a product does not have an `imageUrl`, render a light gray placeholder div (`bg-gray-100 rounded-md flex items-center justify-center`) containing a generic box icon or the product's assigned emoji.
> * Apply a subtle rounded corner (`rounded-md` or `rounded-lg`) to the image container to match modern UI standards."
> 
> 

---

### Feature 5: Thematic or Seasonal Banners

This prompt builds a lightweight promotional hero section that sits at the top of the feed.

> **Prompt:**
> "Create a lightweight `HeroBanner` component to sit below the search bar and above the categories.
> **Requirements:**
> * The banner should be a full-width container with standard padding (`mx-4 my-2 rounded-xl overflow-hidden relative`).
> * It needs to support either a background image (`bg-cover bg-center`) or a simple Tailwind color gradient (e.g., `bg-gradient-to-r from-blue-50 to-blue-100`).
> * Include a title (e.g., 'Free Delivery on orders ৳500+') and a subtitle. Use our standard typography tokens.
> * Ensure the text is legible regardless of the background by adding an optional dark overlay (`bg-black/20`) if a background image is used.
> * Keep it concise so it doesn't push the actual products too far down the screen (max height of around `h-32` or `h-40`)."
> 
>