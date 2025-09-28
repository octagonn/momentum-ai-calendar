-- Momentum App Database Schema
-- This file contains the SQL schema for the Momentum app's Supabase database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create goals table
CREATE TABLE IF NOT EXISTS momentum_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  unit TEXT DEFAULT 'points',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  plan JSONB, -- Store the AI-generated plan as JSON
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  target_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS momentum_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP WITH TIME ZONE,
  goal_id UUID REFERENCES momentum_goals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_momentum_goals_status ON momentum_goals(status);
CREATE INDEX IF NOT EXISTS idx_momentum_goals_created_at ON momentum_goals(created_at);
CREATE INDEX IF NOT EXISTS idx_momentum_tasks_goal_id ON momentum_tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_momentum_tasks_completed ON momentum_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_momentum_tasks_due_date ON momentum_tasks(due_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_momentum_goals_updated_at 
  BEFORE UPDATE ON momentum_goals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_momentum_tasks_updated_at 
  BEFORE UPDATE ON momentum_tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE momentum_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE momentum_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for now - in production you'd want user-specific policies)
CREATE POLICY "Enable read access for all users" ON momentum_goals FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON momentum_goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON momentum_goals FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON momentum_goals FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON momentum_tasks FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON momentum_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON momentum_tasks FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON momentum_tasks FOR DELETE USING (true);

-- Insert some sample data for development
INSERT INTO momentum_goals (title, description, current_value, target_value, unit, status, plan) VALUES
('Learn React Native', 'Master React Native development and build mobile apps', 25, 100, 'hours', 'active', '{"milestones": [{"week": 1, "target": 20, "description": "Learn basics"}, {"week": 2, "target": 40, "description": "Build first app"}]}'),
('Get Fit', 'Improve physical fitness and health', 15, 50, 'workouts', 'active', '{"milestones": [{"week": 1, "target": 10, "description": "Start routine"}, {"week": 2, "target": 20, "description": "Build consistency"}]}'),
('Read More Books', 'Read 12 books this year', 3, 12, 'books', 'active', '{"milestones": [{"week": 1, "target": 1, "description": "Choose first book"}, {"week": 2, "target": 2, "description": "Finish first book"}]}')
ON CONFLICT DO NOTHING;

-- Insert sample tasks
INSERT INTO momentum_tasks (title, description, completed, priority, due_date, goal_id) VALUES
('Complete React Native tutorial', 'Finish the official React Native tutorial', false, 'high', NOW() + INTERVAL '1 day', (SELECT id FROM momentum_goals WHERE title = 'Learn React Native' LIMIT 1)),
('Build first mobile app', 'Create a simple todo app', false, 'medium', NOW() + INTERVAL '3 days', (SELECT id FROM momentum_goals WHERE title = 'Learn React Native' LIMIT 1)),
('Go to the gym', 'Workout for 1 hour', false, 'high', NOW() + INTERVAL '1 day', (SELECT id FROM momentum_goals WHERE title = 'Get Fit' LIMIT 1)),
('Read for 30 minutes', 'Read current book', false, 'medium', NOW() + INTERVAL '2 days', (SELECT id FROM momentum_goals WHERE title = 'Read More Books' LIMIT 1))
ON CONFLICT DO NOTHING;
