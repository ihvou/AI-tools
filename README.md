# AI Video Ads Hub - Next.js Implementation

A minimal, evidence-driven directory of AI video-ad tools and promo deals, where every claim is backed by a YouTube timestamp "receipt".

## 🚀 Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Radix UI** (for accessible components)

## 📁 Project Structure

```
ai-video-ads-hub/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx           # Root layout with Header/Footer
│   ├── page.tsx             # Homepage
│   ├── tools/               # Tools list pages
│   ├── deals/               # Deals list pages
│   ├── tool/[id]/           # Dynamic tool detail pages
│   └── methodology/         # Methodology page
├── components/
│   ├── ui/                  # Base UI components (Button, Badge, etc.)
│   └── features/            # Feature-specific components (Header, Footer)
├── lib/
│   ├── data/                # Mock data (will connect to Supabase later)
│   ├── types/               # TypeScript type definitions
│   └── utils.ts             # Utility functions
└── public/                  # Static assets
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Git installed
- (Optional) Vercel account for deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

```bash
npm run build
npm start
```

## 📦 Git Repository Setup

### Initial Commit

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit with descriptive message
git commit -m "Initial Next.js implementation with design system

- Set up Next.js 14 with App Router
- Implement design system (Button, Badge, Container, Tabs)
- Create homepage with tools/deals preview and categories
- Add tools list page
- Add deals list page
- Add tool detail page with Reviews/Deals tabs
- Implement Header/Footer with consistent layout
- Add mock data structure
- Configure TypeScript and Tailwind CSS"

# Add remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/AI-tools.git

# Push to main branch
git push -u origin main
```

### Creating Feature Branches

For future development, use feature branches:

```bash
# Create a new feature branch
git checkout -b feature/add-filters

# Make changes, then commit
git add .
git commit -m "Add filter functionality to tools page"

# Push to remote
git push origin feature/add-filters

# Create pull request on GitHub
```

## 🚢 Deployment to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Click "Deploy"

**That's it!** Vercel will automatically deploy on every push to `main`.

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

## 🗺️ Current Implementation Status

### ✅ Completed (Phase 1)
- [x] Design system foundation (tokens, components)
- [x] Next.js App Router structure
- [x] Root layout with Header/Footer
- [x] Homepage with tools/deals preview
- [x] Tools list page
- [x] Deals list page
- [x] Tool detail page (Reviews/Deals tabs)
- [x] Methodology page
- [x] Responsive design
- [x] Mock data structure
- [x] TypeScript types

### 🚧 To Be Implemented (Phase 2)
- [ ] Filters and search functionality
- [ ] Category-specific pages (SEO)
- [ ] Report modal functionality
- [ ] Copy code button
- [ ] Loading states and skeletons
- [ ] Empty states
- [ ] Sort functionality
- [ ] Supabase integration
- [ ] Contact, Privacy, Terms pages

## 📝 Key Design Decisions

### Layout Consistency
- **Container width**: Fixed at 1200px max-width across all pages
- **Padding**: 24px (desktop), 16px (mobile)
- **Header**: Consistent sticky header on all pages

### Color Palette
- **Primary blue**: `#2563eb` (blue-600)
- **Grays**: System grays (50-900)
- **Semantic colors**: Green (Pro), Red (Con), Blue (neutral emphasis)

### Typography
- **Font**: Inter (system font stack)
- **Headings**: Bold, gray-900
- **Body**: Regular, gray-600/900

### Components
- **Button variants**: primary, secondary, ghost
- **Badge variants**: neutral, blue, pro, con
- **Responsive**: Mobile-first approach

## 🔄 Next Steps

1. **Test the current implementation**
   - Run `npm run dev`
   - Check all pages render correctly
   - Test responsive behavior

2. **Deploy to Vercel**
   - Connect GitHub repository
   - Verify production build works

3. **Phase 2 Development**
   - Add filters and search
   - Implement category pages
   - Add Report modal
   - Connect to Supabase

4. **Iterative Improvements**
   - Gather feedback
   - Refine mobile layouts
   - Add animations
   - Optimize performance

## 📚 Documentation References

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [Vercel Deployment](https://vercel.com/docs)

## 🆘 Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run build
```

### Type Errors

Ensure TypeScript is properly configured:

```bash
# Check TypeScript
npx tsc --noEmit
```

### Image Loading Issues

Next.js requires image domains to be configured. If using external images, add to `next.config.js`:

```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**',
    },
  ],
}
```

## 📧 Support

For questions or issues, refer to the project documentation in `/docs` or create an issue in the GitHub repository.
