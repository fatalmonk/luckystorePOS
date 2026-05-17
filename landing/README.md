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
cd /Users/mac.alvi/Desktop/Projects/Lucky\ Store/landing-page

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
2. Add your property (URL: https://your-domain.com)
3. Choose "HTML tag" verification method
4. Copy the meta tag content (looks like: `abc123xyz`)
5. Replace `YOUR_VERIFICATION_CODE_HERE` in `index.html`:
   ```html
   <meta name="google-site-verification" content="abc123xyz">
   ```
6. Redeploy
7. Click "Verify" in Search Console

## 📄 Pages Included

- **index.html** - Main landing page
- **privacy-policy.html** - Privacy policy (required by Google Play)
- **terms-of-service.html** - Terms of service

## 🔗 Important Links

Your contact information (already updated):

- Email: luckystore.1947@gmail.com
- Phone: 01731944544
- Address: 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong, Bangladesh
- Google Play Store link (add after publishing)
- App Store link (add after publishing)

## 🎨 Customization

### Colors
The site uses a purple gradient theme (`#667eea` to `#764ba2`).

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
2. Set **Website** to your deployed URL
3. Add **Privacy policy** link

### Apple App Store
1. Go to **App Information**
2. Set **Marketing URL** to your landing page
3. Set **Privacy Policy URL** to privacy-policy.html

## 🌐 Custom Domain (Optional)

To use your own domain:

1. Buy domain (e.g., luckystore.com.bd)
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
