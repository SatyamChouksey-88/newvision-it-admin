-- Optional status applied when a canned reply is sent.
ALTER TABLE "canned_responses" ADD COLUMN "status_on_send" "TicketStatus";
