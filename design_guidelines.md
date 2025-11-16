# Sync IoT/AI Platform - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing from The Things Network Console and Airbyte's clean, technical interfaces. These platforms excel at presenting complex technical data clearly while maintaining professional aesthetics. Secondary inspiration from Linear's typography and Stripe's information hierarchy.

## Core Design Principles
1. **Data Clarity First**: Technical information must be scannable and actionable
2. **Progressive Disclosure**: Complex configurations revealed through multi-step flows
3. **Real-time Feedback**: Status indicators, live metrics, and connection states prominent
4. **Professional Minimalism**: Clean, uncluttered interface that scales with data density

## Typography System

**Font Family**: 
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for device IDs, payloads, technical data)

**Type Scale**:
- Page Headers: text-3xl (30px), font-semibold
- Section Headers: text-xl (20px), font-semibold  
- Card Titles: text-sm (14px), font-medium, uppercase tracking-wide
- Body Text: text-sm (14px), font-normal
- Table Headers: text-xs (12px), font-medium, uppercase
- Metrics/KPIs: text-4xl (36px), font-semibold
- Technical Data: text-xs (12px), font-mono

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 10 for consistency
- Component padding: p-6
- Section gaps: gap-6, gap-8
- Card spacing: space-y-4
- Dense tables: py-3 px-4

**Grid Structure**:
- Sidebar: Fixed w-64
- Main content: max-w-7xl with px-10 py-10
- KPI Cards: grid-cols-4 gap-6
- Device/Gateway grids: grid-cols-2 lg:grid-cols-3 gap-4

## Component Library

### Navigation
**Sidebar**: Fixed left navigation with logo at top, main nav in middle, footer at bottom. Active states use subtle background with accent border-left. Icons 20px (w-5 h-5) with matching text.

**Breadcrumbs**: Compact text-sm with separator slashes, current page emphasized.

### Data Display

**KPI Cards**: White background with subtle border, rounded-xl. Icon top-right with status color, metric label text-sm muted, large number text-4xl bold. Hover state with subtle shadow increase.

**Tables**: Striped rows with hover states. Headers with background treatment and uppercase text-xs. Sortable columns with icon indicators. Row actions on hover (edit, delete, configure). Status badges inline with colored backgrounds.

**Status Indicators**: 
- Connected/Active: Green dot + text
- Disconnected/Inactive: Red dot + text  
- Warning: Orange/Yellow
- Processing: Blue pulsing dot

**Charts/Graphs**: Use Recharts library. Card container with white background, title text-xl, chart area minimum h-64. Muted grid lines, accent colors for data series matching brand palette.

### Forms & Inputs

**Input Fields**: Border treatment with focus states, label above input text-sm font-medium. Helper text below in muted color. Validation states with colored borders and icons.

**Buttons**:
- Primary: Accent background, white text, rounded-lg, px-6 py-2.5
- Secondary: White background with border, text matches accent
- Danger: Red treatment for destructive actions
- Icon buttons: Square with padding p-2, hover background

**Modals/Dialogs**: Overlay with backdrop blur, centered card max-w-2xl, header with title and close button, scrollable body, sticky footer with actions.

### Technical Components

**Device Cards**: Show device ID (monospace), status indicator, last seen timestamp, quick actions. Expandable for detailed metrics.

**Event Log**: Terminal-style with monospace font, timestamps left-aligned, color-coded event types (uplink blue, status green, error red).

**Code Blocks**: Dark background with syntax highlighting for payloads, configurations. Copy button top-right.

**Configuration Panels**: Tabbed interface for complex settings. Form groups with clear section headers. Collapsible advanced options.

## Page Layouts

### Dashboard
Hero metrics in 4-column grid, followed by time-series chart full-width, then split view: recent events table (2/3) + quick actions sidebar (1/3).

### Device Management
Search/filter bar at top with "Add Device" button right-aligned. Grid of device cards with status, name, type, last activity. Clicking opens detailed side panel.

### Gateway Management  
Similar to devices but with connection topology visualization. Map view option showing gateway locations and coverage.

### Applications/Integrations
Card grid showing integrated apps with logos, connection status, and configuration access. Flow builder for creating integrations between devices and AI models.

### AI Models
Table view with model name, type, status, accuracy metrics, and actions. Detail view shows training data, parameters, and prediction history.

## Images

No hero images needed - this is a technical dashboard. Use:
- Device/gateway type icons (standardized)
- Integration logos (actual service logos)
- Empty states: Simple illustrations for "no devices" or "no data" screens
- Avatar placeholders for user profiles in admin section