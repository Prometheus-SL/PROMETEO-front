# PROMETEO Frontend - AI Coding Instructions

## Project Overview

PROMETEO is a React + TypeScript + Vite frontend application built with shadcn/ui components and Tailwind CSS v4. This is a modern single-page application using the latest React 19 features.

## Architecture & Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7 with HMR and path aliases
- **Styling**: Tailwind CSS v4 with CSS variables and custom theming
- **UI Components**: shadcn/ui (New York style) with Radix UI primitives
- **State Management**: Built-in React state (no external state library)
- **Icons**: Lucide React

## Key Conventions & Patterns

### Path Aliases & Imports

- Use `@/` prefix for all internal imports: `import { Button } from "@/components/ui/button"`
- Absolute imports configured via Vite alias: `"@": path.resolve(__dirname, "./src")`
- Component imports: `@/components`, utilities: `@/lib/utils`, hooks: `@/hooks`

### Component Structure

- **UI Components**: Located in `src/components/ui/` (shadcn/ui components)
- **Custom Components**: Place in `src/components/` (business logic components)
- All components use TypeScript with proper prop typing
- shadcn/ui components follow the compound component pattern with variants

### Styling Approach

- **Tailwind CSS v4**: Uses new `@import "tailwindcss"` syntax in `src/index.css`
- **CSS Variables**: Extensive use of CSS custom properties for theming
- **Dark Mode**: Implemented via `@custom-variant dark (&:is(.dark *))`
- **Component Variants**: Use `class-variance-authority` (cva) for component styling
- **Utility Function**: `cn()` function combines `clsx` and `tailwind-merge` for conditional classes

### shadcn/ui Integration

- Configuration in `components.json` specifies New York style with zinc base color
- Components use Radix UI primitives with custom styling
- All UI components include proper TypeScript definitions and variant props
- Use `asChild` prop pattern for polymorphic components (see Button component)

## Development Workflows

### Essential Commands

```bash
npm run dev          # Start development server with HMR
npm run build        # TypeScript compilation + Vite build
npm run lint         # ESLint with TypeScript and React rules
npm run preview      # Preview production build locally
```

### Adding New shadcn/ui Components

- Use shadcn/ui CLI or manually add components to `src/components/ui/`
- Follow existing patterns in `button.tsx` for variant definitions
- Maintain consistent prop interfaces and TypeScript definitions

### ESLint Configuration

- Uses modern ESLint flat config with TypeScript integration
- Includes React Hooks rules and React Refresh for HMR
- TypeScript strict mode enabled with proper path resolution

## Critical Files & Dependencies

### Configuration Files

- `vite.config.ts`: Build configuration with React plugin and path aliases
- `components.json`: shadcn/ui configuration defining aliases and styling
- `eslint.config.js`: Flat config with TypeScript and React rules
- `src/index.css`: Tailwind v4 imports and CSS variable definitions

### Core Utilities

- `src/lib/utils.ts`: Contains `cn()` utility for conditional CSS classes
- Always use `cn()` for combining Tailwind classes and conditional styling

### Project Structure

```
src/
├── components/
│   └── ui/           # shadcn/ui components (Button, etc.)
├── lib/
│   └── utils.ts      # Utility functions (cn, etc.)
├── assets/           # Static assets
├── App.tsx           # Main application component
└── main.tsx          # Application entry point
```

## Key Integration Points

- **Radix UI**: Provides accessible component primitives
- **Tailwind CSS v4**: Latest version with new CSS-first architecture
- **TypeScript**: Strict mode with proper type definitions for all components
- **Vite**: Fast development with React Fast Refresh and TypeScript integration

## Component Development Patterns

- Use compound component patterns for complex UI elements
- Implement proper TypeScript interfaces for all props
- Leverage `VariantProps` from class-variance-authority for styling variants
- Follow shadcn/ui patterns for consistency and maintainability
- Always include proper accessibility attributes from Radix UI primitives

When adding new features, prioritize type safety, accessibility, and consistency with existing shadcn/ui patterns.
