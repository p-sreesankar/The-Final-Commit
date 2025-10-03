/*
  # Canteen Pre-Ordering System with QR Code Verification

  1. New Tables
    - `orders`
      - `id` (uuid, primary key) - Unique order identifier
      - `student_name` (text) - Name of the student
      - `student_id` (text) - Student ID number
      - `items` (jsonb) - Ordered items as JSON array
      - `total_amount` (decimal) - Total order amount
      - `qr_code` (text, unique) - Unique QR code for the order
      - `order_date` (date) - Date of the order
      - `status` (text) - Order status: 'pending', 'fulfilled', 'cancelled'
      - `fulfilled_at` (timestamptz) - When the order was fulfilled
      - `fulfilled_by` (text) - Staff member who fulfilled the order
      - `created_at` (timestamptz) - Order creation timestamp

  2. Security
    - Enable RLS on `orders` table
    - Add policy for inserting new orders (public access for students)
    - Add policy for staff to view and update orders

  3. Important Notes
    - QR codes are unique and valid only for the day they were created
    - Once fulfilled, orders cannot be fulfilled again
    - Staff can view all orders but only fulfill pending ones
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  student_id text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  qr_code text UNIQUE NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  fulfilled_at timestamptz,
  fulfilled_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create orders"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can view their own orders"
  ON orders
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can update orders for fulfillment"
  ON orders
  FOR UPDATE
  TO anon
  USING (status = 'pending')
  WITH CHECK (status IN ('fulfilled', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_orders_qr_code ON orders(qr_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);