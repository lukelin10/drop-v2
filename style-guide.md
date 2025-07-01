# Drop App Style Guide

## Overview
Drop is a personal journaling and reflection app with AI-powered coaching. The design system emphasizes warmth, mindfulness, and accessibility through a carefully curated earthy color palette and thoughtful typography choices.

## Brand Identity
- **App Name**: Drop
- **Logo**: Water drop icon (drop-logo-final.svg)
- **Design Philosophy**: Warm, mindful, and approachable
- **Target Platform**: Mobile-first web application with plans to extend to native mobile 
- **Max Width**: 512px (lg breakpoint)

## Color Palette

### Primary Brand Colors
```css
/* Core Brand Colors */
--soft-terracotta: #D27D52 (HSL: 23 53% 57%)    /* Primary accent */
--deep-olive: #556B2F (HSL: 82 40% 30%)          /* Secondary accent */
--warm-cream: #F5EFE6 (HSL: 40 33% 93%)          /* Background */
--rich-chestnut: #3B2E2A (HSL: 14 14% 20%)       /* Dark text */
--charcoal-black: #2D2D2D (HSL: 0 0% 18%)        /* Primary text */
--app-background: #F7F7F7 (HSL: 0 0% 97%)        /* Overall background */
```

### Extended Color Variations
```css
/* Terracotta Variations */
--light-terracotta: HSL(23 53% 95%)     /* Light backgrounds */
--medium-terracotta: HSL(23 53% 90%)    /* Medium backgrounds */
--deep-terracotta: HSL(23 53% 40%)      /* Darker accent */

/* Olive Variations */
--light-olive: HSL(82 40% 95%)          /* Light backgrounds */
--medium-olive: HSL(82 40% 90%)         /* Medium backgrounds */

/* Chestnut Variations */
--light-chestnut: HSL(14 14% 95%)       /* Light backgrounds */
```

### Semantic Colors
```css
/* UI System Colors */
--background: var(--warm-cream)          /* Main background */
--foreground: var(--charcoal-black)      /* Primary text */
--card: #FFFFFF                          /* Card backgrounds */
--border: HSL(23 30% 85%)               /* Subtle borders */
--input: #FFFFFF                         /* Input backgrounds */
--muted: HSL(40 15% 85%)                /* Muted backgrounds */
--muted-foreground: HSL(14 14% 30%)     /* Muted text */
--primary: var(--soft-terracotta)       /* Primary actions */
--secondary: var(--deep-olive)          /* Secondary actions */
--destructive: HSL(0 70% 50%)           /* Error states */
```

### Chat-Specific Colors
```css
--user-bubble: var(--soft-terracotta)      /* User message background */
--user-bubble-foreground: #FFFFFF          /* User message text */
--bot-bubble: HSL(0 0% 95%)                /* Bot message background */
--bot-bubble-foreground: var(--charcoal-black) /* Bot message text */
```

### Chart Colors
```css
--chart-1: var(--soft-terracotta)
--chart-2: var(--deep-olive)
--chart-3: HSL(40 33% 80%)
--chart-4: var(--rich-chestnut)
--chart-5: var(--charcoal-black)
```

## Typography

### Font Families
```css
/* Primary Font Stack */
.font-sans {
  font-family: 'Inter', sans-serif;
}

/* Heading Font Stack */
.font-serif {
  font-family: 'Fraunces', serif;
}
```

### Font Sizes & Usage
- **Base Font Size**: 0.9rem (10% smaller than browser default)
- **Body Text**: Inter, 0.9rem, font-weight: 400
- **Headings**: Fraunces, various sizes, font-weight: 400-600
- **Small Text**: 0.75rem (12px)
- **Button Text**: 0.875rem (14px)

### Typography Rules
- **Body content**: Use Inter (sans-serif)
- **Headings (h1-h6)**: Use Fraunces (serif)
- **Questions/Prompts**: Use Fraunces for emphasis
- **Navigation**: Use Inter
- **Labels**: Use Inter

## Spacing & Layout

### Container Constraints
- **Max Width**: 512px (max-w-lg)
- **Horizontal Padding**: 1rem (16px) - `px-4`
- **Bottom Safe Area**: 6rem (96px) - `pb-24` for navigation

### Spacing Scale
- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)
- **2xl**: 2.5rem (40px)

## Border Radius

### Radius Scale
```css
--radius: 1rem;                    /* Base radius */
--radius-sm: calc(var(--radius) - 4px);  /* Small radius */
--radius-md: calc(var(--radius) - 2px);  /* Medium radius */
--radius-lg: var(--radius);              /* Large radius */
```

### Usage Guidelines
- **Cards**: `rounded-2xl` (1rem)
- **Buttons**: `rounded-full` for primary actions, `rounded-lg` for secondary
- **Inputs**: `rounded-[var(--radius)]`
- **Chat Bubbles**: `rounded-2xl`
- **Tags**: `rounded-full`

## Component Patterns

### Cards
```css
.card {
  @apply bg-card text-card-foreground rounded-2xl shadow-sm overflow-hidden border border-border;
}
```

### Buttons
```css
/* Primary Button */
.btn-primary {
  @apply bg-primary text-primary-foreground rounded-full px-4 py-2 hover:opacity-90 transition-all shadow-sm;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-secondary text-secondary-foreground rounded-full px-4 py-2 hover:opacity-90 transition-all shadow-sm;
}

/* Ghost Button */
.btn-ghost {
  @apply bg-transparent text-foreground hover:bg-muted rounded-full px-4 py-2 transition-all;
}
```

### Chat Bubbles
```css
/* User Messages */
.chat-bubble-user {
  @apply bg-[hsl(var(--user-bubble))] text-[hsl(var(--user-bubble-foreground))] rounded-2xl p-4 w-full shadow-sm;
}

/* Bot Messages */
.chat-bubble-bot {
  @apply bg-[hsl(var(--bot-bubble))] text-[hsl(var(--bot-bubble-foreground))] rounded-2xl p-4 w-full shadow-sm border border-border/10;
}
```

### Navigation
```css
.nav-icon {
  @apply flex flex-col items-center justify-center text-xs cursor-pointer transition-all duration-200 ease-in-out px-4 py-2 rounded-lg hover:bg-muted/50;
}

.nav-icon.active {
  @apply bg-primary/10;
}
```

### Form Elements
```css
.search-input {
  @apply w-full bg-input text-foreground rounded-full px-4 py-3 border border-border focus:ring-2 focus:ring-primary focus:outline-none shadow-sm;
}
```

### Tags
```css
.tag {
  @apply inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary;
}

.tag-secondary {
  @apply inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary;
}
```

## Icons

### Icon Library
- **Primary**: Remix Icons (ri-*) - for UI elements and navigation
- **Secondary**: Lucide React - for specific components
- **Sizes**: 
  - Small: 1rem (16px)
  - Medium: 1.25rem (20px)
  - Large: 1.5rem (24px)
  - XL: 2rem (32px)

### Navigation Icons
- **Home/Today**: `ri-water-drop-line`
- **Feed/History**: `ri-history-line`
- **Analytics**: `ri-bar-chart-2-line`
- **Profile/Settings**: `ri-user-line`
- **Notifications**: `ri-notification-3-line`
- **Search**: `ri-search-line`
- **Add**: `ri-add-line`
- **Back**: `ri-arrow-left-s-line`

## Shadows & Elevation
- **Subtle**: `shadow-sm` - for cards and elevated elements
- **Medium**: `shadow-md` - for modals and dropdowns
- **Focus**: `focus:ring-2 focus:ring-primary` - for interactive elements

## Animations & Transitions

### Standard Transitions
```css
/* Default transition */
transition-all duration-200 ease-in-out

/* Hover effects */
hover:opacity-90
hover:bg-muted/50
hover:shadow-md

/* Active states */
active:scale-90 (for buttons)
```

### Loading States
```css
/* Spinner animation */
.animate-spin {
  animation: spin 1s linear infinite;
}

/* Fade in animation */
.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}
```

## Responsive Design

### Breakpoints
- **Mobile First**: Default styles for mobile
- **Container**: Always constrained to max-w-lg (512px)
- **Centered**: `mx-auto` for horizontal centering

### Layout Patterns
- **Full Width**: `w-full` for form elements and cards
- **Padding**: Consistent `px-4` (16px) horizontal padding
- **Safe Areas**: `pb-24` (96px) bottom padding for navigation

## Accessibility

### Focus States
- **Visible focus rings**: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Color contrast**: All text meets WCAG AA standards
- **Interactive elements**: Minimum 44px touch targets

### Semantic HTML
- Proper heading hierarchy (h1-h6)
- Semantic form elements with labels
- ARIA labels for icon-only buttons
- Alt text for images

## Content Guidelines

### Voice & Tone
- **Warm and supportive**: Encouraging without being pushy
- **Mindful**: Thoughtful and present-focused
- **Personal**: Speaks to individual growth
- **Clear**: Simple, jargon-free language

### Microcopy Examples
- **Empty states**: "No reflections yet" / "Begin your reflection journey today"
- **Loading**: "Loading today's question..."
- **Success**: "Reflection Saved" / "Your daily reflection has been saved"
- **Errors**: "There was a problem saving your reflection. Please try again."

## Page-Specific Patterns

### Daily Drop (Home)
- **Question Card**: Gradient from medium-terracotta to light-terracotta
- **Date Badge**: Deep olive background with white text
- **Form**: Large textarea with rounded corners

### Chat Interface
- **Header**: Back button + app logo + title
- **Messages**: Full-width bubbles with proper spacing
- **Input**: Rounded input with send button

### Feed
- **Cards**: Gradient backgrounds matching daily drop style
- **Metadata**: Date and question text prominently displayed
- **Responses**: Subtle background separation

### Analysis
- **Progress Cards**: Visual indicators for completion status
- **Insights**: Bullet points with primary color indicators
- **Empty States**: Encouraging messaging with clear next steps

### Settings
- **Profile Section**: Avatar placeholder with user info
- **Toggle Switches**: Consistent styling across all options
- **Theme Selection**: Visual theme previews

## Implementation Notes

### CSS Custom Properties
All colors are defined as CSS custom properties in HSL format for easy theming and dark mode support.

### Tailwind Configuration
The app uses Tailwind CSS with custom extensions for:
- Brand colors
- Custom animations
- Extended spacing
- Component variants

### Component Library
Based on shadcn/ui "new-york" style with extensive customization for brand colors and styling.

### Performance Considerations
- Lazy loading for page components
- Optimized font loading
- Minimal CSS bundle size through Tailwind's purge system

---

*This style guide should be referenced for all design and development decisions to maintain consistency across the Drop application.* 