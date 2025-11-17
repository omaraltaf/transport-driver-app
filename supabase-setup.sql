-- Create users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create sessions table
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('working', 'on-break', 'ended')),
  route_number TEXT,
  deliveries INTEGER,
  pickups INTEGER,
  breaks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_users_username ON users(username);

-- Insert default admin user (password: test2025)
INSERT INTO users (name, username, password, mobile, email, role)
VALUES ('Admin', 'admin', 'test2025', '12345678', 'admin@transport.com', 'admin');

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update users" ON users FOR UPDATE USING (true);
CREATE POLICY "Admins can delete users" ON users FOR DELETE USING (true);

-- Create policies for sessions table
CREATE POLICY "Users can read their own sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own sessions" ON sessions FOR DELETE USING (true);
