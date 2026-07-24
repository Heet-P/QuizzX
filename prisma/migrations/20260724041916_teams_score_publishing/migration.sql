-- DropIndex
DROP INDEX "idx_submission_events_quiz_id";

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "scores_published_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "teams_integrations" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "webhook_url_enc" TEXT NOT NULL,
    "label" VARCHAR(120),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_tested_at" TIMESTAMPTZ,
    "last_test_ok" BOOLEAN,

    CONSTRAINT "teams_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_integrations_owner_id_key" ON "teams_integrations"("owner_id");

-- AddForeignKey
ALTER TABLE "teams_integrations" ADD CONSTRAINT "teams_integrations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
