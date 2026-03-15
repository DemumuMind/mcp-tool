CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  password_hash TEXT,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_documents (
  collection_name TEXT NOT NULL,
  document_id TEXT NOT NULL,
  status TEXT,
  ordinal INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (collection_name, document_id)
);

CREATE INDEX IF NOT EXISTS admin_documents_collection_ordinal_idx
  ON admin_documents (collection_name, ordinal);

CREATE TABLE IF NOT EXISTS admin_singletons (
  key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
