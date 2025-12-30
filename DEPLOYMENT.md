# Deployment Guide - Ikhtiar-Ku

Panduan lengkap untuk deploy aplikasi Ikhtiar-Ku ke berbagai platform.

## 📋 Prerequisites

- Node.js 18+ installed
- npm atau yarn
- Git (untuk version control)
- Production build tested locally

## 🏗️ Build Production

```bash
# Install dependencies
npm install

# Build untuk production
npm run build

# Preview build locally (optional)
npm run preview
```

**Output:** Folder `dist/` berisi semua file production-ready.

**Verifikasi Build:**
```bash
cd dist/
ls -la

# Should see:
# - index.html
# - offline.html  (PWA offline page)
# - sw.js         (Service Worker)
# - assets/       (JS, CSS, images)
# - manifest.json
# - logo.svg
```

---

## 🚀 Deployment Options

### 1. Vercel (Recommended) ⚡

**Why Vercel:**
- ✅ Zero-config deployment
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Instant rollbacks
- ✅ Free tier available

**Steps:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Or via GitHub:**
1. Push code ke GitHub repository
2. Import project di [vercel.com](https://vercel.com)
3. Configure build:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

**Custom Domain:**
```bash
vercel domains add yourdomain.com
```

**Environment Variables:**
```bash
vercel env add VITE_GEMINI_API_KEY
# Paste your API key when prompted
```

---

### 2. Netlify 🌐

**Why Netlify:**
- ✅ Simple drag-and-drop
- ✅ Form handling
- ✅ Serverless functions support
- ✅ Free tier dengan custom domain

**Via Web UI:**
1. Build locally: `npm run build`
2. Go to [app.netlify.com](https://app.netlify.com)
3. Drag `dist/` folder ke deploy area
4. Done! 🎉

**Via Netlify CLI:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

**netlify.toml** (for automatic deploys):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    Service-Worker-Allowed = "/"
```

---

### 3. GitHub Pages 📄

**Why GitHub Pages:**
- ✅ Free untuk public repos
- ✅ Direct dari GitHub
- ✅ Simple setup

**Steps:**

1. **Install gh-pages**
```bash
npm install --save-dev gh-pages
```

2. **Add deploy script** to `package.json`:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. **Update vite.config.ts** with base path:
```typescript
export default defineConfig({
  base: '/ikhtiar-ku/', // Your repo name
  // ... rest of config
});
```

4. **Deploy:**
```bash
npm run deploy
```

5. **Enable GitHub Pages:**
   - Go to repo Settings → Pages
   - Source: gh-pages branch
   - Save

**Access:** `https://username.github.io/ikhtiar-ku/`

---

### 4. Firebase Hosting 🔥

**Why Firebase:**
- ✅ Google infrastructure
- ✅ Free tier generous
- ✅ Easy rollbacks
- ✅ Custom domains

**Steps:**

```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Select:
# - Public directory: dist
# - Single-page app: Yes
# - Automatic builds: No

# Deploy
firebase deploy --only hosting
```

**firebase.json:**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/sw.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      }
    ]
  }
}
```

---

### 5. Cloudflare Pages ☁️

**Why Cloudflare:**
- ✅ Super fast global CDN
- ✅ Free unlimited bandwidth
- ✅ Web analytics included
- ✅ DDoS protection

**Via Dashboard:**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Pages → Create project
3. Connect GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Build output: `dist`
5. Deploy

**Via Wrangler CLI:**
```bash
# Install Wrangler
npm i -g wrangler

# Login
wrangler login

# Deploy
wrangler pages publish dist --project-name=ikhtiar-ku
```

---

### 6. Render 🎨

**Why Render:**
- ✅ Zero-config static sites
- ✅ Free SSL
- ✅ Auto-deploy from Git
- ✅ Preview environments

**Steps:**
1. Go to [render.com](https://render.com)
2. New → Static Site
3. Connect repository
4. Configure:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
5. Create Static Site

---

### 7. AWS S3 + CloudFront 🌍

**Why AWS:**
- ✅ Enterprise-grade
- ✅ Full control
- ✅ Scalable
- ⚠️ Complex setup

**Quick Guide:**

1. **Create S3 Bucket**
2. **Enable Static Website Hosting**
3. **Upload dist/ contents**
4. **Create CloudFront Distribution**
5. **Point to S3 bucket**
6. **Configure custom domain** (optional)

**Detailed Tutorial:** [AWS S3 Static Hosting Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)

---

## 🔧 Post-Deployment Configuration

### SSL/HTTPS

**All recommended platforms** provide free SSL automatically.

If self-hosting, use [Let's Encrypt](https://letsencrypt.org/).

### Custom Domain

**DNS Configuration:**
```
Type    Name    Value                    TTL
A       @       your.provider.ip         3600
CNAME   www     your.app.provider.com    3600
```

**For Vercel:**
```bash
vercel domains add yourdomain.com
# Follow instructions to add DNS records
```

### Environment Variables

**For platforms with secret management:**

```bash
# Vercel
vercel env add VITE_GEMINI_API_KEY

# Netlify
netlify env:set VITE_GEMINI_API_KEY your_key

# GitHub Actions
# Add in repo Settings → Secrets → Actions
```

**⚠️ Important:** Never commit `.env.local` to Git!

---

## 📊 PWA Verification

After deployment, verify PWA features:

### 1. Lighthouse Audit

```bash
# Install Lighthouse CLI
npm i -g lighthouse

# Run audit
lighthouse https://your-app.com --view
```

**Target Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+
- PWA: ✅

### 2. PWA Checklist

- [ ] ✅ HTTPS enabled
- [ ] ✅ Service Worker registered
- [ ] ✅ Manifest.json accessible
- [ ] ✅ Icons provided (180x180, 192x192, 512x512)
- [ ] ✅ Offline page works
- [ ] ✅ "Add to Home Screen" prompt appears

### 3. Test Offline Mode

1. Open app in browser
2. Open DevTools → Application → Service Workers
3. Check "Offline" checkbox
4. Reload page
5. Verify app still works

---

## 🔍 Monitoring & Analytics

### Google Analytics (Optional)

Add to `index.html` before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Error Monitoring

Consider integrating:
- [Sentry](https://sentry.io) - Error tracking
- [LogRocket](https://logrocket.com) - Session replay
- [Bugsnag](https://bugsnag.com) - Exception monitoring

---

## 🚨 Troubleshooting

### Issue: Service Worker Not Updating

**Solution:**
```javascript
// In sw.js, increment version
const CACHE_NAME = 'ikhtiar-ku-v1.2.1'; // Increment minor version

// Force clients to use new SW
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### Issue: 404 on Refresh

**Solution:** Configure server to serve `index.html` for all routes.

**Vercel:** (Auto-configured)

**Netlify:** Add `_redirects` file:
```
/*    /index.html   200
```

**Firebase:** (Already in firebase.json rewrites)

### Issue: Assets Not Loading

**Solution:** Check `base` in vite.config.ts:

```typescript
export default defineConfig({
  base: '/', // For root domain
  // OR
  base: '/ikhtiar-ku/', // For subdirectory
});
```

### Issue: Slow First Load

**Solutions:**
1. Enable Brotli compression (most hosts auto-enable)
2. Add `preload` for critical resources in index.html
3. Use CDN for external resources
4. Enable HTTP/2 (most modern hosts auto-enable)

---

## 📈 Performance Optimization

### 1. Compression

Most platforms auto-enable, but verify:

```bash
# Test if gzip/brotli enabled
curl -H "Accept-Encoding: gzip,br" -I https://your-app.com
```

### 2. Caching Headers

**For Vercel** add `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### 3. CDN Optimization

All recommended platforms use global CDN by default. No extra config needed.

---

## 🔒 Security Headers

**Add in platform config:**

```json
{
  "headers": [
    {
      "key": "X-Frame-Options",
      "value": "DENY"
    },
    {
      "key": "X-Content-Type-Options",
      "value": "nosniff"
    },
    {
      "key": "Referrer-Policy",
      "value": "strict-origin-when-cross-origin"
    },
    {
      "key": "Permissions-Policy",
      "value": "geolocation=(self), microphone=(self)"
    }
  ]
}
```

---

## ✅ Deployment Checklist

Before going live:

- [ ] Run `npm run build` successfully
- [ ] Test production build locally with `npm run preview`
- [ ] All TypeScript errors resolved
- [ ] No console errors in browser
- [ ] PWA features working (offline, install prompt)
- [ ] Lighthouse audit passed (90+ scores)
- [ ] Tested on real mobile devices (iOS + Android)
- [ ] Tested offline functionality
- [ ] Custom domain configured (if applicable)
- [ ] Analytics integrated (if desired)
- [ ] Error monitoring set up (if desired)
- [ ] Backup data export tested
- [ ] Legal docs reviewed (privacy policy, terms)

---

## 📞 Support

**Issues during deployment?**
- Check [GitHub Issues](https://github.com/your-repo/ikhtiar-ku/issues)
- Read platform-specific docs
- Join community discussions

---

## 🎉 Success!

App deployed? Congrats! 🎊

**Next Steps:**
1. Share link dengan para driver
2. Collect feedback
3. Monitor errors
4. Iterate & improve

**Semoga berkah untuk para driver ojol Indonesia!** 🇮🇩🚀

---

**Last Updated:** 30 December 2024
**Version:** 1.2.0
