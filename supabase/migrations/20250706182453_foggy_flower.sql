/*
  # Role-Based Access Control Setup

  1. Data Cleanup
    - Update existing roles to match new constraint
    - Convert 'admin' roles to 'ceo' for backwards compatibility

  2. Constraints
    - Add role validation constraint for valid roles only

  3. Automation
    - Create trigger function for automatic user role assignment
    - Set up trigger for new user registration

  4. User Management
    - Add existing auth users to dashboard_users table
    - Create helpful view for user management

  5. Security
    - Grant appropriate permissions
    - Add documentation comments
*/

-- First, update any existing roles that don't match our new constraint
-- Convert 'admin' to 'ceo' and any other invalid roles to 'staff'
UPDATE dashboard_users 
SET role = CASE 
  WHEN role = 'admin' THEN 'ceo'
  WHEN role NOT IN ('ceo', 'manager', 'staff') THEN 'staff'
  ELSE role
END
WHERE role NOT IN ('ceo', 'manager', 'staff');

-- Add constraint to ensure only valid roles are used
DO $$
BEGIN
  -- Drop constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'dashboard_users_role_check' 
    AND table_name = 'dashboard_users'
  ) THEN
    ALTER TABLE dashboard_users DROP CONSTRAINT dashboard_users_role_check;
  END IF;
  
  -- Add the constraint (now that data is clean)
  ALTER TABLE dashboard_users ADD CONSTRAINT dashboard_users_role_check 
    CHECK (role IN ('ceo', 'manager', 'staff'));
END $$;

-- Create or replace function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into dashboard_users with default role
  INSERT INTO public.dashboard_users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Dashboard User'),
    'staff'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, dashboard_users.full_name),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user role assignment
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update any existing authenticated users to have dashboard_users entries
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through existing auth users and assign default roles
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        WHERE au.id NOT IN (SELECT du.id FROM dashboard_users du)
    LOOP
        INSERT INTO dashboard_users (id, email, full_name, role) VALUES
        (
          user_record.id, 
          user_record.email, 
          COALESCE(user_record.raw_user_meta_data->>'full_name', 'Dashboard User'), 
          'staff'
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;

-- Create helpful view for user management (optional)
CREATE OR REPLACE VIEW user_roles AS
SELECT 
  du.id,
  du.email,
  du.full_name,
  du.role,
  du.created_at,
  du.updated_at,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN 'confirmed'
    ELSE 'pending'
  END as email_status
FROM dashboard_users du
LEFT JOIN auth.users au ON du.id = au.id;

-- Grant necessary permissions
GRANT SELECT ON user_roles TO authenticated;
GRANT ALL ON dashboard_users TO authenticated;

-- Add helpful comments
COMMENT ON TABLE dashboard_users IS 'Stores role information for dashboard users';
COMMENT ON COLUMN dashboard_users.role IS 'User role: ceo, manager, or staff';
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates dashboard_users entry when new user signs up';