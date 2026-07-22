-- Two indexes from v1's server/migrations/001_initial_schema.sql that aren't expressible
-- in Prisma's schema DSL (partial WHERE clause / explicit ASC on a composite index),
-- plus the seed data v1 shipped with (app_settings + achievements catalogue).
-- See MIGRATION_AUDIT.md Section 5 and MEMORY.md Section 6.1/6.2.

CREATE INDEX IF NOT EXISTS idx_submissions_completed_score
    ON submissions(quiz_id, score DESC, submitted_at ASC)
    WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_submission_events_quiz_id
    ON submission_events(quiz_id, id ASC);

-- Seed data (idempotent)
INSERT INTO app_settings (key, value) VALUES
    ('leaderboard_visible', 'true'),
    ('current_season',      '"Spring 2026"'),
    ('season_start',        '"2026-01-01"')
ON CONFLICT (key) DO NOTHING;

-- achievements.id has no DB-level default (Prisma's @default(uuid()) is a client-side
-- default only, not applied to the generated DDL) so raw SQL inserts must supply one.
INSERT INTO achievements (id, slug, name, description, icon, xp_reward) VALUES
    (gen_random_uuid(), 'first_quiz',     'First Blood',       'Complete your first quiz',                 '🎯', 50),
    (gen_random_uuid(), 'perfect_score',  'Perfect Score',     'Score 100% on any quiz',                   '💯', 100),
    (gen_random_uuid(), 'streak_3',       'On Fire',           'Maintain a 3-day quiz streak',             '🔥', 75),
    (gen_random_uuid(), 'streak_7',       'Week Warrior',      'Maintain a 7-day quiz streak',             '⚡', 150),
    (gen_random_uuid(), 'lockdown_clean', 'Lockdown Survivor', 'Complete Lockdown mode without tab switch', '🔒', 100),
    (gen_random_uuid(), 'speed_demon',    'Speed Demon',       'Complete a Speed Round quiz',              '⚡', 60),
    (gen_random_uuid(), 'top_3',          'Podium Finish',     'Rank in top 3 on any leaderboard',         '🏆', 120)
ON CONFLICT (slug) DO NOTHING;
