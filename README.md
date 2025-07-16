# E-commerce Analytics Dashboard

A comprehensive business analytics dashboard for e-commerce operations, built with React, Vite, Tailwind CSS, and Supabase. This platform provides a centralized solution for tracking sales, managing customer data, monitoring inventory, and generating detailed reports with role-based access control.

## 🚀 Features

### 📊 Dashboard Overview
- Real-time business metrics and KPIs
- Revenue tracking and growth analytics
- Customer insights and behavior analysis
- Inventory status monitoring
- Role-based dashboard views (CEO vs Staff)

### 💰 Sales & Revenue Analytics
- Interactive revenue trend charts
- Sales performance tracking
- Top-performing products analysis
- Order value metrics
- Time-based filtering (daily, weekly, monthly)

### 👥 Customer Management
- Customer growth tracking
- Retention rate analysis
- Average order value calculations
- Customer segmentation insights
- Geographic distribution

### 📦 Inventory Management
- Real-time stock level monitoring
- Low stock alerts and notifications
- Product categorization
- Inventory value tracking
- Stock adjustment capabilities

### 📈 Reports & Export
- Comprehensive sales reports
- Customer analytics reports
- Inventory status reports
- PDF and CSV export functionality
- Customizable date ranges

### 🔐 Role-Based Access Control
- **CEO Role**: Full access to all features and sensitive data
- **Staff Role**: Limited access to operational features
- Secure authentication with Supabase Auth
- Protected routes and data access

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **PDF Generation**: jsPDF with autoTable
- **Routing**: React Router DOM

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js (v16 or higher)
- npm or yarn package manager
- A Supabase account and project

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/e-commerce-analytics-dashboard.git
   cd e-commerce-analytics-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   
   The project includes migration files that will set up the required database schema:
   - `supabase/migrations/20250705114521_still_swamp.sql` - Main schema setup
   - `supabase/migrations/20250706182453_foggy_flower.sql` - Role-based access control
   - `supabase/migrations/20250706185656_purple_flower.sql` - User role updates

   Run these migrations in your Supabase dashboard or using the Supabase CLI.

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

The application uses the following main tables:

- **dashboard_users**: User roles and permissions
- **customers**: E-commerce customer data
- **products**: Product inventory information
- **orders**: Customer order records
- **order_items**: Individual items within orders
- **user_sessions**: Dashboard usage tracking

## 🔑 Authentication & Roles

### Default Roles
- **CEO**: Complete access to all features, sales data, and reports
- **Staff**: Access to customers, inventory, and basic dashboard metrics

### User Management
- New users are automatically assigned the "staff" role
- Administrators can update user roles through the database
- Role-based navigation and feature access

## 📱 Usage

### For CEOs
1. Access the full dashboard with revenue metrics
2. View detailed sales analytics and trends
3. Generate and export comprehensive reports
4. Monitor all business KPIs
5. Manage system settings

### For Staff
1. View operational dashboard metrics
2. Manage customer information
3. Monitor and update inventory
4. Track daily tasks and operations

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

## 📊 Sample Data

The migration includes sample data for testing:
- 10 sample products across different categories
- 8 sample customers with order history
- 5 sample orders with realistic data
- Order items linking products to orders

## 🔧 Development

### Project Structure
```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth)
├── lib/               # Utility functions and database
├── pages/             # Main application pages
├── types/             # TypeScript type definitions
└── main.tsx           # Application entry point
```

**Built with ❤️ for modern e-commerce businesses**
