# Technology Stack

**Analysis Date:** 2026-01-19

## Languages

**Primary:**
- TypeScript 5.x - All application code (app/, components/, lib/)
- JavaScript ES6+ - Database scripts (scripts/)
- SQL - PostgreSQL database schema and queries

**Secondary:**
- HTML/CSS - Templating (email templates in `lib/email.ts`)

## Runtime

**Environment:**
- Node.js v22.14.0

**Package Manager:**
- npm 10.9.2
- Lockfile: package-lock.json (present)

## Frameworks

**Core:**
- Next.js 16.0.10 - App Router architecture
- React 19.2.0 - UI library
- React DOM 19.2.0 - DOM rendering

**Testing:**
- Not detected - No testing framework configured

**Build/Dev:**
- TypeScript 5.x - Type checking (ignoreBuildErrors: true in next.config.mjs)
- PostCSS 8.5.x - CSS processing
- Tailwind CSS 4.1.9 - Styling framework
- @tailwindcss/postcss 4.1.9 - Tailwind PostCSS plugin
- Autoprefixer 10.4.20 - CSS vendor prefixes

## Key Dependencies

**Critical:**
- @neondatabase/serverless 1.0.2 - PostgreSQL database connection (serverless WebSocket)
- bcryptjs 3.0.3 - Password hashing (10 salt rounds)
- next-auth 4.24.13 - Authentication framework (cookie-based)
- zod 3.25.76 - Schema validation

**Infrastructure:**
- @aws-sdk/client-s3 3.967.0 - S3-compatible object storage (Cloudflare R2)
- @aws-sdk/s3-request-presigner 3.967.0 - Presigned URL generation for R2
- nodemailer latest - Email sending (Gmail SMTP)
- pg 8.16.3 - PostgreSQL client for database scripts
- dotenv 17.2.3 - Environment variable loading

**UI Components:**
- @radix-ui/react-* (60+ components) - Headless UI primitives
- lucide-react 0.454.0 - Icon library
- recharts 2.15.4 - Data visualization
- sonner 1.7.4 - Toast notifications
- cmdk 1.0.4 - Command palette
- vaul 1.1.2 - Drawer component
- embla-carousel-react 8.5.1 - Carousel component

**Forms:**
- react-hook-form 7.60.0 - Form state management
- @hookform/resolvers 3.10.0 - Form validation resolvers
- react-day-picker 9.8.0 - Date picker
- input-otp 1.4.1 - OTP input component

**Utilities:**
- date-fns 4.1.0 - Date manipulation
- class-variance-authority 0.7.1 - CVA utility
- clsx 2.1.1 - Conditional classnames
- tailwind-merge 3.3.1 - Tailwind class merging
- tailwindcss-animate 1.0.7 - Tailwind animations
- tw-animate-css 1.3.3 - Additional animations
- next-themes 0.4.6 - Dark mode support

**Data Processing:**
- xlsx 0.18.5 - Excel file parsing for master data imports

**Monitoring:**
- @vercel/analytics 1.3.1 - Analytics tracking

## Configuration

**Environment:**
- Configuration via `.env.local`
- Required variables: DATABASE_URL, R2_*, GMAIL_*, FROM_EMAIL, NEXT_PUBLIC_APP_URL
- Loaded in Node scripts via dotenv
- Runtime access via process.env

**Build:**
- `next.config.mjs` - Next.js configuration (TypeScript errors ignored, images unoptimized)
- `tsconfig.json` - TypeScript configuration (ES6 target, strict mode, path alias @/*)
- `postcss.config.mjs` - PostCSS configuration (@tailwindcss/postcss plugin)
- `app/globals.css` - Tailwind imports and CSS custom properties
- No Tailwind config file (Tailwind 4.x uses CSS-based configuration)

## Platform Requirements

**Development:**
- Node.js 22.x
- npm 10.x
- PostgreSQL database access (Neon)
- Gmail SMTP credentials for email features
- Cloudflare R2 credentials for file storage

**Production:**
- Next.js compatible hosting (Vercel recommended based on @vercel/analytics)
- Node.js runtime
- Environment variables configured
- External service access: Neon PostgreSQL, Cloudflare R2, Gmail SMTP

---

*Stack analysis: 2026-01-19*
