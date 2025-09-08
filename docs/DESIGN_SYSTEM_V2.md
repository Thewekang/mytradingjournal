# Modern Trading Journal - Design System V2

## 🎯 Design Philosophy
**Professional Trading Platform with Modern Aesthetics**
- **Clean & Minimal**: Reduce visual noise, focus on data clarity
- **Data-Driven**: Charts and metrics take center stage
- **Professional**: Dark mode optimized for extended use
- **Responsive**: Mobile-first approach with desktop optimization
- **Accessible**: WCAG 2.1 AA compliant

## 🎨 Color Palette

### Primary Colors
```css
--primary-50: #eff6ff
--primary-100: #dbeafe
--primary-200: #bfdbfe
--primary-300: #93c5fd
--primary-400: #60a5fa
--primary-500: #3b82f6  /* Main brand */
--primary-600: #2563eb
--primary-700: #1d4ed8
--primary-800: #1e40af
--primary-900: #1e3a8a
--primary-950: #172554
```

### Neutral Colors (Dark Mode Optimized)
```css
--neutral-50: #f8fafc
--neutral-100: #f1f5f9
--neutral-200: #e2e8f0
--neutral-300: #cbd5e1
--neutral-400: #94a3b8
--neutral-500: #64748b
--neutral-600: #475569
--neutral-700: #334155
--neutral-800: #1e293b
--neutral-900: #0f172a
--neutral-950: #020617
```

### Semantic Colors
```css
/* Success - Green */
--success-50: #f0fdf4
--success-500: #10b981
--success-600: #059669
--success-900: #14532d

/* Warning - Amber */
--warning-50: #fffbeb
--warning-500: #f59e0b
--warning-600: #d97706
--warning-900: #78350f

/* Error - Red */
--error-50: #fef2f2
--error-500: #ef4444
--error-600: #dc2626
--error-900: #7f1d1d

/* Info - Blue */
--info-50: #eff6ff
--info-500: #3b82f6
--info-600: #2563eb
--info-900: #1e3a8a
```

### Financial Colors
```css
--profit: #10b981    /* Green for profits */
--loss: #ef4444      /* Red for losses */
--neutral-pnl: #64748b  /* Gray for breakeven */
```

## 📐 Typography Scale

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
--font-mono: 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, Courier, monospace
```

### Type Scale
```css
--text-xs: 0.75rem     /* 12px */
--text-sm: 0.875rem    /* 14px */
--text-base: 1rem      /* 16px */
--text-lg: 1.125rem    /* 18px */
--text-xl: 1.25rem     /* 20px */
--text-2xl: 1.5rem     /* 24px */
--text-3xl: 1.875rem   /* 30px */
--text-4xl: 2.25rem    /* 36px */
--text-5xl: 3rem       /* 48px */
```

### Font Weights
```css
--font-light: 300
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

## 🌊 Spacing System

### Space Scale (8pt grid)
```css
--space-0: 0
--space-1: 0.25rem    /* 4px */
--space-2: 0.5rem     /* 8px */
--space-3: 0.75rem    /* 12px */
--space-4: 1rem       /* 16px */
--space-5: 1.25rem    /* 20px */
--space-6: 1.5rem     /* 24px */
--space-8: 2rem       /* 32px */
--space-10: 2.5rem    /* 40px */
--space-12: 3rem      /* 48px */
--space-16: 4rem      /* 64px */
--space-20: 5rem      /* 80px */
--space-24: 6rem      /* 96px */
```

### Container Sizes
```css
--container-sm: 640px
--container-md: 768px
--container-lg: 1024px
--container-xl: 1280px
--container-2xl: 1536px
```

## 🎭 Component Tokens

### Border Radius
```css
--radius-none: 0
--radius-sm: 0.25rem   /* 4px */
--radius-base: 0.375rem /* 6px */
--radius-md: 0.5rem    /* 8px */
--radius-lg: 0.75rem   /* 12px */
--radius-xl: 1rem      /* 16px */
--radius-full: 9999px
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
```

### Dark Mode Shadows
```css
--shadow-dark-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3)
--shadow-dark-base: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)
--shadow-dark-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)
--shadow-dark-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)
--shadow-dark-xl: 0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)
```

## 🧩 Component Specifications

### Navigation
- **Height**: 64px (desktop), 56px (mobile)
- **Background**: Glass morphism with blur
- **Logo**: 32px height, bold typography
- **Links**: Medium weight, hover with primary color
- **Actions**: Profile dropdown, theme toggle

### Cards
- **Background**: Dark card with subtle border
- **Padding**: 24px (desktop), 16px (mobile)
- **Border Radius**: 12px
- **Shadow**: Medium elevation
- **Hover**: Subtle lift with increased shadow

### Buttons
- **Primary**: Blue gradient with hover effects
- **Secondary**: Outline with hover fill
- **Ghost**: Transparent with hover background
- **Icon**: Square aspect ratio, consistent sizing

### Form Elements
- **Input**: Dark background, focused ring
- **Label**: Medium weight, proper contrast
- **Error**: Red accent with icon
- **Help**: Muted text with proper hierarchy

### Data Tables
- **Header**: Sticky, medium background
- **Rows**: Zebra striping, hover highlight
- **Cells**: Proper padding, aligned content
- **Actions**: Icon buttons with tooltips

### Charts
- **Background**: Transparent or subtle grid
- **Colors**: Financial semantic colors
- **Tooltips**: Dark theme with proper contrast
- **Legends**: Clear labeling with color coding

## 📱 Responsive Breakpoints

```css
/* Mobile first approach */
@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

## ♿ Accessibility Guidelines

### Focus Management
- Visible focus rings with proper contrast
- Logical tab order
- Skip navigation links

### Color Contrast
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text
- Never rely solely on color for meaning

### ARIA Labels
- Proper semantic markup
- Screen reader friendly descriptions
- Live regions for dynamic content

### Motion & Animation
- Respect prefers-reduced-motion
- Subtle transitions (200-300ms)
- No autoplay videos or carousels

## 🎯 Component Priority List

### Phase 1: Foundation
1. **Updated CSS Variables** - New color palette and tokens
2. **Typography System** - Font loading and scale
3. **Layout Components** - Container, Grid, Flex utilities
4. **Navigation Overhaul** - Modern glass morphism design

### Phase 2: Core Components
1. **Button System** - All variants with proper states
2. **Form Elements** - Inputs, selects, validation
3. **Card Components** - Various layouts and elevations
4. **Modal/Dialog** - Accessible overlay components

### Phase 3: Data Visualization
1. **Enhanced Charts** - Modern styling with better UX
2. **Data Tables** - Sortable, filterable, responsive
3. **Metrics Cards** - KPI displays with trend indicators
4. **Dashboard Layouts** - Grid-based responsive layouts

### Phase 4: Advanced Features
1. **Command Palette** - Quick navigation and actions
2. **Toast System** - Non-intrusive notifications
3. **Loading States** - Skeleton screens and spinners
4. **Empty States** - Helpful illustrations and CTAs
