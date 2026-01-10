-- Store contact birthdays (from Google People API) per user, for "Moments" reminders.

CREATE TABLE IF NOT EXISTS contact_birthdays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Stable identifier from Google People API (e.g. "people/c123...")
  resource_name TEXT NOT NULL,

  display_name TEXT,
  photo_url TEXT,
  primary_email TEXT,
  primary_phone_digits TEXT,

  birthday_month INT NOT NULL CHECK (birthday_month BETWEEN 1 AND 12),
  birthday_day INT NOT NULL CHECK (birthday_day BETWEEN 1 AND 31),
  birthday_year INT,

  source TEXT DEFAULT 'google_people',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_birthdays_owner_resource
  ON contact_birthdays(owner_id, resource_name);

CREATE INDEX IF NOT EXISTS idx_contact_birthdays_owner_md
  ON contact_birthdays(owner_id, birthday_month, birthday_day);

ALTER TABLE contact_birthdays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own contact birthdays" ON contact_birthdays;
CREATE POLICY "Users can view their own contact birthdays"
ON contact_birthdays FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own contact birthdays" ON contact_birthdays;
CREATE POLICY "Users can manage their own contact birthdays"
ON contact_birthdays FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());


