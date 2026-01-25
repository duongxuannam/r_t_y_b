ALTER TABLE todos
    ADD COLUMN status TEXT NOT NULL DEFAULT 'todo',
    ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

UPDATE todos
SET status = CASE WHEN completed THEN 'done' ELSE 'todo' END;

WITH ordered AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at) - 1 AS position
    FROM todos
)
UPDATE todos
SET position = ordered.position
FROM ordered
WHERE todos.id = ordered.id;
