import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to generate random order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}${random}`;
};

// Helper function to get random item from array
const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Helper function to generate random date between June 1, 2025 and August 31, 2025
const getRandomDateInRange = () => {
  const startDate = new Date('2025-06-01');
  const endDate = new Date('2025-08-31');
  const timeDiff = endDate.getTime() - startDate.getTime();
  const randomTime = Math.random() * timeDiff;
  return new Date(startDate.getTime() + randomTime);
};

// Helper function to calculate tax and shipping
const calculateOrderTotals = (subtotal) => {
  const taxRate = 0.08; // 8% tax
  const shippingAmount = 9.99; // Fixed shipping amount
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount + shippingAmount;
  
  return {
    taxAmount: Math.round(taxAmount * 100) / 100,
    shippingAmount: Math.round(shippingAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100
  };
};

// Main function to generate and insert a test order
async function generateTestOrder() {
  try {
    console.log('🔄 Generating new test order...');
    
    // Fetch random customer
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*');
    
    if (customerError) throw customerError;
    if (!customers || customers.length === 0) {
      console.error('❌ No customers found in database');
      return;
    }
    
    // Fetch random products (1-3 products per order)
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);
    
    if (productError) throw productError;
    if (!products || products.length === 0) {
      console.error('❌ No products found in database');
      return;
    }
    
    const randomCustomer = getRandomItem(customers);
    const numberOfItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
    const selectedProducts = [];
    
    // Select random products for the order
    for (let i = 0; i < numberOfItems; i++) {
      const product = getRandomItem(products);
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
      selectedProducts.push({
        ...product,
        quantity,
        totalPrice: product.price * quantity
      });
    }
    
    // Calculate order totals
    const subtotal = selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0);
    const { taxAmount, shippingAmount, totalAmount } = calculateOrderTotals(subtotal);
    
    // Generate order data
    const orderData = {
      customer_id: randomCustomer.id,
      order_number: generateOrderNumber(),
      status: 'delivered',
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: taxAmount,
      shipping_amount: 9.99,
      total_amount: totalAmount,
      payment_method: getRandomItem(['credit_card', 'paypal', 'stripe']),
      payment_status: 'completed',
      shipping_address: {
        street: randomCustomer.address,
        city: randomCustomer.city,
        state: randomCustomer.state,
        zip_code: randomCustomer.zip_code,
        country: randomCustomer.country
      },
      notes: getRandomItem([
        'Customer requested expedited shipping',
        'Gift wrapping requested',
        'Leave at front door',
        'Call before delivery',
        null,
        null // More likely to have no notes
      ]),
      created_at: getRandomDateInRange().toISOString()
    };
    
    // Insert order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    console.log(`✅ Created order: ${newOrder.order_number} for ${randomCustomer.full_name}`);
    
    // Insert order items
    const orderItems = selectedProducts.map(product => ({
      order_id: newOrder.id,
      product_id: product.id,
      product_name: product.name,
      quantity: product.quantity,
      unit_price: product.price,
      total_price: product.totalPrice
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) throw itemsError;
    
    // Update customer totals
    try {
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({
          total_orders: randomCustomer.total_orders + 1,
          total_spent: Math.round((randomCustomer.total_spent + totalAmount) * 100) / 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', randomCustomer.id);
      
      if (customerUpdateError) {
        console.log('⚠️  Customer update failed, but order was created successfully');
        console.log('Customer update error:', customerUpdateError.message);
      } else {
        console.log(`👤 Updated customer: ${randomCustomer.full_name}`);
      }
    } catch (customerError) {
      console.log('⚠️  Customer update failed, but order was created successfully');
      console.log('Customer error details:', customerError.message);
    }
    
    console.log(`📦 Added ${selectedProducts.length} items to order`);
    console.log(`💰 Order total: $${totalAmount}`);
    console.log('---');
    
  } catch (error) {
    console.error('❌ Error generating test order:', error.message);
    console.error('Error details:', error);
  }
}

// Start the periodic order generation
console.log('🚀 Starting test order generation...');
console.log('📅 New orders will be created every 10 seconds');
console.log('⏰ Press Ctrl+C to stop');
console.log('---');

// Generate first order immediately
generateTestOrder();

// Set up interval to generate orders every 10 seconds
const interval = setInterval(generateTestOrder, 10 * 1000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test order generation...');
  clearInterval(interval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping test order generation...');
  clearInterval(interval);
  process.exit(0);
});