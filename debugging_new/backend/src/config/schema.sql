-- Create database
CREATE DATABASE IF NOT EXISTS debug_arena;
USE debug_arena;

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_name VARCHAR(100) NOT NULL UNIQUE,
  session_token VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problems table
CREATE TABLE IF NOT EXISTS problems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter INT NOT NULL DEFAULT 1,
  round INT NOT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL,
  language ENUM('python','java','c') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  buggy_code TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  points INT NOT NULL DEFAULT 10,
  hint TEXT,
  time_limit INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  problem_id INT NOT NULL,
  code TEXT NOT NULL,
  result ENUM('correct','incorrect','error','expired') NOT NULL,
  score INT DEFAULT 0,
  execution_time VARCHAR(50),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL UNIQUE,
  total_points INT DEFAULT 0,
  challenges_completed INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leaderboard_released BOOLEAN DEFAULT false
);

-- Team Timers table
CREATE TABLE IF NOT EXISTS team_timers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  problem_id INT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
  UNIQUE KEY unique_team_problem (team_id, problem_id)
);
