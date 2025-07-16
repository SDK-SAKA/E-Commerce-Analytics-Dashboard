import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users as UsersIcon, DollarSign, Repeat, TrendingUp } from 'lucide-react';
import { getCustomerData, getCustomerMetrics, trackUserActivity } from '../lib/database';

export const Customers: React.FC = () => {
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    avgOrderValue: 0,
    retentionRate: 0,
    newCustomersThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        
        // Track page visit
        await trackUserActivity('customers_view', '/customers', 0);
        
        // Fetch customer data
        const customers = await getCustomerData();
        
        // Process customer data for chart (customer growth over time)
        const customersByDate = customers.reduce((acc: any, customer: any) => {
          const date = new Date(customer.created_at).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = { date, customers: 0 };
          }
          acc[date].customers += 1;
          return acc;
        }, {});
        
        setCustomerData(Object.values(customersByDate).slice(-30)); // Last 30 days
        
        // Fetch customer metrics
        const customerMetrics = await getCustomerMetrics();
        setMetrics(customerMetrics);
        
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Customer Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor your customer base and behavior</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-800">{metrics.totalCustomers.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Order Value</p>
              <p className="text-2xl font-bold text-gray-800">${metrics.avgOrderValue}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Retention Rate</p>
              <p className="text-2xl font-bold text-gray-800">{metrics.retentionRate}%</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Repeat className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New This Month</p>
              <p className="text-2xl font-bold text-gray-800">{metrics.newCustomersThisMonth}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Growth Chart */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Growth</h3>
        {customerData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={customerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="customers" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No customer data available</p>
          </div>
        )}
      </div>

      {/* Customer Insights */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">68%</p>
            <p className="text-sm text-gray-600">First-time Buyers</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">32%</p>
            <p className="text-sm text-gray-600">Repeat Customers</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">2.4</p>
            <p className="text-sm text-gray-600">Avg. Orders per Customer</p>
          </div>
        </div>
      </div>
    </div>
  );
};