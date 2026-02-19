# Centre Research - Peptide Store Dashboard

A comprehensive e-commerce dashboard built with Next.js, shadcn/ui, and TypeScript for managing a peptide store business.

## Features

### 📊 Dashboard Overview
- **Key Metrics Cards**: Revenue, Orders, Customers, Products
- **Interactive Charts**: Sales trends, customer segments, performance analytics
- **Quick Actions**: Fast access to common tasks
- **Recent Activity**: Latest orders and top-performing products

### 🛒 Order Management
- **Order Tracking**: Complete order lifecycle management
- **Status Management**: Pending, Processing, Shipped, Delivered, Cancelled, Refunded
- **Advanced Filtering**: Search by order ID, customer, status, payment method
- **Order Details**: Customer info, payment tracking, shipping details
- **Bulk Actions**: Export, print invoices, manage multiple orders

### 📦 Product Management
- **Product Catalog**: Complete product listing with images and descriptions
- **Inventory Tracking**: Real-time stock levels and low stock alerts
- **Product Variants**: Support for different sizes, colors, materials
- **Category Management**: Organize products into logical groups
- **Pricing**: Regular and sale price management
- **SEO Optimization**: Meta titles, descriptions, URL slugs
- **Grid/Table Views**: Flexible product display options

### 👥 Customer Management
- **Customer Profiles**: Detailed customer information and contact details
- **Customer Types**: B2C, B2B, and Enterprise segmentation
- **Order History**: Complete customer purchase history
- **Customer Analytics**: Top customers, recent registrations
- **Communication Tools**: Email integration and contact management

### 📈 Analytics & Reporting
- **Sales Analytics**: Revenue trends, daily/monthly reports
- **Product Performance**: Best sellers, low performers
- **Customer Insights**: Acquisition, lifetime value, satisfaction
- **Geographic Data**: Sales by region and location
- **Conversion Funnel**: Track customer journey from visit to purchase

### ⚙️ Settings & Configuration
- **Store Information**: Basic store details and branding
- **Payment Gateways**: Stripe, PayPal, bank transfer integration
- **Shipping Zones**: Configure rates for different regions
- **Tax Settings**: Tax rates and calculation methods
- **Email Templates**: Customizable notification templates
- **User Management**: Team members and role-based permissions

## Technology Stack

- **Frontend**: Next.js 15.3.4, React 19, TypeScript
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Theme**: Dark/Light mode support with next-themes

## Getting Started

1. **Install Dependencies**
   ```bash
   cd nextjs-frontend
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open Dashboard**
   Navigate to `http://localhost:3000`

## Project Structure

```
nextjs-frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── analytics/         # Analytics dashboard
│   │   ├── customers/         # Customer management
│   │   ├── orders/            # Order management
│   │   ├── products/          # Product catalog
│   │   └── settings/          # Settings pages
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── dashboard/         # Dashboard layout components
│   │   ├── analytics/         # Analytics components
│   │   ├── customers/         # Customer components
│   │   ├── orders/            # Order components
│   │   ├── products/          # Product components
│   │   └── settings/          # Settings components
│   ├── hooks/                 # Custom React hooks
│   └── lib/                   # Utility functions
```

## Key Components

### Dashboard Layout
- **Responsive Sidebar**: Collapsible navigation with hierarchical menu
- **Header**: Search, notifications, theme toggle, user menu
- **Main Content**: Dynamic content area for each section

### Data Management
- **Mock Data**: Realistic sample data for all entities
- **State Management**: React hooks for component state
- **Filtering & Search**: Advanced filtering across all sections

### UI/UX Features
- **Theme Support**: Light/dark mode toggle
- **Responsive Design**: Mobile-first approach
- **Loading States**: Proper loading and error handling
- **Accessibility**: ARIA labels and keyboard navigation

## Design Philosophy

The dashboard follows Shopify's design principles:
- **Clean & Modern**: Minimalist interface with focus on content
- **Data-Driven**: Rich analytics and reporting capabilities
- **User-Friendly**: Intuitive navigation and workflows
- **Scalable**: Component-based architecture for easy extension
- **Consistent**: Unified design system using shadcn/ui

## Customization

### Colors & Theming
The dashboard uses CSS custom properties for theming. Colors can be easily changed by modifying the CSS variables in `globals.css`.

### Adding New Pages
1. Create page in `src/app/[route]/page.tsx`
2. Create content component in `src/components/[route]/`
3. Add navigation link in `dashboard-sidebar.tsx`

### Extending Components
All components are built with shadcn/ui and can be easily customized or extended using the component API.

## Future Enhancements

- **Real API Integration**: Connect to Node.js backend
- **Real-time Updates**: WebSocket integration for live data
- **Advanced Analytics**: More detailed reporting and insights
- **Inventory Management**: Advanced stock management features
- **Marketing Tools**: Campaign management and automation
- **Payment Processing**: Real payment gateway integration

## License

This project is part of the Centre Research e-commerce platform development.
