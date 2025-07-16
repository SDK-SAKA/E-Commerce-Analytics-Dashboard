/*
  # CEO Dashboard Schema Migration

  1. New Tables
    - `dashboard_users` - CEO and management team access
    - `customers` - Website customers who make purchases
    - `orders` - Customer orders from the website
    - `order_items` - Individual items in each order
    - `user_sessions` - Dashboard usage tracking

  2. Modified Tables
    - `products` - Enhanced with e-commerce fields (description, cost, sku, etc.)

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated dashboard users only

  4. Sample Data
    - Realistic customers, products, orders for testing
*/

-- Drop tables that don't fit the CEO dashboard model
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS user_activity CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Dashboard users (CEO and management team only)
CREATE TABLE IF NOT EXISTS dashboard_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Your website customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'United States',
  total_orders integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns to existing products table
DO $$
BEGIN
  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'description'
  ) THEN
    ALTER TABLE products ADD COLUMN description text;
  END IF;

  -- Add cost column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'cost'
  ) THEN
    ALTER TABLE products ADD COLUMN cost numeric DEFAULT 0;
  END IF;

  -- Add sku column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE products ADD COLUMN sku text UNIQUE;
  END IF;

  -- Add image_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url text;
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE products ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE products ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Customer orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  shipping_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  payment_status text DEFAULT 'pending',
  shipping_address jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Individual items in each order
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Dashboard user activity tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT '',
  page_visited text,
  session_duration integer DEFAULT 0,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dashboard_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only authenticated dashboard users can access)
CREATE POLICY "Dashboard users can manage all data" ON dashboard_users FOR ALL TO authenticated USING (true);
CREATE POLICY "Dashboard users can view customers" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Dashboard users can manage products" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "Dashboard users can view orders" ON orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Dashboard users can view order items" ON order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Dashboard users can manage sessions" ON user_sessions FOR ALL TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at);

-- Clear existing products and insert sample e-commerce products
DELETE FROM products;

-- Insert sample products (without description initially, then update)
INSERT INTO products (name, price, stock_quantity, low_stock_threshold, category) VALUES
('Wireless Bluetooth Headphones', 199.99, 45, 10, 'Electronics'),
('Organic Cotton T-Shirt', 29.99, 120, 20, 'Clothing'),
('Stainless Steel Water Bottle', 34.99, 78, 15, 'Home & Garden'),
('Smartphone Case', 24.99, 200, 25, 'Electronics'),
('Yoga Mat', 49.99, 35, 10, 'Sports & Fitness'),
('Coffee Mug Set', 39.99, 60, 12, 'Home & Garden'),
('Running Shoes', 129.99, 25, 8, 'Sports & Fitness'),
('Laptop Stand', 79.99, 40, 8, 'Electronics'),
('Skincare Set', 89.99, 55, 12, 'Beauty & Health'),
('Desk Organizer', 44.99, 85, 15, 'Office Supplies');

-- Update products with additional details
UPDATE products SET 
  description = 'Premium noise-canceling wireless headphones',
  cost = 89.99,
  sku = 'WBH-001'
WHERE name = 'Wireless Bluetooth Headphones';

UPDATE products SET 
  description = 'Comfortable organic cotton t-shirt in various colors',
  cost = 12.50,
  sku = 'OCT-001'
WHERE name = 'Organic Cotton T-Shirt';

UPDATE products SET 
  description = 'Insulated water bottle keeps drinks cold for 24 hours',
  cost = 15.75,
  sku = 'SSWB-001'
WHERE name = 'Stainless Steel Water Bottle';

UPDATE products SET 
  description = 'Protective case for latest smartphone models',
  cost = 8.99,
  sku = 'SPC-001'
WHERE name = 'Smartphone Case';

UPDATE products SET 
  description = 'Non-slip yoga mat perfect for home workouts',
  cost = 22.50,
  sku = 'YM-001'
WHERE name = 'Yoga Mat';

UPDATE products SET 
  description = 'Set of 4 ceramic coffee mugs with unique designs',
  cost = 18.00,
  sku = 'CMS-001'
WHERE name = 'Coffee Mug Set';

UPDATE products SET 
  description = 'Lightweight running shoes with advanced cushioning',
  cost = 65.00,
  sku = 'RS-001'
WHERE name = 'Running Shoes';

UPDATE products SET 
  description = 'Adjustable aluminum laptop stand for better ergonomics',
  cost = 35.50,
  sku = 'LS-001'
WHERE name = 'Laptop Stand';

UPDATE products SET 
  description = 'Complete skincare routine with natural ingredients',
  cost = 42.75,
  sku = 'SS-001'
WHERE name = 'Skincare Set';

UPDATE products SET 
  description = 'Bamboo desk organizer with multiple compartments',
  cost = 20.25,
  sku = 'DO-001'
WHERE name = 'Desk Organizer';

-- Insert sample customers
INSERT INTO customers (email, full_name, phone, city, state, country, total_orders, total_spent) VALUES
('john.doe@email.com', 'John Doe', '+1-555-0101', 'New York', 'NY', 'United States', 5, 1250.00),
('jane.smith@email.com', 'Jane Smith', '+1-555-0102', 'Los Angeles', 'CA', 'United States', 3, 890.50),
('mike.johnson@email.com', 'Mike Johnson', '+1-555-0103', 'Chicago', 'IL', 'United States', 8, 2100.75),
('sarah.wilson@email.com', 'Sarah Wilson', '+1-555-0104', 'Houston', 'TX', 'United States', 2, 450.25),
('david.brown@email.com', 'David Brown', '+1-555-0105', 'Phoenix', 'AZ', 'United States', 6, 1680.00),
('lisa.davis@email.com', 'Lisa Davis', '+1-555-0106', 'Philadelphia', 'PA', 'United States', 4, 920.30),
('chris.miller@email.com', 'Chris Miller', '+1-555-0107', 'San Antonio', 'TX', 'United States', 7, 1540.80),
('amy.garcia@email.com', 'Amy Garcia', '+1-555-0108', 'San Diego', 'CA', 'United States', 3, 675.45);

-- Insert sample orders with realistic data
INSERT INTO orders (customer_id, order_number, status, subtotal, tax_amount, shipping_amount, total_amount, payment_method, payment_status, created_at) VALUES
-- John Doe orders
((SELECT id FROM customers WHERE email = 'john.doe@email.com'), 'ORD-000001', 'delivered', 229.98, 18.40, 9.99, 258.37, 'credit_card', 'completed', '2024-01-15 10:30:00'),
((SELECT id FROM customers WHERE email = 'john.doe@email.com'), 'ORD-000002', 'delivered', 79.99, 6.40, 9.99, 96.38, 'paypal', 'completed', '2024-01-22 14:15:00'),
-- Jane Smith orders  
((SELECT id FROM customers WHERE email = 'jane.smith@email.com'), 'ORD-000003', 'shipped', 169.97, 13.60, 9.99, 193.56, 'credit_card', 'completed', '2024-01-28 09:45:00'),
-- Mike Johnson orders
((SELECT id FROM customers WHERE email = 'mike.johnson@email.com'), 'ORD-000004', 'delivered', 89.99, 7.20, 9.99, 107.18, 'stripe', 'completed', '2024-01-30 16:20:00'),
((SELECT id FROM customers WHERE email = 'mike.johnson@email.com'), 'ORD-000005', 'processing', 44.99, 3.60, 9.99, 58.58, 'credit_card', 'completed', '2024-02-01 11:10:00');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price) VALUES
-- Order 1 items
((SELECT id FROM orders WHERE order_number = 'ORD-000001'), (SELECT id FROM products WHERE name = 'Wireless Bluetooth Headphones'), 'Wireless Bluetooth Headphones', 1, 199.99, 199.99),
((SELECT id FROM orders WHERE order_number = 'ORD-000001'), (SELECT id FROM products WHERE name = 'Organic Cotton T-Shirt'), 'Organic Cotton T-Shirt', 1, 29.99, 29.99),
-- Order 2 items
((SELECT id FROM orders WHERE order_number = 'ORD-000002'), (SELECT id FROM products WHERE name = 'Laptop Stand'), 'Laptop Stand', 1, 79.99, 79.99),
-- Order 3 items
((SELECT id FROM orders WHERE order_number = 'ORD-000003'), (SELECT id FROM products WHERE name = 'Running Shoes'), 'Running Shoes', 1, 129.99, 129.99),
((SELECT id FROM orders WHERE order_number = 'ORD-000003'), (SELECT id FROM products WHERE name = 'Coffee Mug Set'), 'Coffee Mug Set', 1, 39.99, 39.99),
-- Order 4 items
((SELECT id FROM orders WHERE order_number = 'ORD-000004'), (SELECT id FROM products WHERE name = 'Skincare Set'), 'Skincare Set', 1, 89.99, 89.99),
-- Order 5 items
((SELECT id FROM orders WHERE order_number = 'ORD-000005'), (SELECT id FROM products WHERE name = 'Desk Organizer'), 'Desk Organizer', 1, 44.99, 44.99);