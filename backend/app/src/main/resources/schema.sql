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
    clip_id BIGINT NULL,
    community_id BIGINT NULL,
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
    shared_post_unavailable BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id),
    FOREIGN KEY (shared_post_id) REFERENCES posts(id) ON DELETE SET NULL
);

ALTER TABLE messages ADD COLUMN shared_post_id BIGINT NULL;
ALTER TABLE messages ADD COLUMN shared_post_unavailable BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_messages_shared_post_id ON messages(shared_post_id);
ALTER TABLE messages ADD CONSTRAINT fk_messages_shared_post FOREIGN KEY (shared_post_id) REFERENCES posts(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN deleted_for_sender BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN deleted_for_receiver BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN deleted_for_everyone BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS playlists (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlist_items (
    playlist_id BIGINT,
    clip_id BIGINT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, clip_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (clip_id) REFERENCES clips(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clip_groups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(30) DEFAULT 'LIBRARY',
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

CREATE TABLE IF NOT EXISTS communities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(255),
    type VARCHAR(30) DEFAULT 'USER',
    game_id BIGINT NULL,
    founder_id BIGINT NULL,
    moderation_status VARCHAR(30) DEFAULT 'PENDING_REVIEW',
    moderation_reason TEXT,
    rules TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL,
    FOREIGN KEY (founder_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS community_members (
    community_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(30) DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE posts MODIFY COLUMN clip_id BIGINT NULL;
ALTER TABLE posts ADD COLUMN community_id BIGINT NULL;
ALTER TABLE posts ADD CONSTRAINT fk_posts_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;

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
ALTER TABLE communities ADD COLUMN rules TEXT;
UPDATE clips
SET visibility_status = CASE
    WHEN is_public = true THEN 'PUBLIC'
    WHEN visibility_status IS NULL THEN 'PRIVATE'
    ELSE visibility_status
END;
ALTER TABLE clips DROP COLUMN is_public;

-- Runtime query indexes. These speed up feed, profile favorites, comments,
-- moderation queue, and direct message screens as the dataset grows.
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at);
CREATE INDEX idx_posts_clip ON posts(clip_id);
CREATE INDEX idx_posts_community_created ON posts(community_id, created_at);

CREATE INDEX idx_clips_public_feed ON clips(visibility_status, moderation_status, is_deleted, created_at);
CREATE INDEX idx_clips_uploader_active ON clips(uploader_id, is_deleted, created_at);
CREATE INDEX idx_clips_moderation_queue ON clips(moderation_status, is_deleted, created_at);

CREATE INDEX idx_comments_post_created ON comments(post_id, created_at);
CREATE INDEX idx_comments_user_created ON comments(user_id, created_at);

CREATE INDEX idx_messages_sender_receiver_created ON messages(sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_receiver_sender_created ON messages(receiver_id, sender_id, created_at);
CREATE INDEX idx_messages_user_latest_sender ON messages(sender_id, created_at);
CREATE INDEX idx_messages_user_latest_receiver ON messages(receiver_id, created_at);

CREATE INDEX idx_favorites_user_created ON user_favorites(user_id, created_at);
CREATE INDEX idx_favorites_clip ON user_favorites(clip_id);
CREATE INDEX idx_communities_status_created ON communities(moderation_status, created_at);
CREATE INDEX idx_communities_game ON communities(game_id);
CREATE INDEX idx_community_members_user ON community_members(user_id, community_id);
CREATE INDEX idx_clip_groups_user_created ON clip_groups(user_id, created_at);
CREATE INDEX idx_clip_group_items_clip ON clip_group_items(clip_id);

CREATE INDEX idx_follows_followed ON follows(followed_id, follower_id);
CREATE INDEX idx_moderation_results_target_created ON moderation_results(target_type, target_id, created_at);
CREATE INDEX idx_content_reports_open_target ON content_reports(status, target_type, target_id, created_at);
CREATE INDEX idx_content_reports_reporter_target ON content_reports(reporter_id, target_type, target_id, status);

ALTER TABLE posts ADD COLUMN original_post_id BIGINT NULL;
ALTER TABLE posts ADD COLUMN repost_type VARCHAR(30) NULL;
ALTER TABLE posts ADD CONSTRAINT fk_posts_original_post FOREIGN KEY (original_post_id) REFERENCES posts(id) ON DELETE SET NULL;
