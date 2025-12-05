-- Add anonymous name field for forum posting
-- Each user gets a unique anonymous identity for the forum

-- Add the anonymous_name column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS anonymous_name TEXT;

-- Create a function to generate unique anonymous names
CREATE OR REPLACE FUNCTION generate_anonymous_name()
RETURNS TEXT AS $$
DECLARE
    adjectives TEXT[] := ARRAY[
        'Swift', 'Brave', 'Silent', 'Wild', 'Golden', 'Shadow', 'Crystal', 'Storm',
        'Mystic', 'Noble', 'Clever', 'Fierce', 'Cosmic', 'Arctic', 'Blazing', 'Lunar',
        'Solar', 'Electric', 'Quantum', 'Neon', 'Cyber', 'Stealth', 'Thunder', 'Velvet',
        'Crimson', 'Emerald', 'Sapphire', 'Ruby', 'Onyx', 'Jade', 'Amber', 'Ivory',
        'Phantom', 'Rogue', 'Echo', 'Zen', 'Nova', 'Apex', 'Prime', 'Alpha'
    ];
    animals TEXT[] := ARRAY[
        'Phoenix', 'Dragon', 'Wolf', 'Falcon', 'Tiger', 'Panther', 'Eagle', 'Hawk',
        'Raven', 'Fox', 'Lion', 'Bear', 'Shark', 'Cobra', 'Viper', 'Jaguar',
        'Leopard', 'Owl', 'Lynx', 'Puma', 'Cheetah', 'Griffin', 'Sphinx', 'Kraken',
        'Hydra', 'Unicorn', 'Pegasus', 'Mantis', 'Scorpion', 'Raptor', 'Mongoose', 'Orca',
        'Dolphin', 'Condor', 'Coyote', 'Raccoon', 'Badger', 'Osprey', 'Sparrow', 'Finch'
    ];
    adj TEXT;
    animal TEXT;
    num INT;
    result TEXT;
BEGIN
    -- Pick random adjective and animal
    adj := adjectives[1 + floor(random() * array_length(adjectives, 1))::int];
    animal := animals[1 + floor(random() * array_length(animals, 1))::int];
    num := floor(random() * 9000 + 1000)::int;  -- Random 4-digit number
    
    result := adj || ' ' || animal || ' #' || num;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate anonymous names for all existing users who don't have one
UPDATE public.users 
SET anonymous_name = generate_anonymous_name()
WHERE anonymous_name IS NULL;

-- Create a trigger to auto-generate anonymous names for new users
CREATE OR REPLACE FUNCTION set_anonymous_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.anonymous_name IS NULL THEN
        NEW.anonymous_name := generate_anonymous_name();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS trigger_set_anonymous_name ON public.users;

-- Create the trigger
CREATE TRIGGER trigger_set_anonymous_name
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION set_anonymous_name();

-- Also ensure handle_new_user function sets anonymous name
-- (This catches users created via Supabase Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    anon_name TEXT;
BEGIN
    -- Generate anonymous name
    anon_name := (SELECT generate_anonymous_name());
    
    INSERT INTO public.users (id, email, first_name, last_name, anonymous_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        anon_name
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        anonymous_name = COALESCE(public.users.anonymous_name, anon_name);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

