-- Fix RLS policies for leads table
-- Run this in Supabase SQL Editor

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;

-- Allow ANYONE (anon + authenticated) to INSERT leads
CREATE POLICY "Anyone can create leads" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users to SELECT leads
CREATE POLICY "Authenticated users can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated users to UPDATE leads
CREATE POLICY "Authenticated users can update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (true);
