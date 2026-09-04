DROP DATABASE IF EXISTS jumpfortress;
CREATE DATABASE jumpfortress;
USE jumpfortress;

CREATE TABLE bounty_event (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  description TEXT NOT NULL,
  start DATETIME NOT NULL,
  end DATETIME NOT NULL
);

CREATE TABLE bounty_prize (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  division VARCHAR(50) NOT NULL,
  key_prize INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_bounty_prize_event_id
    FOREIGN KEY (event_id)
    REFERENCES bounty_event(id)
    ON DELETE CASCADE
);

ALTER TABLE bounty_prize ADD INDEX idx_bounty_prize (event_id);

CREATE TABLE bounty_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL CHECK (CHAR_LENGTH(name) > 0),
  prize_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_bounty_map_prize_id
    FOREIGN KEY (prize_id)
    REFERENCES bounty_prize(id)
    ON DELETE CASCADE
);

ALTER TABLE bounty_map ADD INDEX idx_bounty_map (prize_id);

CREATE TABLE bounty_completion (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  steam_id_64 VARCHAR(17) NOT NULL CHECK (CHAR_LENGTH(steam_id_64) = 17),
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_bounty_completion_map_id
    FOREIGN KEY (map_id)
    REFERENCES bounty_map(id)
    ON DELETE CASCADE
);

ALTER TABLE bounty_completion ADD INDEX idx_bounty_completion (map_id);

CREATE TABLE all_out_event (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  description TEXT NOT NULL CHECK (CHAR_LENGTH(description) > 0),
  stage_1_start DATETIME NOT NULL,
  stage_2_start DATETIME NOT NULL,
  stage_3_start DATETIME NOT NULL,
  stage_1_end DATETIME NOT NULL,
  stage_2_end DATETIME NOT NULL,
  stage_3_end DATETIME NOT NULL,
  stage_1_description TEXT NOT NULL,
  stage_2_description TEXT NOT NULL,
  stage_3_description TEXT NOT NULL
);

CREATE TABLE all_out_participant (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  steam_id_64 VARCHAR(17) NOT NULL CHECK (CHAR_LENGTH(steam_id_64) = 17),
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_participant_event_id
    FOREIGN KEY (event_id)
    REFERENCES all_out_event(id)
    ON DELETE CASCADE
);

ALTER TABLE all_out_participant ADD INDEX idx_all_out_participant_1 (event_id);
ALTER TABLE all_out_participant ADD INDEX idx_all_out_participant_2 (event_id, steam_id_64);

CREATE TABLE all_out_stage_1_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL CHECK (CHAR_LENGTH(name) > 0),
  time_limit INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_1_map_event_id
    FOREIGN KEY (event_id)
    REFERENCES all_out_event(id)
    ON DELETE CASCADE
);

ALTER TABLE all_out_stage_1_map ADD INDEX idx_all_out_stage_1_map (event_id);

CREATE TABLE all_out_stage_2_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL CHECK (CHAR_LENGTH(name) > 0),
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_2_map_event_id
    FOREIGN KEY (event_id)
    REFERENCES all_out_event(id)
    ON DELETE CASCADE
);

ALTER TABLE all_out_stage_2_map ADD INDEX idx_all_out_stage_2_map (event_id);

CREATE TABLE all_out_stage_3_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL CHECK (CHAR_LENGTH(name) > 0),
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_3_map_event_id
    FOREIGN KEY (event_id)
    REFERENCES all_out_event(id)
    ON DELETE CASCADE
);

ALTER TABLE all_out_stage_3_map ADD INDEX idx_all_out_stage_3_map (event_id);

CREATE TABLE all_out_stage_1_leaderboard (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  steam_id_64 VARCHAR(17) NOT NULL CHECK (CHAR_LENGTH(steam_id_64) = 17),
  pr_timestamp DATETIME NOT NULL,
  pr_seconds FLOAT(2) UNSIGNED NOT NULL,
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_1_leaderboard_map_id
    FOREIGN KEY (map_id)
    REFERENCES all_out_stage_1_map(id)
    ON DELETE CASCADE
);

ALTER TABLE all_out_stage_1_leaderboard ADD INDEX idx_all_out_stage_1_leaderboard (map_id);

CREATE TABLE all_out_stage_2_leaderboard (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  steam_id_64 VARCHAR(17) NOT NULL CHECK (CHAR_LENGTH(steam_id_64) = 17),
  pr_timestamp DATETIME NOT NULL,
  pr_seconds FLOAT(2) UNSIGNED NOT NULL,
  lap_count INT UNSIGNED NOT NULL,
  last_lap_timestamp DATETIME NOT NULL,
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_2_leaderboard_map_id
    FOREIGN KEY (map_id)
    REFERENCES all_out_stage_2_map(id)
    ON DELETE CASCADE
);

ALTER TABLE all_out_stage_2_leaderboard ADD INDEX idx_all_out_stage_2_leaderboard (map_id);

CREATE TABLE all_out_stage_3_leaderboard (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  steam_id_64 VARCHAR(17) NOT NULL CHECK (CHAR_LENGTH(steam_id_64) = 17),
  pr_timestamp DATETIME NOT NULL,
  pr_seconds FLOAT(2) UNSIGNED NOT NULL,
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_3_leaderboard_map_id
    FOREIGN KEY (map_id)
    REFERENCES all_out_stage_3_map(id)
    ON DELETE CASCADE
);

ALTER TABLE all_out_stage_3_leaderboard ADD INDEX idx_all_out_stage_3_leaderboard (map_id);

CREATE TABLE monthly_event (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  description TEXT NOT NULL,
  start DATETIME NOT NULL,
  end DATETIME NOT NULL
);

CREATE TABLE monthly_participant (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  steam_id_64 VARCHAR(17) NOT NULL CHECK (CHAR_LENGTH(steam_id_64) = 17),
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_monthly_participant_event_id
    FOREIGN KEY (event_id)
    REFERENCES monthly_event(id)
    ON DELETE CASCADE
);

ALTER TABLE monthly_participant ADD INDEX idx_monthly_participant_1 (event_id);
ALTER TABLE monthly_participant ADD INDEX idx_monthly_participant_2 (event_id, steam_id_64);

CREATE TABLE monthly_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL CHECK (CHAR_LENGTH(name) > 0),
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_monthly_map_event_id
    FOREIGN KEY (event_id)
    REFERENCES monthly_event(id)
    ON DELETE CASCADE
);

ALTER TABLE monthly_map ADD INDEX idx_monthly_map (event_id);

CREATE TABLE monthly_leaderboard (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  steam_id_64 VARCHAR(17) NOT NULL CHECK (CHAR_LENGTH(steam_id_64) = 17),
  pr_timestamp DATETIME NOT NULL,
  pr_seconds FLOAT(2) UNSIGNED NOT NULL,
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_monthly_leaderboard_map_id
    FOREIGN KEY (map_id)
    REFERENCES monthly_map(id)
    ON DELETE CASCADE
);

ALTER TABLE monthly_leaderboard ADD INDEX idx_monthly_leaderboard (map_id);

CREATE TABLE tournament_event (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  description TEXT NOT NULL,
  start DATETIME NOT NULL,
  end DATETIME NOT NULL
);

CREATE TABLE tournament_participant (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  steam_id_64 VARCHAR(17) NOT NULL CHECK (CHAR_LENGTH(steam_id_64) = 17),
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_tournament_participant_event_id
    FOREIGN KEY (event_id)
    REFERENCES tournament_event(id)
    ON DELETE CASCADE
);

ALTER TABLE tournament_participant ADD INDEX idx_tournament_participant_1 (event_id);
ALTER TABLE tournament_participant ADD INDEX idx_tournament_participant_2 (event_id, steam_id_64);

CREATE TABLE tournament_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL CHECK (CHAR_LENGTH(name) > 0),
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_tournament_map_event_id
    FOREIGN KEY (event_id)
    REFERENCES tournament_event(id)
    ON DELETE CASCADE
);

ALTER TABLE tournament_map ADD INDEX idx_tournament_map (event_id);

CREATE TABLE tournament_leaderboard (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  steam_id_64 VARCHAR(17) NOT NULL CHECK (CHAR_LENGTH(steam_id_64) = 17),
  pr_timestamp DATETIME NOT NULL,
  pr_seconds FLOAT(2) UNSIGNED NOT NULL,
  stage INT UNSIGNED NOT NULL CHECK (stage > 1),
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_tournament_leaderboard_map_id
    FOREIGN KEY (map_id)
    REFERENCES tournament_map(id)
    ON DELETE CASCADE
);

ALTER TABLE tournament_leaderboard ADD INDEX idx_tournament_leaderboard (map_id);

CREATE TABLE admin (
  steam_id_64 VARCHAR(17) NOT NULL PRIMARY KEY CHECK (CHAR_LENGTH(steam_id_64) = 17) 
);