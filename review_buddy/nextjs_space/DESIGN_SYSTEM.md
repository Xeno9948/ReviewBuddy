# Review-buddy Design System

This document serves as the single source of truth for the visual design of the Review-buddy application. All new features and pages must adhere to these guidelines to ensure consistency.

## Design Philosophy
"Premium, Apple-like, Glassmorphic."
The design should feel light, airy, and sophisticated. Use generous whitespace, subtle shadows, and blur effects to create depth.

## Core Tokens

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: Light (300) for large headings, Regular (400) for body, Medium (500) for UI elements, SemiBold (600) for emphasis.

### Color Palette
- **Background**: `#f5f5f7` (Light Gray - Main App Background)
- **Surface (Card)**: `#ffffff` (White - Content Cards)
- **Sidebar**: `rgba(255, 255, 255, 0.7)` with `backdrop-filter: blur(20px)`
- **Borders**: `#e5e5e7` (Subtle dividers)
- **Primary Gradient**: `linear-gradient(135deg, #064e3b 0%, #1e3a8a 100%)` (Emerald to Deep Blue)
- **Text**:
  - Primary: `#1d1d1f` (Nearly Black)
  - Secondary: `#86868b` (Gray)

### Shapes & Geometry
- **Squircles**: Use large border radii for cards and interactive elements.
  - Cards: `rounded-3xl` (24px)
  - Buttons: `rounded-xl` or `rounded-full`
  - Inputs: `rounded-xl`

### Shadows & Depth
- **Card Shadow**: `box-shadow: 0 4px 24px rgba(0,0,0,0.04);`
- **Glass Effect**: Used for Sidebars and Overlays.

## Component Guide

### 1. Page Layout
- **Sidebar**: Fixed width (e.g., 280px), glassmorphic, thin border right.
- **Main Content**: Light gray background (`#f5f5f7`), extensive padding (p-8 to p-12).

### 2. Cards
- White background (`bg-white`)
- `rounded-3xl`
- `border border-white/50` or `border-slate-200`
- Subtle shadow

### 3. Navigation Links
- Default: Text gray (`#86868b`), iconic.
- Active: Gradient background (Emerald->Blue), White text, Soft shadow.

### 4. Headings
- Large, light weight, tracking tight.
- Example: `text-4xl font-light tracking-tight text-slate-900`

## CSS Variables (Tailwind Extension)
We extend the Tailwind theme to include these precise values.
- `colors.apple.bg`: `#f5f5f7`
- `colors.apple.card`: `#ffffff`
- `colors.brand.start`: `#064e3b`
- `colors.brand.end`: `#1e3a8a`
