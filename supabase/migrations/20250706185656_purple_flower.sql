/*
  # Update dq@gmail.com role to CEO

  This migration ensures that dq@gmail.com has the correct CEO role in the dashboard_users table.
*/

-- Update dq@gmail.com to have CEO role
UPDATE dashboard_users 
SET role = 'ceo', 
    full_name = 'DQ (CEO)',
    updated_at = now()
WHERE email = 'dq@gmail.com';

-- If the user doesn't exist, insert them
INSERT INTO dashboard_users (id, email, full_name, role)
SELECT 
  au.id,
  'dq@gmail.com',
  'DQ (CEO)',
  'ceo'
FROM auth.users au
WHERE au.email = 'dq@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM dashboard_users du WHERE du.email = 'dq@gmail.com'
  );

-- Verify the update
SELECT email, full_name, role, updated_at 
FROM dashboard_users 
WHERE email = 'dq@gmail.com';