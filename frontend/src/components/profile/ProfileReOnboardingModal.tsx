import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Wand2, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import type { ProfileVocabResponse, ResumeDraft, SaveExplicitFacetsPayload, VocabItem } from '@/hooks/useProfileFacets';

type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

function findByName(vocab: VocabItem[], name: string) {
  const n = name.trim().toLowerCase();
  return vocab.find((v) => v.name.trim().toLowerCase() === n) || null;
}

export const ProfileReOnboardingModal = ({
  open,
  onClose,
  vocab,
  initial,
  onParseResume,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  vocab: ProfileVocabResponse;
  initial?: SaveExplicitFacetsPayload;
  onParseResume: (file: File) => Promise<{ success: boolean; draft: ResumeDraft }>;
  onSave: (payload: SaveExplicitFacetsPayload) => Promise<any>;
  saving: boolean;
}) => {
  const [step, setStep] = React.useState(0);
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [unmatched, setUnmatched] = React.useState<{ skills: string[]; roles: string[]; industries: string[] }>({
    skills: [],
    roles: [],
    industries: [],
  });

  const [skills, setSkills] = React.useState<
    Array<{ skill_id: string; level?: SkillLevel | null; years?: number | null; is_primary?: boolean }>
  >(initial?.skills || []);
  const [roles, setRoles] = React.useState<Array<{ role_id: string; is_primary?: boolean }>>(initial?.roles || []);
  const [industries, setIndustries] = React.useState<Array<{ industry_id: string; is_primary?: boolean }>>(
    initial?.industries || []
  );
  const [needsText, setNeedsText] = React.useState((initial?.needs || []).join('\n'));
  const [offeringsText, setOfferingsText] = React.useState((initial?.offerings || []).join('\n'));

  React.useEffect(() => {
    if (open) {
      setStep(0);
      setUnmatched({ skills: [], roles: [], industries: [] });
      setSkills(initial?.skills || []);
      setRoles(initial?.roles || []);
      setIndustries(initial?.industries || []);
      setNeedsText((initial?.needs || []).join('\n'));
      setOfferingsText((initial?.offerings || []).join('\n'));
    }
  }, [open, initial]);

  const parseAndPrefill = async () => {
    if (!resumeFile) return;
    setParsing(true);
    try {
      const res = await onParseResume(resumeFile);
      const draft = res.draft;

      const matchedSkills = (draft.skills || [])
        .map((n) => findByName(vocab.skills, n))
        .filter(Boolean)
        .slice(0, 10)
        .map((s, idx) => ({ skill_id: (s as VocabItem).id, is_primary: idx === 0 }));

      const matchedRoles = (draft.roles || [])
        .map((n) => findByName(vocab.roles, n))
        .filter(Boolean)
        .slice(0, 3)
        .map((r, idx) => ({ role_id: (r as VocabItem).id, is_primary: idx === 0 }));

      const matchedIndustries = (draft.industries || [])
        .map((n) => findByName(vocab.industries, n))
        .filter(Boolean)
        .slice(0, 3)
        .map((i, idx) => ({ industry_id: (i as VocabItem).id, is_primary: idx === 0 }));

      setSkills(matchedSkills);
      setRoles(matchedRoles);
      setIndustries(matchedIndustries);
      setNeedsText((draft.needs || []).slice(0, 5).join('\n'));
      setOfferingsText((draft.offerings || []).slice(0, 5).join('\n'));
      setUnmatched({
        skills: (draft.unmatched_skills || []).slice(0, 10),
        roles: (draft.unmatched_roles || []).slice(0, 5),
        industries: (draft.unmatched_industries || []).slice(0, 5),
      });

      setStep(1);
    } finally {
      setParsing(false);
    }
  };

  const toggleSkill = (id: string) => {
    setSkills((prev) => {
      const exists = prev.some((s) => s.skill_id === id);
      if (exists) return prev.filter((s) => s.skill_id !== id).map((s) => ({ ...s, is_primary: s.is_primary && s.skill_id !== id }));
      if (prev.length >= 10) return prev;
      return [...prev, { skill_id: id, is_primary: prev.length === 0 }];
    });
  };

  const setPrimarySkill = (id: string) => setSkills((prev) => prev.map((s) => ({ ...s, is_primary: s.skill_id === id })));

  const setPrimaryRole = (id: string) => setRoles([{ role_id: id, is_primary: true }]);
  const setPrimaryIndustry = (id: string) => setIndustries([{ industry_id: id, is_primary: true }]);

  const payload: SaveExplicitFacetsPayload = {
    skills,
    roles,
    industries,
    needs: needsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5),
    offerings: offeringsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5),
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-4 border-b border-[#222] bg-black">
          <DialogTitle className="font-gilroy tracking-[0.15em] uppercase text-sm text-white">
            Complete Your Profile
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4 bg-black">
          {/* Step indicator */}
          <div className="flex gap-2">
            {['Upload CV', 'Skills', 'Role+Industry', 'Needs+Offerings'].map((label, i) => (
              <div key={label} className={`flex-1 h-1 rounded ${i <= step ? 'bg-[#CBAA5A]' : 'bg-[#222]'}`} />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-gilroy text-sm font-bold">Upload your CV (PDF/DOCX)</p>
                    <p className="text-[#888] text-xs font-gilroy">
                      We extract text, parse with AI, and prefill your profile. We do not store the file.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[#333] text-[#ddd] hover:border-[#CBAA5A] cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span className="text-[10px] font-gilroy tracking-[0.15em] uppercase">Choose File</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                {resumeFile && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-[#aaa] font-gilroy">{resumeFile.name}</span>
                    <Button
                      disabled={parsing}
                      onClick={parseAndPrefill}
                      className="bg-white text-black hover:bg-[#CBAA5A] font-gilroy font-bold text-xs"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      {parsing ? 'PARSING...' : 'PARSE & PREFILL'}
                    </Button>
                  </div>
                )}
              </div>

              {(unmatched.skills.length > 0 || unmatched.roles.length > 0 || unmatched.industries.length > 0) && (
                <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
                  <p className="text-white font-gilroy text-sm font-bold mb-2">Unmatched items (review manually)</p>
                  <div className="flex flex-wrap gap-2">
                    {[...unmatched.skills, ...unmatched.roles, ...unmatched.industries].slice(0, 12).map((t) => (
                      <Badge key={t} variant="outline" className="border-[#333] text-[#bbb]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
                <p className="text-white font-gilroy text-sm font-bold mb-2">Select your skills (max 10)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
                  {vocab.skills.map((s) => {
                    const selected = skills.some((x) => x.skill_id === s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSkill(s.id)}
                        className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                          selected ? 'border-[#CBAA5A] bg-[#CBAA5A]/10 text-white' : 'border-[#222] bg-black text-[#aaa]'
                        }`}
                      >
                        <span className="text-xs font-gilroy">{s.name}</span>
                      </button>
                    );
                  })}
                </div>

                {skills.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] text-[#888] font-gilroy tracking-[0.15em] uppercase">Selected</p>
                    {skills.map((s) => {
                      const skill = vocab.skills.find((x) => x.id === s.skill_id);
                      if (!skill) return null;
                      return (
                        <div key={s.skill_id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPrimarySkill(s.skill_id)}
                            className={`px-2 py-1 rounded-full text-[10px] font-gilroy tracking-[0.15em] uppercase border ${
                              s.is_primary ? 'border-[#CBAA5A] text-[#CBAA5A]' : 'border-[#333] text-[#888]'
                            }`}
                          >
                            {s.is_primary ? 'PRIMARY' : 'SET PRIMARY'}
                          </button>
                          <span className="text-sm text-white font-gilroy flex-1">{skill.name}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              value={s.years ?? ''}
                              onChange={(e) => {
                                const years = e.target.value === '' ? null : Number(e.target.value);
                                setSkills((prev) => prev.map((x) => (x.skill_id === s.skill_id ? { ...x, years } : x)));
                              }}
                              placeholder="yrs"
                              className="w-16 h-8 bg-black border-[#333] text-white text-xs"
                            />
                            <Input
                              value={s.level ?? ''}
                              onChange={(e) => {
                                const level = (e.target.value as SkillLevel) || null;
                                setSkills((prev) => prev.map((x) => (x.skill_id === s.skill_id ? { ...x, level } : x)));
                              }}
                              placeholder="level"
                              className="w-28 h-8 bg-black border-[#333] text-white text-xs"
                            />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-[#555] font-gilroy">
                      Tip: set one skill as primary. For level, use: beginner/intermediate/advanced/expert.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4 space-y-3">
                <div>
                  <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Primary Role</Label>
                  <select
                    value={roles[0]?.role_id || ''}
                    onChange={(e) => setPrimaryRole(e.target.value)}
                    className="mt-1 w-full bg-black border border-[#333] text-white rounded-md h-9 px-3 text-sm"
                  >
                    <option value="">Select</option>
                    {vocab.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Primary Industry</Label>
                  <select
                    value={industries[0]?.industry_id || ''}
                    onChange={(e) => setPrimaryIndustry(e.target.value)}
                    className="mt-1 w-full bg-black border border-[#333] text-white rounded-md h-9 px-3 text-sm"
                  >
                    <option value="">Select</option>
                    {vocab.industries.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4 space-y-3">
                <div>
                  <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Needs (1 per line)</Label>
                  <Textarea
                    value={needsText}
                    onChange={(e) => setNeedsText(e.target.value)}
                    className="mt-1 bg-black border-[#333] text-white font-gilroy text-sm min-h-[90px]"
                    placeholder="e.g., Intros to fintech VCs in India\nHelp with enterprise sales GTM\nHiring a senior engineer"
                  />
                </div>
                <div>
                  <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Offerings (1 per line)</Label>
                  <Textarea
                    value={offeringsText}
                    onChange={(e) => setOfferingsText(e.target.value)}
                    className="mt-1 bg-black border-[#333] text-white font-gilroy text-sm min-h-[90px]"
                    placeholder="e.g., Can intro to growth leaders\nCan review pitch decks\nCan help with product strategy"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              className="border-[#333] text-[#ddd] hover:bg-[#111]"
              onClick={() => (step === 0 ? onClose() : setStep((s) => Math.max(0, s - 1)))}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {step < 3 ? (
              <Button className="bg-white text-black hover:bg-[#CBAA5A]" onClick={() => setStep((s) => Math.min(3, s + 1))}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                disabled={saving}
                className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy font-bold"
                onClick={async () => {
                  await onSave(payload);
                  onClose();
                }}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'SAVING...' : 'SAVE'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


