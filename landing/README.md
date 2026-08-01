# Lucky Store POS - Landing Page

This is the public landing page for Lucky Store POS app, designed to pass app store verification requirements.

## 📋 Verification Requirements Fixed

✅ **Website ownership** - Add Google verification meta tag  
✅ **Privacy policy link** - Dedicated privacy-policy.html page  
✅ **Publicly accessible** - No login required  
✅ **App purpose explained** - Clear description of features

## 🚀 Deploy to Vercel

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to this folder
cd /Users/mac.alvi/Desktop/Projects/Lucky\ Store/landing

# Deploy
vercel --prod
```

### Option 2: GitHub + Vercel Integration

1. Push this folder to a GitHub repository
2. Connect repository to Vercel
3. Deploy automatically

### Option 3: Drag & Drop

1. Go to [vercel.com](https://vercel.com)
2. Drag this folder to deploy

## 🔍 Google Site Verification

To verify ownership:

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your property (URL: https://luckystore1947.com)
3. Choose "HTML tag" verification method
4. Copy the meta tag content
5. HTML tag in `index.html`:
   ```html
   <meta name="google-site-verification" content="10811156927444855134">
   ```
6. Redeploy
7. Click "Verify" in Search Console

## 📄 Pages Included

- **index.html** - Main landing page (includes GroceryStore JSON-LD schema & cache-busted favicons)
- **privacy-policy.html** - Privacy policy (required by Google Play)
- **terms-of-service.html** - Terms of service
- **data-deletion.html** - Data deletion instructions

## 🔗 Important Links

Your contact information (already updated):

- Email: hello@luckystore1947.com
- Phone: +880 1731-944544
- Address: 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong, Bangladesh
- Primary Domain: https://luckystore1947.com

## 🎨 Customization

### Colors
The site uses the Lucky Store brand color system:
- **Brand Accent / Saffron:** `#f0c444` (RGB 240, 196, 68)
- **Primary / Deep Night:** `#0B0B0D` (RGB 11, 11, 13)

### Logo
Replace the emoji logo (🏪) in `index.html` with your actual logo image:
```html
<div class="logo">
  <img src="your-logo.png" alt="Lucky Store POS">
</div>
```

### Content
Update all placeholder text:
- Business description
- Contact information
- Feature descriptions
- Download links

## 📱 App Store Requirements

### Google Play Console
1. Go to **Store presence** → **Main store listing**
2. Set **Website** to https://luckystore1947.com
3. Add **Privacy policy** link

### Apple App Store
1. Go to **App Information**
2. Set **Marketing URL** to https://luckystore1947.com
3. Set **Privacy Policy URL** to https://luckystore1947.com/privacy-policy.html

## 🌐 Custom Domain

Primary production domain:

1. Domain: `https://luckystore1947.com`
2. In Vercel dashboard: **Settings** → **Domains**
3. Add your domain
4. Update DNS records as instructed

## 📝 Meta Tags for SEO

The page includes important meta tags:
- `description` - For search engines
- `author` - Your company name
- `google-site-verification` - For ownership proof

## 🆘 Support

For issues with deployment:
- Vercel Docs: https://vercel.com/docs
- Google Play Support: https://support.google.com/googleplay
