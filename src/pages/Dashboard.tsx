import React, { useState, useEffect } from 'react';
import { MetricCard } from '../components/MetricCard';
import { DollarSign, Users, Package, TrendingUp, ShoppingCart, Shield } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getDashboardMetrics, getSalesData, getTopProducts, trackUserActivity } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { userRole } = useAuth();
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalCustomers: 0,
    lowInventoryCount: 0,
    revenueGrowth: 0,
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Track page visit
        await trackUserActivity('dashboard_view', '/dashboard', 0);
        
        // Fetch basic metrics for all users
        const metricsData = await getDashboardMetrics();
        setMetrics(metricsData);
        
        // Only fetch detailed data for CEO
        if (userRole === 'ceo') {
          // Fetch sales data for chart
          const sales = await getSalesData();
          
          // Process sales data for chart (group by date)
          const salesByDate = sales.reduce((acc: any, order: any) => {
            const date = new Date(order.created_at).toLocaleDateString();
            if (!acc[date]) {
              acc[date] = { name: date, revenue: 0, orders: 0 };
            }
            acc[date].revenue += Number(order.total_amount) || 0;
            acc[date].orders += 1;
            return acc;
          }, {});
          
          setSalesData(Object.values(salesByDate).slice(-7)); // Last 7 days
          
          // Fetch top products
          const products = await getTopProducts();
          setTopProducts(products);
        }
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const getRoleBasedTitle = () => {
    switch (userRole) {
      case 'ceo':
        return 'CEO Dashboard';
      case 'staff':
        return 'Staff Dashboard';
      default:
        return 'Business Dashboard';
    }
  };

  const getRoleBasedDescription = () => {
    switch (userRole) {
      case 'ceo':
        return 'Complete business overview and analytics';
      case 'staff':
        return 'Daily operations overview';
      default:
        return 'Your business overview';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-gray-800">{getRoleBasedTitle()}</h1>
            {userRole === 'ceo' && <Shield className="w-6 h-6 text-purple-600" />}
          </div>
          <p className="text-gray-600 mt-1">{getRoleBasedDescription()}</p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userRole === 'ceo' && (
          <MetricCard
            title="Total Revenue"
            value={`$${metrics.totalRevenue.toLocaleString()}`}
            change={metrics.revenueGrowth}
            icon={DollarSign}
            color="blue"
          />
        )}
        <MetricCard
          title="Total Customers"
          value={metrics.totalCustomers.toLocaleString()}
          change={8.2}
          icon={Users}
          color="green"
        />
        <MetricCard
          title="Low Stock Items"
          value={metrics.lowInventoryCount}
          icon={Package}
          color="yellow"
        />
        {userRole === 'ceo' && (
          <MetricCard
            title="Avg Order Value"
            value="$127.50"
            change={3.1}
            icon={ShoppingCart}
            color="red"
          />
        )}
      </div>

      {/* Charts - Only for CEO */}
      {userRole === 'ceo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Products by Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Staff-specific content */}
      {userRole === 'staff' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Tasks</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-800">Check inventory levels</span>
              </div>
              <span className="text-sm text-blue-600 font-medium">Pending</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-800">Update customer information</span>
              </div>
              <span className="text-sm text-green-600 font-medium">In Progress</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-800">Process pending orders</span>
              </div>
              <span className="text-sm text-gray-600 font-medium">Completed</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Products Table - Only for CEO */}
      {userRole === 'ceo' && topProducts.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Best Selling Products</h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{product.name}</h4>
                    <p className="text-sm text-gray-600">${product.revenue.toLocaleString()} in revenue</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    {product.sales} units sold
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};