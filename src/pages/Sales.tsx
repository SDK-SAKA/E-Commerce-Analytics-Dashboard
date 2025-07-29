import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, Filter, TrendingUp, DollarSign } from 'lucide-react';
import { getSalesData, getTopProducts, trackUserActivity } from '../lib/database';

// --- Forecast Utility Function (Linear Regression & Trendy Forecast) ---
const getForecastData = (historicalData: any[], periods: number, key: string = 'revenue') => {
  if (historicalData.length < 2) return [];
  // Prepare regression
  const xs = historicalData.map((_, i) => i);
  const ys = historicalData.map(d => d[key] || 0);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sumXX = xs.reduce((sum, x) => sum + x * x, 0);

  // Linear regression coefficients
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  // Use last N days as a "pattern" for forecast shape
  const patternWindow = Math.min(14, historicalData.length);
  const pattern = ys.slice(-patternWindow);

  // Forecast: add trend + repeat pattern shape
  return Array.from({ length: periods }).map((_, i) => {
    const x = n + i;
    // Trend + pattern
    const trend = slope * x + intercept;
    const patternValue = pattern[i % pattern.length];
    // Blend trend and pattern for more realistic forecast
    const forecast = (trend + patternValue) / 2;
    // Forecast dates start after last historical date
    const lastDate = new Date(historicalData[historicalData.length - 1].date);
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(lastDate.getDate() + i + 1);
    return {
      date: forecastDate.toISOString().split('T')[0],
      forecast: Math.max(0, Math.round(forecast)),
    };
  });
};

export const Sales: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState({
    start: '2025-06-01',
    end: '2025-08-31',
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    avgOrderValue: 0,
    totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  // --- Forecast State ---
  const [forecastRange, setForecastRange] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        if (salesData.length === 0) {
          setLoading(true);
        }
        await trackUserActivity('sales_view', '/sales', 0);
        const orders = await getSalesData(timeRange);
        const filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.created_at).toISOString().split('T')[0];
          return orderDate >= dateRange.start && orderDate <= dateRange.end;
        });
        const processedData = processChartData(filteredOrders, timeRange);
        setSalesData(processedData);

        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
        const totalOrders = filteredOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        setMetrics({
          totalRevenue,
          avgOrderValue,
          totalOrders,
        });

        const products = await getTopProducts();
        setTopProducts(products);
      } catch (error) {
        console.error('Error fetching sales data:', error);
        if (loading) setLoading(false);
      } finally {
        if (loading) setLoading(false);
      }
    };

    fetchSalesData();

    // Set up periodic refresh every 2 minutes
    const refreshInterval = setInterval(() => {
      const refreshWithoutLoading = async () => {
        try {
          await trackUserActivity('sales_view', '/sales', 0);
          const orders = await getSalesData(timeRange);
          const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.created_at).toISOString().split('T')[0];
            return orderDate >= dateRange.start && orderDate <= dateRange.end;
          });
          const processedData = processChartData(filteredOrders, timeRange);
          setSalesData(processedData);

          const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
          const totalOrders = filteredOrders.length;
          const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

          setMetrics({
            totalRevenue,
            avgOrderValue,
            totalOrders,
          });

          const products = await getTopProducts();
          setTopProducts(products);
        } catch (error) {
          console.error('Error during sales refresh:', error);
        }
      };
      refreshWithoutLoading();
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(refreshInterval);
    };
    // eslint-disable-next-line
  }, [timeRange, dateRange]);

  const processChartData = (orders: any[], range: string) => {
    const dataMap = new Map();
    orders.forEach(order => {
      let key;
      const date = new Date(order.created_at);
      switch (range) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      if (!dataMap.has(key)) {
        dataMap.set(key, { date: key, revenue: 0, orders: 0 });
      }
      const existing = dataMap.get(key);
      existing.revenue += Number(order.total_amount) || 0;
      existing.orders += 1;
    });
    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  // --- Forecast Data Calculation ---
  const forecastPeriods = {
    week: 7,
    month: 30,
    year: 365,
  };
  const forecastData = getForecastData(salesData, forecastPeriods[forecastRange]);

  // --- Combine historical and forecast data for chart ---
  const combinedChartData = (() => {
    if (!salesData.length) return [];
    const lastDate = salesData[salesData.length - 1].date;
    // Only show forecast after last historical date
    return [
      ...salesData.map(d => ({
        date: d.date,
        revenue: d.revenue,
        forecast: null,
      })),
      ...forecastData.map(d => ({
        date: d.date,
        revenue: null,
        forecast: d.forecast,
      })),
    ];
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sales & Revenue</h1>
          <p className="text-gray-600 mt-1">Track your e-commerce performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">${metrics.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-800">${metrics.avgOrderValue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-800">{metrics.totalOrders.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Trend</h3>
        {salesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No sales data available for the selected period</p>
          </div>
        )}
      </div>

      {/* --- Sales Forecast Chart --- */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-gray-700 font-medium">Sales Forecast:</span>
          <select
            value={forecastRange}
            onChange={e => setForecastRange(e.target.value as 'week' | 'month' | 'year')}
            className="px-2 py-1 border border-gray-300 rounded"
          >
            <option value="week">Next 1 Week</option>
            <option value="month">Next 1 Month</option>
            <option value="year">Next 1 Year</option>
          </select>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Predicted Sales</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={combinedChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Historical Revenue"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="#F59E42"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={{ fill: '#F59E42', r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Product Performance */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Products by Revenue</h3>
        {topProducts.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No product data available</p>
          </div>
        )}
      </div>
    </div>
  );
};