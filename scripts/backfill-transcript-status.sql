-- Backfill: sync transcript text node status to match their corresponding song's status.
--
-- For every song node, find the "i prefer to read 🤓" folder among its siblings
-- (same parent_id), then find the text node inside that folder with a matching title,
-- and update the text node's status to match the song's status.

UPDATE menu_nodes AS transcript
SET status = song.status, updated_at = NOW()
FROM menu_nodes AS song
JOIN menu_nodes AS read_folder
  ON read_folder.parent_id = song.parent_id
  AND read_folder.type = 'folder'
  AND read_folder.title = 'i prefer to read 🤓'
WHERE song.type = 'song'
  AND transcript.parent_id = read_folder.id
  AND transcript.type = 'text'
  AND transcript.title = song.title
  AND transcript.status != song.status;
