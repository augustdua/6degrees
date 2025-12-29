import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiGet, apiPost, API_ENDPOINTS } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PersonalityQuestion {
  id: string;
  type: 'likert' | 'binary';
  text: string;
  optionA?: string;
  optionB?: string;
  category?: string;
}

type Prompt =
  | { kind: 'personality'; question: PersonalityQuestion; totalAnswered?: number }
  | { kind: 'opinion_swipe'; card: { id: string; statement: string } };

interface PersonalityQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  prefetched?: { assignmentId?: string | null; prompt: Prompt } | null;
}

const LIKERT_OPTIONS = [
  { value: 'strongly_disagree', label: 'SD', fullLabel: 'Strongly Disagree' },
  { value: 'disagree', label: 'D', fullLabel: 'Disagree' },
  { value: 'neutral', label: 'N', fullLabel: 'Neutral' },
  { value: 'agree', label: 'A', fullLabel: 'Agree' },
  { value: 'strongly_agree', label: 'SA', fullLabel: 'Strongly Agree' },
];

export function PersonalityQuestionModal({ isOpen, onClose, onComplete, prefetched }: PersonalityQuestionModalProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [question, setQuestion] = useState<PersonalityQuestion | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [totalAnswered, setTotalAnswered] = useState(0);

  // Fetch next question when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closing
      setSelectedResponse(null);
      setQuestion(null);
      setTotalAnswered(0);
      setAssignmentId(null);
      return;
    }

    // If caller prefetched (so we don't flash open/close), use it and skip fetch.
    if (prefetched?.prompt) {
      setAssignmentId(prefetched.assignmentId || null);
      if (prefetched.prompt.kind === 'personality') {
        setQuestion(prefetched.prompt.question);
        setTotalAnswered(prefetched.prompt.totalAnswered || 0);
      }
      setLoading(false);
      return;
    }

    const fetchQuestion = async () => {
      setLoading(true);
      try {
        const data = await apiGet(API_ENDPOINTS.PROMPTS_NEXT, { skipCache: true });
        const fetchedAssignmentId: string | null = data?.assignmentId ? String(data.assignmentId) : null;
        setAssignmentId(fetchedAssignmentId);
        const prompt: Prompt | null = data?.prompt || null;

        if (prompt?.kind === 'personality' && prompt.question) {
          setQuestion(prompt.question);
          setTotalAnswered(prompt.totalAnswered || 0);
          return;
        }

        // Nothing to show right now
        setQuestion(null);
        onClose();
      } catch (err) {
        console.error('Failed to fetch personality question:', err);
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [isOpen, onClose, prefetched]);

  const handleSubmitPersonality = useCallback(async (response: string) => {
    if (!question || submitting) return;

    setSelectedResponse(response);
    setSubmitting(true);

    try {
      await apiPost(API_ENDPOINTS.PROMPTS_SUBMIT, {
        kind: 'personality',
        assignmentId,
        questionId: question.id,
        response
      });

      await new Promise(resolve => setTimeout(resolve, 400));

      toast({
        title: 'Response saved',
        description: 'Thanks for sharing your perspective.'
      });

      onComplete?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit personality response:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to save',
        description: err?.message || 'Please try again.'
      });
      setSelectedResponse(null);
    } finally {
      setSubmitting(false);
    }
  }, [question, submitting, toast, onComplete, onClose, assignmentId]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-black border border-[#222] p-0 overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Required for Radix accessibility (can be visually hidden) */}
        <DialogTitle className="sr-only">Prompt</DialogTitle>
        <DialogDescription className="sr-only">
          Answer this prompt to continue.
        </DialogDescription>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#CBAA5A] border-t-transparent" />
          </div>
        ) : question ? (
          <div className="px-6 py-8">
            {/* Question Number */}
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#555]">
                Opinion #{totalAnswered + 1}
              </span>
            </div>

            {/* Question Text */}
            <div className="text-center mb-8">
              <p className="text-white text-lg leading-relaxed font-medium">
                {question.text}
              </p>
            </div>

            {/* Options */}
            {question.type === 'likert' ? (
              <LikertOptions 
                selected={selectedResponse} 
                onSelect={handleSubmitPersonality}
                disabled={submitting}
              />
            ) : (
              <BinaryOptions
                optionA={question.optionA || 'Option A'}
                optionB={question.optionB || 'Option B'}
                selected={selectedResponse}
                onSelect={handleSubmitPersonality}
                disabled={submitting}
              />
            )}

            {/* Submitting indicator */}
            {submitting && (
              <div className="text-center mt-6">
                <div className="inline-flex items-center gap-2 text-[#555] text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#CBAA5A] border-t-transparent" />
                  Saving...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-[#666]">No more questions available.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Likert Scale Options Component
function LikertOptions({ 
  selected, 
  onSelect, 
  disabled 
}: { 
  selected: string | null; 
  onSelect: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Labels Row */}
      <div className="flex justify-between px-2">
        <span className="text-[10px] text-[#555] tracking-wide">Strongly Disagree</span>
        <span className="text-[10px] text-[#555] tracking-wide">Strongly Agree</span>
      </div>
      
      {/* Options Row */}
      <div className="flex items-center justify-center gap-2">
        {LIKERT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => !disabled && onSelect(option.value)}
            disabled={disabled}
            className={cn(
              "w-12 h-12 rounded-full border-2 transition-all duration-200 font-bold text-sm",
              "focus:outline-none focus:ring-2 focus:ring-[#CBAA5A]/50",
              selected === option.value
                ? "bg-white text-black border-white scale-110"
                : "bg-transparent text-[#666] border-[#333] hover:border-[#555] hover:text-white",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            title={option.fullLabel}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Binary Choice Options Component
function BinaryOptions({ 
  optionA, 
  optionB, 
  selected, 
  onSelect,
  disabled
}: { 
  optionA: string; 
  optionB: string; 
  selected: string | null; 
  onSelect: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <Button
        onClick={() => !disabled && onSelect('a')}
        disabled={disabled}
        variant="outline"
        className={cn(
          "w-full py-6 px-4 h-auto text-left justify-start whitespace-normal",
          "border-2 transition-all duration-200",
          selected === 'a'
            ? "bg-white text-black border-white"
            : "bg-transparent text-white border-[#333] hover:border-[#555]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm",
            selected === 'a' ? "border-black text-black" : "border-[#555] text-[#555]"
          )}>
            A
          </span>
          <span className="text-sm leading-relaxed">{optionA}</span>
        </div>
      </Button>

      <Button
        onClick={() => !disabled && onSelect('b')}
        disabled={disabled}
        variant="outline"
        className={cn(
          "w-full py-6 px-4 h-auto text-left justify-start whitespace-normal",
          "border-2 transition-all duration-200",
          selected === 'b'
            ? "bg-white text-black border-white"
            : "bg-transparent text-white border-[#333] hover:border-[#555]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm",
            selected === 'b' ? "border-black text-black" : "border-[#555] text-[#555]"
          )}>
            B
          </span>
          <span className="text-sm leading-relaxed">{optionB}</span>
        </div>
      </Button>
    </div>
  );
}

export default PersonalityQuestionModal;

