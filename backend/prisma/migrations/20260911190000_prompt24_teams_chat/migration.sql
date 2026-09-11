-- Prompt 24: Teams-style chat. Existing chat_channels / chat_messages / members are kept.
-- New enum values are added but not referenced in DML here (PostgreSQL cannot use a
-- newly added enum value until the surrounding transaction commits).

ALTER TYPE "ChatChannelType" ADD VALUE IF NOT EXISTS 'channel';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'chat_mention';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'chat_thread_reply';

CREATE TYPE "ChatVisibility" AS ENUM ('public', 'private');
CREATE TYPE "ChatMemberRole" AS ENUM ('owner', 'member');
CREATE TYPE "ChatNotifyPref" AS ENUM ('all', 'mentions', 'muted');
CREATE TYPE "ChatMentionKind" AS ENUM ('user', 'channel', 'here');
CREATE TYPE "ChatPresenceMode" AS ENUM ('auto', 'available', 'away', 'busy', 'dnd');

ALTER TABLE "users" ADD COLUMN "last_seen_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "presence_mode" "ChatPresenceMode" NOT NULL DEFAULT 'auto';

ALTER TABLE "notifications" ADD COLUMN "link" TEXT;

ALTER TABLE "chat_channels" ADD COLUMN "description" TEXT;
ALTER TABLE "chat_channels" ADD COLUMN "topic" TEXT;
ALTER TABLE "chat_channels" ADD COLUMN "visibility" "ChatVisibility" NOT NULL DEFAULT 'public';
ALTER TABLE "chat_channels" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_channels" ADD COLUMN "created_by_id" INTEGER;

ALTER TABLE "chat_channels"
  ADD CONSTRAINT "chat_channels_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chat_channel_members" ADD COLUMN "role" "ChatMemberRole" NOT NULL DEFAULT 'member';
ALTER TABLE "chat_channel_members" ADD COLUMN "last_read_message_id" INTEGER;
ALTER TABLE "chat_channel_members" ADD COLUMN "muted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_channel_members" ADD COLUMN "notify_pref" "ChatNotifyPref" NOT NULL DEFAULT 'all';
ALTER TABLE "chat_channel_members" ADD COLUMN "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "chat_messages" ADD COLUMN "parent_id" INTEGER;
ALTER TABLE "chat_messages" ADD COLUMN "edited_at" TIMESTAMP(3);
ALTER TABLE "chat_messages" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "chat_messages_parent_id_idx" ON "chat_messages"("parent_id");

CREATE TABLE "chat_attachments" (
    "id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploaded_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_reactions" (
    "id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_reactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_mentions" (
    "id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "kind" "ChatMentionKind" NOT NULL,
    CONSTRAINT "chat_mentions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_attachments_message_id_idx" ON "chat_attachments"("message_id");
CREATE UNIQUE INDEX "chat_reactions_message_id_user_id_emoji_key" ON "chat_reactions"("message_id", "user_id", "emoji");
CREATE INDEX "chat_mentions_message_id_idx" ON "chat_mentions"("message_id");
CREATE INDEX "chat_mentions_user_id_idx" ON "chat_mentions"("user_id");

ALTER TABLE "chat_attachments"
  ADD CONSTRAINT "chat_attachments_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_attachments"
  ADD CONSTRAINT "chat_attachments_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "chat_reactions"
  ADD CONSTRAINT "chat_reactions_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_reactions"
  ADD CONSTRAINT "chat_reactions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_mentions"
  ADD CONSTRAINT "chat_mentions_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_mentions"
  ADD CONSTRAINT "chat_mentions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
