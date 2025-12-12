import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const getProfileVocab = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [skillsRes, rolesRes, industriesRes] = await Promise.all([
      supabase.from('skills').select('id,name').order('name', { ascending: true }),
      supabase.from('roles').select('id,name').order('name', { ascending: true }),
      supabase.from('industries').select('id,name').order('name', { ascending: true }),
    ]);

    if (skillsRes.error) throw skillsRes.error;
    if (rolesRes.error) throw rolesRes.error;
    if (industriesRes.error) throw industriesRes.error;

    res.json({
      skills: skillsRes.data || [],
      roles: rolesRes.data || [],
      industries: industriesRes.data || [],
    });
  } catch (error: any) {
    console.error('Error in getProfileVocab:', error);
    res.status(500).json({ error: error.message || 'Failed to load vocab' });
  }
};

export const getMyExplicitProfileFacets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const [skillsRes, rolesRes, industriesRes, needsRes, offeringsRes] = await Promise.all([
      supabase
        .from('user_skills')
        .select('skill:skills(id,name), level, years, is_primary, created_at')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('user_roles')
        .select('role:roles(id,name), is_primary, created_at')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('user_industries')
        .select('industry:industries(id,name), is_primary, created_at')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('user_needs').select('id, need_text, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase
        .from('user_offerings')
        .select('id, offering_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    if (skillsRes.error) throw skillsRes.error;
    if (rolesRes.error) throw rolesRes.error;
    if (industriesRes.error) throw industriesRes.error;
    if (needsRes.error) throw needsRes.error;
    if (offeringsRes.error) throw offeringsRes.error;

    res.json({
      skills: skillsRes.data || [],
      roles: rolesRes.data || [],
      industries: industriesRes.data || [],
      needs: needsRes.data || [],
      offerings: offeringsRes.data || [],
    });
  } catch (error: any) {
    console.error('Error in getMyExplicitProfileFacets:', error);
    res.status(500).json({ error: error.message || 'Failed to load profile facets' });
  }
};

export const getUserExplicitProfileFacets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Check profile visibility
    const { data: userRow, error: userErr } = await supabase.from('users').select('id, is_profile_public').eq('id', userId).single();
    if (userErr || !userRow) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (!userRow.is_profile_public) {
      // Allow only the owner
      const requesterId = req.user?.id;
      if (!requesterId || requesterId !== userId) {
        res.status(403).json({ error: 'This profile is private' });
        return;
      }
    }

    const [skillsRes, rolesRes, industriesRes, needsRes, offeringsRes] = await Promise.all([
      supabase
        .from('user_skills')
        .select('skill:skills(id,name), level, years, is_primary, created_at')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('user_roles')
        .select('role:roles(id,name), is_primary, created_at')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('user_industries')
        .select('industry:industries(id,name), is_primary, created_at')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('user_needs').select('id, need_text, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase
        .from('user_offerings')
        .select('id, offering_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    if (skillsRes.error) throw skillsRes.error;
    if (rolesRes.error) throw rolesRes.error;
    if (industriesRes.error) throw industriesRes.error;
    if (needsRes.error) throw needsRes.error;
    if (offeringsRes.error) throw offeringsRes.error;

    res.json({
      skills: skillsRes.data || [],
      roles: rolesRes.data || [],
      industries: industriesRes.data || [],
      needs: needsRes.data || [],
      offerings: offeringsRes.data || [],
    });
  } catch (error: any) {
    console.error('Error in getUserExplicitProfileFacets:', error);
    res.status(500).json({ error: error.message || 'Failed to load profile facets' });
  }
};

export const saveMyExplicitProfileFacets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const skills = Array.isArray(body.skills) ? body.skills : [];
    const roles = Array.isArray(body.roles) ? body.roles : [];
    const industries = Array.isArray(body.industries) ? body.industries : [];
    const needs = Array.isArray(body.needs) ? body.needs : [];
    const offerings = Array.isArray(body.offerings) ? body.offerings : [];

    if (skills.length > 10) {
      res.status(400).json({ error: 'Max 10 skills allowed' });
      return;
    }
    if (needs.length > 5 || offerings.length > 5) {
      res.status(400).json({ error: 'Max 5 needs and 5 offerings allowed' });
      return;
    }

    const skillsRows = skills
      .filter((s: any) => s && typeof s.skill_id === 'string')
      .map((s: any) => ({
        user_id: userId,
        skill_id: s.skill_id,
        level: (['beginner', 'intermediate', 'advanced', 'expert'].includes(s.level) ? s.level : null) as SkillLevel | null,
        years: typeof s.years === 'number' ? clamp(s.years, 0, 60) : null,
        is_primary: !!s.is_primary,
      }));

    const rolesRows = roles
      .filter((r: any) => r && typeof r.role_id === 'string')
      .map((r: any) => ({
        user_id: userId,
        role_id: r.role_id,
        is_primary: !!r.is_primary,
      }));

    const industriesRows = industries
      .filter((i: any) => i && typeof i.industry_id === 'string')
      .map((i: any) => ({
        user_id: userId,
        industry_id: i.industry_id,
        is_primary: !!i.is_primary,
      }));

    // Upsert joins; then replace needs/offers
    if (skillsRows.length > 0) {
      const { error } = await supabase.from('user_skills').upsert(skillsRows, { onConflict: 'user_id,skill_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('user_skills').delete().eq('user_id', userId);
      if (error) throw error;
    }

    if (rolesRows.length > 0) {
      const { error } = await supabase.from('user_roles').upsert(rolesRows, { onConflict: 'user_id,role_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (error) throw error;
    }

    if (industriesRows.length > 0) {
      const { error } = await supabase.from('user_industries').upsert(industriesRows, { onConflict: 'user_id,industry_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('user_industries').delete().eq('user_id', userId);
      if (error) throw error;
    }

    const { error: delNeedsErr } = await supabase.from('user_needs').delete().eq('user_id', userId);
    if (delNeedsErr) throw delNeedsErr;
    const needsRows = needs
      .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t: string) => t.length >= 5 && t.length <= 140)
      .slice(0, 5)
      .map((need_text: string) => ({ user_id: userId, need_text }));
    if (needsRows.length > 0) {
      const { error } = await supabase.from('user_needs').insert(needsRows);
      if (error) throw error;
    }

    const { error: delOffErr } = await supabase.from('user_offerings').delete().eq('user_id', userId);
    if (delOffErr) throw delOffErr;
    const offeringsRows = offerings
      .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t: string) => t.length >= 5 && t.length <= 140)
      .slice(0, 5)
      .map((offering_text: string) => ({ user_id: userId, offering_text }));
    if (offeringsRows.length > 0) {
      const { error } = await supabase.from('user_offerings').insert(offeringsRows);
      if (error) throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error in saveMyExplicitProfileFacets:', error);
    res.status(500).json({ error: error.message || 'Failed to save profile facets' });
  }
};

const safeJsonParse = (text: string) => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
};

export const parseResumeToDraftFacets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // `multer` puts the file on req.file
    const file = (req as any).file as { buffer: Buffer; mimetype: string; originalname: string } | undefined;
    if (!file?.buffer) {
      res.status(400).json({ error: 'resume file is required' });
      return;
    }

    const mimetype = file.mimetype;
    let extractedText = '';

    if (mimetype === 'application/pdf') {
      // Lazy import to avoid loading cost if not used
      const imported: any = await import('pdf-parse');
      const pdfParse: any = imported?.default || imported;
      const parsed = await pdfParse(file.buffer);
      extractedText = parsed?.text || '';
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const mammoth = await import('mammoth');
      const result = await (mammoth as any).extractRawText({ buffer: file.buffer });
      extractedText = result?.value || '';
    } else {
      res.status(400).json({ error: 'Invalid file type. Upload PDF or DOCX.' });
      return;
    }

    extractedText = extractedText.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (extractedText.length < 200) {
      res.status(400).json({ error: 'Could not extract enough text from resume' });
      return;
    }

    const [skillsRes, rolesRes, industriesRes] = await Promise.all([
      supabase.from('skills').select('name').order('name', { ascending: true }),
      supabase.from('roles').select('name').order('name', { ascending: true }),
      supabase.from('industries').select('name').order('name', { ascending: true }),
    ]);
    if (skillsRes.error) throw skillsRes.error;
    if (rolesRes.error) throw rolesRes.error;
    if (industriesRes.error) throw industriesRes.error;

    const skills = (skillsRes.data || []).map((s: any) => s.name);
    const roles = (rolesRes.data || []).map((s: any) => s.name);
    const industries = (industriesRes.data || []).map((s: any) => s.name);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are an information extractor for a networking profile.\n\nTask: Extract ONLY the following fields from the resume text, and map them to the curated vocab lists.\n\nCurated vocab:\n- skills: ${JSON.stringify(skills)}\n- roles: ${JSON.stringify(roles)}\n- industries: ${JSON.stringify(industries)}\n\nRules:\n- Output ONLY valid JSON.\n- For skills/roles/industries: return values that EXACTLY match an item from the corresponding curated list.\n- If something is relevant but doesn't match curated list exactly, put it in the corresponding unmatched_* array.\n- needs/offers should be short, actionable lines (5-140 chars).\n- Keep max: skills 10, roles 3, industries 3, needs 5, offerings 5.\n\nReturn schema:\n{\n  \"skills\": [\"...\"],\n  \"roles\": [\"...\"],\n  \"industries\": [\"...\"],\n  \"needs\": [\"...\"],\n  \"offerings\": [\"...\"],\n  \"unmatched_skills\": [\"...\"],\n  \"unmatched_roles\": [\"...\"],\n  \"unmatched_industries\": [\"...\"]\n}\n\nResume text:\n${extractedText.slice(0, 20000)}\n`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = safeJsonParse(text);

    res.json({
      success: true,
      filename: file.originalname,
      mimetype,
      text_length: extractedText.length,
      draft: parsed,
    });
  } catch (error: any) {
    console.error('Error in parseResumeToDraftFacets:', error);
    res.status(500).json({ error: error.message || 'Failed to parse resume' });
  }
};


