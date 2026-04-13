-- Dummy Data for Highligt Vault Database

-- 1. Games
INSERT INTO games (id, name, cover_url) VALUES 
(1, 'Valorant', 'https://picsum.photos/300/400?random=1'),
(2, 'League of Legends', 'https://picsum.photos/300/400?random=2'),
(3, 'CS2', 'https://picsum.photos/300/400?random=3')
ON DUPLICATE KEY UPDATE name=name;

-- 2. Tags
INSERT INTO tags (id, name) VALUES 
(1, 'Ace'), (2, 'Clutch'), (3, 'Fail'), (4, 'Funny'), (5, 'Sniper')
ON DUPLICATE KEY UPDATE name=name;

-- 3. Users (Passwords are just hashes of "password" for testing)
INSERT INTO users (id, username, email, password_hash, description, profile_photo_url, is_admin) VALUES 
(1, 'Player One', 'playerone@test.com', 'dummy_hash', 'Competitive FPS player.', 'https://i.pravatar.cc/150?img=3', TRUE),
(2, 'NeonMain99', 'neon@test.com', 'dummy_hash', 'I main Neon!', 'https://i.pravatar.cc/150?img=11', FALSE),
(3, 'FakerFanboy', 'faker@test.com', 'dummy_hash', 'Lee Sin main.', 'https://i.pravatar.cc/150?img=12', FALSE)
ON DUPLICATE KEY UPDATE username=username;

-- 4. Clips
INSERT INTO clips (id, title, video_url, thumbnail_url, duration, uploader_id, game_id) VALUES 
(1, 'Jett 4K Ace on Bind', 'assets/videos/clip1.mp4', 'https://picsum.photos/200/300?random=50', 28, 1, 1),
(2, 'AWP 3K Mid Peek', 'assets/videos/clip4.mp4', 'https://picsum.photos/200/300?random=51', 18, 1, 3),
(3, 'Lee Sin Dragon Steal', 'assets/videos/clip3.mp4', 'https://picsum.photos/200/300?random=21', 19, 3, 2),
(4, 'Neon High Speed Entry', 'assets/videos/clip2.mp4', 'https://picsum.photos/200/300?random=11', 15, 2, 1)
ON DUPLICATE KEY UPDATE title=title;

-- 5. Posts
INSERT INTO posts (id, user_id, clip_id, caption) VALUES 
(1, 1, 1, 'Check out this insane Jett rotation!'),
(2, 3, 3, 'They thought they had Baron...'),
(3, 2, 4, 'Fastest entry on site you will ever see.')
ON DUPLICATE KEY UPDATE caption=caption;

-- 6. Comments
INSERT INTO comments (id, user_id, post_id, content) VALUES 
(1, 2, 1, 'Bro that flick at the end was insane!'),
(2, 3, 1, 'What sensitivity do you play on?'),
(3, 1, 2, 'Legendary steal.'),
(4, 1, 3, 'I need to practice that movement.')
ON DUPLICATE KEY UPDATE content=content;

-- 7. Post Likes
INSERT IGNORE INTO post_likes (user_id, post_id) VALUES 
(2, 1), (3, 1), (1, 2), (1, 3);

-- 8. Clip Tags
INSERT IGNORE INTO clip_tags (clip_id, tag_id) VALUES 
(1, 1), (2, 5), (3, 2), (4, 4);
