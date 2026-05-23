-- Highligt Vault Database Schema
-- Tables based on the provided list

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    description TEXT,
    profile_photo_url VARCHAR(255),
    isAdmin BOOLEAN DEFAULT FALSE,
    isDeleted BOOLEAN DEFAULT FALSE,
    trust_score INT DEFAULT 50,
    violation_count INT DEFAULT 0,
    suspended_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    cover_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS clips (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    video_url VARCHAR(255) NOT NULL,
    thumbnail_url VARCHAR(255),
    duration FLOAT,
    start_time FLOAT DEFAULT 0,
    end_time FLOAT,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    moderation_status VARCHAR(30) DEFAULT 'DRAFT',
    moderation_score INT DEFAULT 0,
    moderation_reason TEXT,
    moderation_checked_at TIMESTAMP NULL,
    reviewed_by BIGINT NULL,
    reviewed_at TIMESTAMP NULL,
    removed_reason TEXT,
    removed_at TIMESTAMP NULL,
    visibility_status VARCHAR(30) DEFAULT 'PRIVATE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploader_id BIGINT,
    game_id BIGINT,
    FOREIGN KEY (uploader_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS clip_tags (
    clip_id BIGINT,
    tag_id BIGINT,
    PRIMARY KEY (clip_id, tag_id),
    FOREIGN KEY (clip_id) REFERENCES clips(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    clip_id BIGINT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (clip_id) REFERENCES clips(id)
);

CREATE TABLE IF NOT EXISTS post_likes (
    user_id BIGINT,
    post_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    post_comment_id BIGINT, -- Using this column name to match the entity logic
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (post_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS follows (
    follower_id BIGINT,
    followed_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followed_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    shared_post_id BIGINT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id),
    FOREIGN KEY (shared_post_id) REFERENCES posts(id) ON DELETE SET NULL
);

ALTER TABLE messages ADD COLUMN shared_post_id BIGINT NULL;
CREATE INDEX idx_messages_shared_post_id ON messages(shared_post_id);
ALTER TABLE messages ADD CONSTRAINT fk_messages_shared_post FOREIGN KEY (shared_post_id) REFERENCES posts(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS clip_groups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clip_group_items (
    group_id BIGINT,
    clip_id BIGINT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, clip_id),
    FOREIGN KEY (group_id) REFERENCES clip_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (clip_id) REFERENCES clips(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_favorites (
    user_id BIGINT,
    clip_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, clip_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (clip_id) REFERENCES clips(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS violated_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    original_comment_id BIGINT,
    user_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    violation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    original_created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reporter_id BIGINT NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id BIGINT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(30) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by BIGINT NULL,
    reviewed_at TIMESTAMP NULL,
    resolution TEXT,
    FOREIGN KEY (reporter_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS moderation_actions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    moderator_id BIGINT,
    target_type VARCHAR(30) NOT NULL,
    target_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    reason TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (moderator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS moderation_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    target_type VARCHAR(30) NOT NULL,
    target_id BIGINT NOT NULL,
    provider VARCHAR(50),
    category VARCHAR(50),
    score FLOAT,
    flagged BOOLEAN DEFAULT FALSE,
    raw_result JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN trust_score INT DEFAULT 50;
ALTER TABLE users ADD COLUMN violation_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN suspended_until TIMESTAMP NULL;

ALTER TABLE clips ADD COLUMN moderation_status VARCHAR(30) DEFAULT 'DRAFT';
ALTER TABLE clips ADD COLUMN moderation_score INT DEFAULT 0;
ALTER TABLE clips ADD COLUMN moderation_reason TEXT;
ALTER TABLE clips ADD COLUMN moderation_checked_at TIMESTAMP NULL;
ALTER TABLE clips ADD COLUMN reviewed_by BIGINT NULL;
ALTER TABLE clips ADD COLUMN reviewed_at TIMESTAMP NULL;
ALTER TABLE clips ADD COLUMN removed_reason TEXT;
ALTER TABLE clips ADD COLUMN removed_at TIMESTAMP NULL;
ALTER TABLE clips ADD COLUMN visibility_status VARCHAR(30) DEFAULT 'PRIVATE';
UPDATE clips
SET visibility_status = CASE
    WHEN is_public = true THEN 'PUBLIC'
    WHEN visibility_status IS NULL THEN 'PRIVATE'
    ELSE visibility_status
END;
ALTER TABLE clips DROP COLUMN is_public;

ALTER TABLE clip_groups ADD COLUMN type VARCHAR(20) DEFAULT 'LIBRARY';
