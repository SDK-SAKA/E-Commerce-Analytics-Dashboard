import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Package,
  FileText,
  Settings,
  LogOut,
  ShoppingBag,
  Shield,
} from 'lucide-react';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
  allowedRoles: string[];
}

const navigationItems: NavigationItem[] = [
  { 
    path: '/', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    allowedRoles: ['ceo', 'staff'] 
  },
  { 
    path: '/sales', 
    label: 'Sales & Revenue', 
    icon: TrendingUp, 
    allowedRoles: ['ceo'] 
  },
  { 
    path: '/customers', 
    label: 'Customers', 
    icon: Users, 
    allowedRoles: ['ceo', 'staff'] 
  },
  { 
    path: '/inventory', 
    label: 'Inventory', 
    icon: Package, 
    allowedRoles: ['ceo', 'staff'] 
  },
  { 
    path: '/reports', 
    label: 'Reports', 
    icon: FileText, 
    allowedRoles: ['ceo'] 
  },
  { 
    path: '/settings', 
    label: 'Settings', 
    icon: Settings, 
    allowedRoles: ['ceo'] 
  },
];

const getRoleDisplayName = (role: string | null): string => {
  switch (role) {
    case 'ceo':
      return 'CEO';
    case 'staff':
      return 'Staff';
    default:
      return 'User';
  }
};

const getRoleColor = (role: string | null): string => {
  switch (role) {
    case 'ceo':
      return 'bg-purple-600';
    case 'staff':
      return 'bg-green-600';
    default:
      return 'bg-gray-600';
  }
};

export const Navigation: React.FC = () => {
  const { signOut, user, userRole } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Filter navigation items based on user role
  const allowedNavigationItems = navigationItems.filter(item => 
    userRole && item.allowedRoles.includes(userRole)
  );

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-white/80 backdrop-blur-lg border-r border-gray-200 z-50">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <ShoppingBag className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">Business Dashboard</h1>
            <p className="text-xs text-gray-500">E-commerce Analytics</p>
          </div>
        </div>

        <div className="space-y-2">
          {allowedNavigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${getRoleColor(userRole)} rounded-full flex items-center justify-center`}>
                {userRole === 'ceo' ? (
                  <Shield className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {user?.user_metadata?.full_name || getRoleDisplayName(userRole)}
                  </p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    userRole === 'ceo' 
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {getRoleDisplayName(userRole)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
};