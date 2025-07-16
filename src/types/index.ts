export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  amount: number;
  product_name: string;
  quantity: number;
  created_at: string;
  user_id: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  category: string;
  created_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  session_duration: number;
  created_at: string;
}

export interface DashboardMetrics {
  totalSales: number;
  activeUsers: number;
  lowInventoryCount: number;
  salesGrowth: number;
  userGrowth: number;
}