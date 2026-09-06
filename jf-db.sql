DROP DATABASE IF EXISTS jumpfortress;
CREATE DATABASE jumpfortress;
USE jumpfortress;

CREATE TABLE role (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  level INT UNSIGNED NOT NULL,
  name VARCHAR(20) NOT NULL,
  CONSTRAINT chk_role_name
    CHECK (CHAR_LENGTH(name) > 0),
  CONSTRAINT unq_role
    UNIQUE (name)
);

CREATE TABLE claim (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  CONSTRAINT chk_claim_name
    CHECK (CHAR_LENGTH(name) > 0),
  CONSTRAINT unq_claim
    UNIQUE (name)
);

CREATE TABLE role_claim (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NOT NULL,
  claim_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_claim_role_role_id
    FOREIGN KEY (role_id)
    REFERENCES role(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_claim_role_claim_id
    FOREIGN KEY (claim_id)
    REFERENCES claim(id)
    ON DELETE CASCADE,
  CONSTRAINT unq_role_claim
    UNIQUE (role_id, claim_id)
);

ALTER TABLE role_claim ADD INDEX idx_role_claim (role_id);

CREATE TABLE division (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(30) NOT NULL,
  color VARCHAR(6) NOT NULL,
  CONSTRAINT chk_division_name
    CHECK (CHAR_LENGTH(name) > 0),
  CONSTRAINT chk_division_color
    CHECK (CHAR_LENGTH(color) = 6),
  CONSTRAINT unq_division
    UNIQUE (name)
);

CREATE TABLE user (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  steam_id_64 VARCHAR(17) NOT NULL,
  tempus_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_user_role_id
    FOREIGN KEY (role_id)
    REFERENCES role(id),
  CONSTRAINT chk_user_steam_id_64
    CHECK (CHAR_LENGTH(steam_id_64) = 17),
  CONSTRAINT unq_user
    UNIQUE (steam_id_64, tempus_id)
);

ALTER TABLE user ADD INDEX idx_user (steam_id_64);

CREATE TABLE user_division (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  division_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_user_division_user_id
    FOREIGN KEY (user_id)
    REFERENCES user(id),
  CONSTRAINT fk_user_division_division_id
    FOREIGN KEY (division_id)
    REFERENCES division(id)
    ON DELETE CASCADE,
  CONSTRAINT unq_user_division
    UNIQUE (user_id, division_id)
);

ALTER TABLE user_division ADD INDEX idx_user_division (user_id);

CREATE TABLE bounty_event (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  description TEXT NOT NULL,
  start DATETIME NOT NULL,
  end DATETIME NOT NULL
);

CREATE TABLE bounty_prize (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  key_prize INT UNSIGNED NOT NULL,
  division_id INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_bounty_prize_division_id
    FOREIGN KEY (division_id)
    REFERENCES division(id),
  CONSTRAINT fk_bounty_prize_event_id
    FOREIGN KEY (event_id)
    REFERENCES bounty_event(id)
    ON DELETE CASCADE
);

ALTER TABLE bounty_prize ADD INDEX idx_bounty_prize (event_id);

CREATE TABLE bounty_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  prize_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_bounty_map_prize_id
    FOREIGN KEY (prize_id)
    REFERENCES bounty_prize(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_bounty_map_name
    CHECK (CHAR_LENGTH(name) > 0)
);

ALTER TABLE bounty_map ADD INDEX idx_bounty_map (prize_id);

CREATE TABLE bounty_completion (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_bounty_completion_user_id
    FOREIGN KEY (user_id)
    REFERENCES user(id),
  CONSTRAINT fk_bounty_completion_map_id
    FOREIGN KEY (map_id)
    REFERENCES bounty_map(id)
    ON DELETE CASCADE
);

ALTER TABLE bounty_completion ADD INDEX idx_bounty_completion_1 (map_id);
ALTER TABLE bounty_completion ADD INDEX idx_bounty_completion_2 (user_id);
ALTER TABLE bounty_completion ADD INDEX idx_bounty_completion_3 (map_id, user_id);

CREATE TABLE all_out_event (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  description TEXT NOT NULL,
  stage_1_start DATETIME NOT NULL,
  stage_2_start DATETIME NOT NULL,
  stage_3_start DATETIME NOT NULL,
  stage_1_end DATETIME NOT NULL,
  stage_2_end DATETIME NOT NULL,
  stage_3_end DATETIME NOT NULL,
  stage_1_description TEXT NOT NULL,
  stage_2_description TEXT NOT NULL,
  stage_3_description TEXT NOT NULL,
  CONSTRAINT chk_all_out_event_description
    CHECK (CHAR_LENGTH(description) > 0)
);

CREATE TABLE all_out_participant (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_participant_user_id
    FOREIGN KEY (user_id)
    REFERENCES user(id),
  CONSTRAINT fk_all_out_participant_event_id
    FOREIGN KEY (event_id)
    REFERENCES all_out_event(id)
    ON DELETE CASCADE,
  CONSTRAINT unq_all_out_participant
    UNIQUE (event_id, user_id)
);

ALTER TABLE all_out_participant ADD INDEX idx_all_out_participant_1 (event_id);
ALTER TABLE all_out_participant ADD INDEX idx_all_out_participant_2 (user_id);
ALTER TABLE all_out_participant ADD INDEX idx_all_out_participant_3 (event_id, user_id);

CREATE TABLE all_out_participant_division (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  division_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_participant_division_participant_id
    FOREIGN KEY (participant_id)
    REFERENCES all_out_participant(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_all_out_participant_division_division_id
    FOREIGN KEY (division_id)
    REFERENCES division(id),
  CONSTRAINT unq_al_out_particpant_division
    UNIQUE (participant_id, division_id)
);

ALTER TABLE all_out_participant_division ADD INDEX idx_all_out_participant_division (participant_id);

CREATE TABLE all_out_stage_1_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  time_limit INT UNSIGNED NOT NULL,
  division_id INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_1_map_division_id
    FOREIGN KEY (division_id)
    REFERENCES division(id),
  CONSTRAINT fk_all_out_stage_1_map_event_id
    FOREIGN KEY (event_id)
    REFERENCES all_out_event(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_all_out_stage_1_map_name
    CHECK (CHAR_LENGTH(name) > 0)
);

ALTER TABLE all_out_stage_1_map ADD INDEX idx_all_out_stage_1_map (event_id);

CREATE TABLE all_out_stage_2_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  division_id INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_2_map_division_id
    FOREIGN KEY (division_id)
    REFERENCES division(id),
  CONSTRAINT fk_all_out_stage_2_map_event_id
    FOREIGN KEY (event_id)
    REFERENCES all_out_event(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_all_out_stage_2_map_name
    CHECK (CHAR_LENGTH(name) > 0)
);

ALTER TABLE all_out_stage_2_map ADD INDEX idx_all_out_stage_2_map (event_id);

CREATE TABLE all_out_stage_3_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  division_id INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_3_map_division_id
    FOREIGN KEY (division_id)
    REFERENCES division(id),
  CONSTRAINT fk_all_out_stage_3_map_event_id
    FOREIGN KEY (event_id)
    REFERENCES all_out_event(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_all_out_stage_3_map_name
    CHECK (CHAR_LENGTH(name) > 0)
);

ALTER TABLE all_out_stage_3_map ADD INDEX idx_all_out_stage_3_map (event_id);

CREATE TABLE all_out_stage_1_leaderboard (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pr_timestamp DATETIME NOT NULL,
  pr_seconds FLOAT(2) UNSIGNED NOT NULL,
  participant_id INT UNSIGNED NOT NULL,
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_1_leaderboard_participant_id
    FOREIGN KEY (participant_id)
    REFERENCES all_out_participant(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_all_out_stage_1_leaderboard_map_id
    FOREIGN KEY (map_id)
    REFERENCES all_out_stage_1_map(id)
    ON DELETE CASCADE,
  CONSTRAINT unq_all_out_stage_1_leaderboard
    UNIQUE (map_id, participant_id)
);

ALTER TABLE all_out_stage_1_leaderboard ADD INDEX idx_all_out_stage_1_leaderboard (map_id);

CREATE TABLE all_out_stage_2_leaderboard (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pr_timestamp DATETIME NOT NULL,
  pr_seconds FLOAT(2) UNSIGNED NOT NULL,
  lap_count INT UNSIGNED NOT NULL,
  last_lap_timestamp DATETIME NOT NULL,
  participant_id INT UNSIGNED NOT NULL,
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_2_leaderboard_participant_id
    FOREIGN KEY (participant_id)
    REFERENCES all_out_participant(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_all_out_stage_2_leaderboard_map_id
    FOREIGN KEY (map_id)
    REFERENCES all_out_stage_2_map(id)
    ON DELETE CASCADE,
  CONSTRAINT unq_all_out_stage_2_leaderboard
    UNIQUE (map_id, participant_id)
);

ALTER TABLE all_out_stage_2_leaderboard ADD INDEX idx_all_out_stage_2_leaderboard (map_id);

CREATE TABLE all_out_stage_3_leaderboard (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pr_timestamp DATETIME NOT NULL,
  pr_seconds FLOAT(2) UNSIGNED NOT NULL,
  participant_id INT UNSIGNED NOT NULL,
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_all_out_stage_3_leaderboard_participant_id
    FOREIGN KEY (participant_id)
    REFERENCES all_out_participant(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_all_out_stage_3_leaderboard_map_id
    FOREIGN KEY (map_id)
    REFERENCES all_out_stage_3_map(id)
    ON DELETE CASCADE,
  CONSTRAINT unq_all_out_stage_3_leaderboard
    UNIQUE (map_id, participant_id)
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
  user_id INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  division_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_monthly_participant_user_id
    FOREIGN KEY (user_id)
    REFERENCES user(id),
  CONSTRAINT fk_monthly_participant_event_id
    FOREIGN KEY (event_id)
    REFERENCES monthly_event(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_monthly_participant_division_id
    FOREIGN key (division_id)
    REFERENCES division(id),
  CONSTRAINT unq_monthly_participant
    UNIQUE (event_id, user_id)
);

ALTER TABLE monthly_participant ADD INDEX idx_monthly_participant_1 (event_id);
ALTER TABLE monthly_participant ADD INDEX idx_monthly_participant_2 (user_id);
ALTER TABLE monthly_participant ADD INDEX idx_monthly_participant_3 (event_id, user_id);

CREATE TABLE monthly_participant_division (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  division_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_monthly_participant_division_participant_id
    FOREIGN KEY (participant_id)
    REFERENCES monthly_participant(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_monthly_participant_division_division_id
    FOREIGN KEY (division_id)
    REFERENCES division(id)
);

ALTER TABLE monthly_participant_division ADD INDEX idx_monthly_participant_division (participant_id);

CREATE TABLE monthly_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_monthly_map_event_id
    FOREIGN KEY (event_id)
    REFERENCES monthly_event(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_monthly_map_name
    CHECK (CHAR_LENGTH(name) > 0)
);

ALTER TABLE monthly_map ADD INDEX idx_monthly_map (event_id);

CREATE TABLE monthly_leaderboard (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pr_timestamp DATETIME NOT NULL,
  pr_seconds FLOAT(2) UNSIGNED NOT NULL,
  participant_id INT UNSIGNED NOT NULL,
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_monthly_leaderboard_participant_id
    FOREIGN KEY (participant_id)
    REFERENCES monthly_participant(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_monthly_leaderboard_map_id
    FOREIGN KEY (map_id)
    REFERENCES monthly_map(id)
    ON DELETE CASCADE,
  CONSTRAINT unq_monthly_leaderboard
    UNIQUE (map_id, participant_id)
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
  user_id INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_tournament_participant
    FOREIGN KEY (user_id)
    REFERENCES user(id),
  CONSTRAINT fk_tournament_participant_event_id
    FOREIGN KEY (event_id)
    REFERENCES tournament_event(id)
    ON DELETE CASCADE,
  CONSTRAINT unq_tournament_participant
    UNIQUE (event_id, user_id)
);

ALTER TABLE tournament_participant ADD INDEX idx_tournament_participant_1 (event_id);
ALTER TABLE tournament_participant ADD INDEX idx_tournament_participant_2 (user_id);
ALTER TABLE tournament_participant ADD INDEX idx_tournament_participant_3 (event_id, user_id);

CREATE TABLE tournament_map (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_tournament_map_event_id
    FOREIGN KEY (event_id)
    REFERENCES tournament_event(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_tournament_map_name
    CHECK (CHAR_LENGTH(name) > 0)
);

ALTER TABLE tournament_map ADD INDEX idx_tournament_map (event_id);

CREATE TABLE tournament_leaderboard (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pr_timestamp DATETIME NOT NULL,
  pr_seconds FLOAT(2) UNSIGNED NOT NULL,
  stage INT UNSIGNED NOT NULL,
  participant_id INT UNSIGNED NOT NULL,
  map_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_tournament_leaderboard_participant_id
    FOREIGN KEY (participant_id)
    REFERENCES tournament_participant(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_tournament_leaderboard_map_id
    FOREIGN KEY (map_id)
    REFERENCES tournament_map(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_tournament_leaderboard_stage
    CHECK (stage > 1),
  CONSTRAINT unq_tournament_leaderboard
    UNIQUE (map_id, participant_id)
);

ALTER TABLE tournament_leaderboard ADD INDEX idx_tournament_leaderboard (map_id);