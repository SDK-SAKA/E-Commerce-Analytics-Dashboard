import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getReportData, trackUserActivity } from '../lib/database';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'customers'>('sales');
  const [dateRange, setDateRange] = useState({
    start: '2025-06-01',
    end: '2025-07-01',
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        
        // Track page visit
        await trackUserActivity('reports_view', '/reports', 0);
        
        const data = await getReportData(reportType);
        
        // Filter by date range if applicable
        let filteredData = data;
        if (reportType === 'sales' || reportType === 'customers') {
          filteredData = data.filter(item => {
            const itemDate = new Date(item.created_at).toISOString().split('T')[0];
            return itemDate >= dateRange.start && itemDate <= dateRange.end;
          });
        }
        
        setReportData(filteredData);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [reportType, dateRange]);

  const generatePDF = async () => {
    await trackUserActivity('report_export_pdf', '/reports', 0);
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, 20, 20);
    
    // Add date range
    doc.setFontSize(12);
    doc.text(`Report Period: ${dateRange.start} to ${dateRange.end}`, 20, 35);
    
    // Add table based on report type
    if (reportType === 'sales') {
      const tableData = reportData.map(item => [
        new Date(item.created_at).toLocaleDateString(),
        item.order_number || 'N/A',
        item.status,
        `$${(item.total_amount || 0).toLocaleString()}`,
      ]);
      
      autoTable(doc, {
        head: [['Date', 'Order Number', 'Status', 'Amount']],
        body: tableData,
        startY: 50,
      });
    } else if (reportType === 'inventory') {
      const tableData = reportData.map(item => [
        item.name,
        item.category,
        (item.stock_quantity || 0).toString(),
        `$${(item.price || 0).toLocaleString()}`,
        `$${((item.stock_quantity || 0) * (item.price || 0)).toLocaleString()}`,
      ]);
      
      autoTable(doc, {
        head: [['Product', 'Category', 'Stock', 'Price', 'Total Value']],
        body: tableData,
        startY: 50,
      });
    } else if (reportType === 'customers') {
      const tableData = reportData.map(item => [
        item.full_name,
        item.email,
        (item.total_orders || 0).toString(),
        `$${(item.total_spent || 0).toLocaleString()}`,
        new Date(item.created_at).toLocaleDateString(),
      ]);
      
      autoTable(doc, {
        head: [['Name', 'Email', 'Orders', 'Total Spent', 'Joined']],
        body: tableData,
        startY: 50,
      });
    }
    
    doc.save(`${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateCSV = async () => {
    await trackUserActivity('report_export_csv', '/reports', 0);
    
    let csvContent = '';
    
    if (reportType === 'sales') {
      csvContent = 'Date,Order Number,Status,Amount\n';
      csvContent += reportData.map(item => 
        `${new Date(item.created_at).toLocaleDateString()},${item.order_number || 'N/A'},${item.status},${item.total_amount || 0}`
      ).join('\n');
    } else if (reportType === 'inventory') {
      csvContent = 'Product,Category,Stock,Price,Total Value\n';
      csvContent += reportData.map(item => 
        `${item.name},${item.category},${item.stock_quantity || 0},${item.price || 0},${(item.stock_quantity || 0) * (item.price || 0)}`
      ).join('\n');
    } else if (reportType === 'customers') {
      csvContent = 'Name,Email,Orders,Total Spent,Joined\n';
      csvContent += reportData.map(item => 
        `${item.full_name},${item.email},${item.total_orders || 0},${item.total_spent || 0},${new Date(item.created_at).toLocaleDateString()}`
      ).join('\n');
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reports & Export</h1>
          <p className="text-gray-600 mt-1">Generate and export business reports</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={generatePDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={generateCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Configuration */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Report Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'sales' | 'inventory' | 'customers')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="sales">Sales Report</option>
              <option value="inventory">Inventory Report</option>
              <option value="customers">Customer Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report Preview
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{dateRange.start} to {dateRange.end}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {reportType === 'sales' && (
                    <>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Order #</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                    </>
                  )}
                  {reportType === 'inventory' && (
                    <>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Product</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Stock</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Price</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Total Value</th>
                    </>
                  )}
                  {reportType === 'customers' && (
                    <>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Orders</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Total Spent</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Joined</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {reportData.slice(0, 10).map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    {reportType === 'sales' && (
                      <>
                        <td className="py-3 px-4 text-gray-800">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-gray-800">{item.order_number || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-800">{item.status}</td>
                        <td className="py-3 px-4 text-gray-800">${(item.total_amount || 0).toLocaleString()}</td>
                      </>
                    )}
                    {reportType === 'inventory' && (
                      <>
                        <td className="py-3 px-4 text-gray-800">{item.name}</td>
                        <td className="py-3 px-4 text-gray-800">{item.category}</td>
                        <td className="py-3 px-4 text-gray-800">{item.stock_quantity || 0}</td>
                        <td className="py-3 px-4 text-gray-800">${(item.price || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-gray-800">${((item.stock_quantity || 0) * (item.price || 0)).toLocaleString()}</td>
                      </>
                    )}
                    {reportType === 'customers' && (
                      <>
                        <td className="py-3 px-4 text-gray-800">{item.full_name}</td>
                        <td className="py-3 px-4 text-gray-800">{item.email}</td>
                        <td className="py-3 px-4 text-gray-800">{item.total_orders || 0}</td>
                        <td className="py-3 px-4 text-gray-800">${(item.total_spent || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-gray-800">{new Date(item.created_at).toLocaleDateString()}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.length > 10 && (
              <p className="text-sm text-gray-500 mt-4">
                Showing first 10 of {reportData.length} records. Export to see all data.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};