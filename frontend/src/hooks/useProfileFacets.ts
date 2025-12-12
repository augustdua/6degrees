import { useCallback, useState } from 'react';
import { apiGet, apiPut, apiUpload } from '@/lib/api';

export interface VocabItem {
  id: string;
  name: string;
}

export interface ExplicitSkill {
  skill: VocabItem;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  years?: number | null;
  is_primary?: boolean;
}

export interface ExplicitRole {
  role: VocabItem;
  is_primary?: boolean;
}

export interface ExplicitIndustry {
  industry: VocabItem;
  is_primary?: boolean;
}

export interface ExplicitFacetsResponse {
  skills: ExplicitSkill[];
  roles: ExplicitRole[];
  industries: ExplicitIndustry[];
  needs: Array<{ id: string; need_text: string }>;
  offerings: Array<{ id: string; offering_text: string }>;
}

export interface ProfileVocabResponse {
  skills: VocabItem[];
  roles: VocabItem[];
  industries: VocabItem[];
}

export interface SaveExplicitFacetsPayload {
  skills: Array<{ skill_id: string; level?: string | null; years?: number | null; is_primary?: boolean }>;
  roles: Array<{ role_id: string; is_primary?: boolean }>;
  industries: Array<{ industry_id: string; is_primary?: boolean }>;
  needs: string[];
  offerings: string[];
}

export interface ResumeDraft {
  skills: string[];
  roles: string[];
  industries: string[];
  needs: string[];
  offerings: string[];
  unmatched_skills?: string[];
  unmatched_roles?: string[];
  unmatched_industries?: string[];
}

export const useProfileFacets = () => {
  const [vocab, setVocab] = useState<ProfileVocabResponse | null>(null);
  const [facets, setFacets] = useState<ExplicitFacetsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchVocab = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/profile/vocab');
      setVocab(data);
      return data as ProfileVocabResponse;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyFacets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/profile/explicit');
      setFacets(data);
      return data as ExplicitFacetsResponse;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveMyFacets = useCallback(async (payload: SaveExplicitFacetsPayload) => {
    setSaving(true);
    try {
      const res = await apiPut('/api/profile/explicit', payload);
      // Refresh
      await fetchMyFacets();
      return res;
    } finally {
      setSaving(false);
    }
  }, [fetchMyFacets]);

  const parseResume = useCallback(async (file: File) => {
    const form = new FormData();
    form.append('resume', file);
    const res = await apiUpload('/api/profile/resume-parse', form);
    return res as { success: boolean; draft: ResumeDraft };
  }, []);

  return {
    vocab,
    facets,
    loading,
    saving,
    fetchVocab,
    fetchMyFacets,
    saveMyFacets,
    parseResume,
  };
};


