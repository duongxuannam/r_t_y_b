ALTER TABLE todos
    RENAME COLUMN user_id TO reporter_id;

ALTER INDEX todos_user_id_idx RENAME TO todos_reporter_id_idx;

ALTER TABLE todos
    ADD COLUMN assignee_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX todos_assignee_id_idx ON todos(assignee_id);

UPDATE todos
SET assignee_id = reporter_id
WHERE assignee_id IS NULL;
