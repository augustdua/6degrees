import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { useProfileFacets } from '@/hooks/useProfileFacets';
import { ProfileReOnboardingModal } from './ProfileReOnboardingModal';

export const ProfileFacetsCard = () => {
  const { vocab, facets, loading, saving, fetchVocab, fetchMyFacets, saveMyFacets, parseResume } = useProfileFacets();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    // Load on mount
    void (async () => {
      await fetchVocab();
      await fetchMyFacets();
    })();
  }, [fetchVocab, fetchMyFacets]);

  const hasBasics =
    (facets?.skills?.length || 0) >= 3 && (facets?.needs?.length || 0) > 0 && (facets?.offerings?.length || 0) > 0;

  if (!vocab) return null;

  const initialPayload = {
    skills:
      facets?.skills?.map((s) => ({
        skill_id: s.skill.id,
        level: s.level ?? null,
        years: s.years ?? null,
        is_primary: !!s.is_primary,
      })) || [],
    roles:
      facets?.roles?.map((r) => ({
        role_id: r.role.id,
        is_primary: !!r.is_primary,
      })) || [],
    industries:
      facets?.industries?.map((i) => ({
        industry_id: i.industry.id,
        is_primary: !!i.is_primary,
      })) || [],
    needs: facets?.needs?.map((n) => n.need_text) || [],
    offerings: facets?.offerings?.map((o) => o.offering_text) || [],
  };

  return (
    <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">Profile Strength</p>
          <h3 className="text-white font-gilroy font-bold text-sm mt-1">Skills, Needs, and Offerings</h3>
          <p className="text-[#666] text-xs font-gilroy mt-1">
            Add your expertise + what you want/can offer so we can match you faster.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-white text-black hover:bg-[#CBAA5A] font-gilroy font-bold text-xs"
          disabled={loading}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {hasBasics ? 'EDIT' : 'COMPLETE'}
        </Button>
      </div>

      {/* Summary chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {(facets?.skills || []).slice(0, 6).map((s) => (
          <Badge key={s.skill.id} variant="outline" className="border-[#333] text-[#bbb]">
            {s.skill.name}
          </Badge>
        ))}
        {(facets?.skills?.length || 0) > 6 && (
          <Badge variant="outline" className="border-[#333] text-[#bbb]">
            +{(facets?.skills?.length || 0) - 6}
          </Badge>
        )}
      </div>

      {/* Needs/offers summary */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#222] bg-black p-3">
          <p className="text-[10px] text-[#666] font-gilroy tracking-[0.15em] uppercase">Needs</p>
          <p className="text-sm text-white font-gilroy mt-1 line-clamp-2">
            {facets?.needs?.[0]?.need_text || 'Add what you’re looking for'}
          </p>
        </div>
        <div className="rounded-xl border border-[#222] bg-black p-3">
          <p className="text-[10px] text-[#666] font-gilroy tracking-[0.15em] uppercase">Offerings</p>
          <p className="text-sm text-white font-gilroy mt-1 line-clamp-2">
            {facets?.offerings?.[0]?.offering_text || 'Add what you can help with'}
          </p>
        </div>
      </div>

      <ProfileReOnboardingModal
        open={open}
        onClose={() => setOpen(false)}
        vocab={vocab}
        initial={initialPayload}
        onParseResume={parseResume}
        onSave={saveMyFacets}
        saving={saving}
      />
    </div>
  );
};


