import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Lightbulb, Send, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface SuggestTopicFormProps {
  onSuccess?: () => void;
}

export const SuggestTopicForm = ({ onSuccess }: SuggestTopicFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [topicText, setTopicText] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Sign in required',
        description: 'Please sign in to suggest a topic.',
      });
      return;
    }

    if (!topicText.trim() || topicText.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Topic too short',
        description: 'Please provide a more detailed topic (at least 10 characters).',
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/api/forum/suggestions', {
        topic_text: topicText.trim(),
        description: description.trim() || null,
      });

      setSubmitted(true);
      setTopicText('');
      setDescription('');

      toast({
        title: 'Suggestion submitted!',
        description: 'Our team will review your research topic suggestion.',
      });

      onSuccess?.();

      // Reset after a delay
      setTimeout(() => {
        setSubmitted(false);
        setIsOpen(false);
      }, 2000);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to submit',
        description: err.message || 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gradient-to-r from-[#CBAA5A]/10 to-[#CBAA5A]/5 border border-[#CBAA5A]/20 rounded-xl p-4 flex items-center gap-3 hover:border-[#CBAA5A]/40 transition-all group"
      >
        <div className="w-10 h-10 rounded-lg bg-[#CBAA5A]/10 flex items-center justify-center group-hover:bg-[#CBAA5A]/20 transition-colors">
          <Lightbulb className="w-5 h-5 text-[#CBAA5A]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-gilroy font-medium text-sm">Suggest a Research Topic</p>
          <p className="text-[#888] text-xs">Help us decide what to research next</p>
        </div>
      </button>
    );
  }

  if (submitted) {
    return (
      <div className="w-full bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        </div>
        <div className="flex-1">
          <p className="text-green-400 font-gilroy font-medium text-sm">Suggestion Submitted!</p>
          <p className="text-green-400/70 text-xs">We'll review your topic soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#111] border border-[#222] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[#CBAA5A]" />
          <span className="text-white font-gilroy font-medium text-sm">Suggest a Research Topic</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[#666] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Input
        value={topicText}
        onChange={(e) => setTopicText(e.target.value)}
        placeholder="e.g., AI in Healthcare market analysis"
        className="bg-[#0a0a0a] border-[#222] text-white text-sm"
        maxLength={500}
      />

      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="(Optional) Any specific areas you'd like us to focus on?"
        className="bg-[#0a0a0a] border-[#222] text-white text-sm min-h-[80px] resize-none"
        maxLength={1000}
      />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#666]">
          {topicText.length}/500 characters
        </span>
        <Button
          onClick={handleSubmit}
          disabled={!topicText.trim() || topicText.trim().length < 10 || submitting}
          className="bg-[#CBAA5A] text-black hover:bg-[#CBAA5A]/80"
          size="sm"
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>
    </div>
  );
};

