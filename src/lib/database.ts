import { supabase } from './supabase';

export interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  stock_quantity: number;
  low_stock_threshold: number;
  category: string;
  sku?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  order_number: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  payment_method?: string;
  payment_status: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  action: string;
  page_visited?: string;
  session_duration: number;
  created_at: string;
}

// Dashboard metrics
export const getDashboardMetrics = async () => {
  try {
    // Get total revenue from orders
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount, status');
    
    if (ordersError) throw ordersError;
    
    const totalRevenue = ordersData?.reduce((sum, order) => 
      sum + (order.status === 'delivered' ? Number(order.total_amount) || 0 : 0), 0) || 0;

    // Get total customers
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id');
    
    if (customersError) throw customersError;
    
    const totalCustomers = customersData?.length || 0;

    // Get low inventory count
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('products')
      .select('stock_quantity, low_stock_threshold')
      .eq('is_active', true);
    
    if (inventoryError) throw inventoryError;
    
    const lowInventoryCount = inventoryData?.filter(
      item => (item.stock_quantity || 0) <= (item.low_stock_threshold || 0)
    ).length || 0;

    // Calculate revenue growth (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const { data: recentOrders, error: recentOrdersError } = await supabase
      .from('orders')
      .select('total_amount, created_at, status')
      .gte('created_at', sixtyDaysAgo.toISOString())
      .eq('status', 'delivered');
    
    if (recentOrdersError) throw recentOrdersError;
    
    const currentPeriodRevenue = recentOrders?.filter(
      order => new Date(order.created_at) >= thirtyDaysAgo
    ).reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;
    
    const previousPeriodRevenue = recentOrders?.filter(
      order => new Date(order.created_at) < thirtyDaysAgo
    ).reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;
    
    const revenueGrowth = previousPeriodRevenue > 0 
      ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
      : 0;

    return {
      totalRevenue,
      totalCustomers,
      lowInventoryCount,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    throw error;
  }
};

// Sales/Revenue data
export const getSalesData = async (timeRange: 'daily' | 'weekly' | 'monthly' = 'daily') => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, created_at, status')
      .eq('status', 'delivered')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching sales data:', error);
    throw error;
  }
};

export const getTopProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        product_name,
        quantity,
        total_price,
        product_id,
        products!inner(name, price)
      `);
    
    if (error) throw error;
    
    // Group by product and sum quantities/revenue
    const productMap = new Map();
    data?.forEach(item => {
      const existing = productMap.get(item.product_name) || { sales: 0, revenue: 0 };
      productMap.set(item.product_name, {
        name: item.product_name,
        sales: existing.sales + (Number(item.quantity) || 0),
        revenue: existing.revenue + (Number(item.total_price) || 0)
      });
    });
    
    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  } catch (error) {
    console.error('Error fetching top products:', error);
    throw error;
  }
};

// Customer analytics
export const getCustomerData = async () => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching customer data:', error);
    throw error;
  }
};

export const getCustomerMetrics = async () => {
  try {
    // Get customer growth data
    const { data: customers, error } = await supabase
      .from('customers')
      .select('created_at, total_orders, total_spent');
    
    if (error) throw error;
    
    const totalCustomers = customers?.length || 0;
    const avgOrderValue = customers?.length > 0
      ? customers.reduce((sum, customer) => sum + (Number(customer.total_spent) || 0), 0) / 
        customers.reduce((sum, customer) => sum + (Number(customer.total_orders) || 0), 0)
      : 0;
    
    const repeatCustomers = customers?.filter(customer => customer.total_orders > 1).length || 0;
    const retentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    
    return {
      totalCustomers,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      retentionRate: Math.round(retentionRate * 10) / 10,
      newCustomersThisMonth: customers?.filter(customer => {
        const customerDate = new Date(customer.created_at);
        const thisMonth = new Date();
        return customerDate.getMonth() === thisMonth.getMonth() && 
               customerDate.getFullYear() === thisMonth.getFullYear();
      }).length || 0,
    };
  } catch (error) {
    console.error('Error fetching customer metrics:', error);
    throw error;
  }
};

// Inventory management
export const getInventoryItems = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
};

export const updateProductStock = async (id: string, newStock: number) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    return data?.[0];
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
};

// Reports data
export const getReportData = async (reportType: 'sales' | 'inventory' | 'customers') => {
  try {
    switch (reportType) {
      case 'sales':
        return await getSalesData();
      case 'inventory':
        return await getInventoryItems();
      case 'customers':
        return await getCustomerData();
      default:
        return [];
    }
  } catch (error) {
    console.error('Error fetching report data:', error);
    throw error;
  }
};

// Dashboard user management
export const updateUserProfile = async (userId: string, updates: { full_name?: string; email?: string }) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      email: updates.email,
      data: { full_name: updates.full_name }
    });
    
    if (error) throw error;
    
    return data.user;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const updateUserPassword = async (newPassword: string) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    
    return data.user;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

// Track dashboard usage
export const trackUserActivity = async (action: string, pageVisited?: string, sessionDuration: number = 0) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    const { error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        action,
        page_visited: pageVisited,
        session_duration: sessionDuration
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error tracking user activity:', error);
  }
};

// Dashboard user sessions for analytics
export const getUserSessionData = async () => {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user session data:', error);
    throw error;
  }
};

export const getDashboardUserMetrics = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentSessions, error } = await supabase
      .from('user_sessions')
      .select('user_id, created_at, session_duration, action')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    if (error) throw error;
    
    const uniqueUsers = new Set(recentSessions?.map(session => session.user_id) || []);
    const activeUsers = uniqueUsers.size;
    
    const avgSessionDuration = recentSessions?.length > 0
      ? recentSessions.reduce((sum, session) => sum + (Number(session.session_duration) || 0), 0) / recentSessions.length
      : 0;
    
    const totalSessions = recentSessions?.length || 0;
    
    return {
      activeUsers,
      avgSessionDuration: Math.round(avgSessionDuration),
      totalSessions,
      mostUsedFeature: 'Dashboard', // Could be calculated from action data
    };
  } catch (error) {
    console.error('Error fetching dashboard user metrics:', error);
    throw error;
  }
};