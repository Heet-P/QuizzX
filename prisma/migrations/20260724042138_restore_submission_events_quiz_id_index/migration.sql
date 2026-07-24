-- The previous migration (20260724041916_teams_score_publishing) had a side
-- effect: Prisma's diff engine doesn't know about idx_submission_events_quiz_id
-- (it's a hand-written index from 20260722162409_partial_indexes_and_seed,
-- never expressible in the schema DSL — see that migration's own header
-- comment and the schema.prisma top-of-file note), so it saw an "untracked"
-- index and dropped it as drift correction. This restores it, same DDL as
-- when it was first added.
CREATE INDEX IF NOT EXISTS idx_submission_events_quiz_id
    ON submission_events(quiz_id, id ASC);
