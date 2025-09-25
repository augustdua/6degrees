-- Debug script to check target_claims authentication issues
-- Run this to understand what's happening with your RLS policies

-- 1. Check current RLS policies on target_claims
SELECT 
    'CURRENT_POLICIES' as check_type,
    policyname,
    cmd as operation,
    permissive,
    roles,
    qual as condition,
    with_check as insert_check
FROM pg_policies 
WHERE tablename = 'target_claims'
ORDER BY policyname;

-- 2. Check if RLS is enabled
SELECT 
    'RLS_STATUS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'target_claims';

-- 3. Check table structure
SELECT 
    'TABLE_STRUCTURE' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'target_claims' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Test data (if any exists)
SELECT 
    'SAMPLE_DATA' as check_type,
    COUNT(*) as total_claims,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_claims,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_claims,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_claims
FROM public.target_claims;

-- 5. Check if there are any constraint violations
SELECT 
    'CONSTRAINT_CHECK' as check_type,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'target_claims' 
AND table_schema = 'public';

