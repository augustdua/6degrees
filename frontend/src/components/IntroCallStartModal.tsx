import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { apiPost } from '@/lib/api';
import { Video, Plus, X } from 'lucide-react';

interface Intro {
  id: string;
  offer: {
    title: string;
    description: string;
  };
  target: {
    first_name: string;
    last_name: string;
  };
}

interface IntroCallStartModalProps {
  open: boolean;
  onClose: () => void;
  intro: Intro;
  onCallStarted: () => void;
}

export const IntroCallStartModal: React.FC<IntroCallStartModalProps> = ({
  open,
  onClose,
  intro,
  onCallStarted,
}) => {
  const [context, setContext] = useState('');
  const [questions, setQuestions] = useState<string[]>(['']);
  const [starting, setStarting] = useState(false);

  const handleAddQuestion = () => {
    if (questions.length < 5) {
      setQuestions([...questions, '']);
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const handleStartCall = async () => {
    setStarting(true);
    try {
      // Filter out empty questions
      const validQuestions = questions.filter(q => q.trim() !== '');

      const response = await apiPost<{ room_url: string }>(`/api/intros/${intro.id}/start`, {
        context: context.trim() || undefined,
        questions: validQuestions.length > 0 ? validQuestions : undefined
      });

      // Open the Daily room in a new window
      if (response.room_url) {
        window.open(response.room_url, '_blank');
      }

      onCallStarted();
      onClose();
    } catch (error: any) {
      console.error('Error starting call:', error);
      alert(error.message || 'Failed to start call');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Start Intro Call
          </DialogTitle>
          <DialogDescription>
            Provide context and questions for {intro.target.first_name} {intro.target.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Offer Info */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-1">{intro.offer.title}</h4>
            <p className="text-sm text-muted-foreground">{intro.offer.description}</p>
          </div>

          {/* Context Field */}
          <div className="space-y-2">
            <Label htmlFor="context">
              Context for {intro.target.first_name}
              <span className="text-muted-foreground text-sm ml-2">(Optional)</span>
            </Label>
            <Textarea
              id="context"
              placeholder="Provide any background or context that would help the target understand your goals for this call..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This will be shared with {intro.target.first_name} and the AI co-pilot
            </p>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Questions for {intro.target.first_name}
                <span className="text-muted-foreground text-sm ml-2">(Optional)</span>
              </Label>
              {questions.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddQuestion}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              )}
            </div>

            {questions.map((question, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Question ${index + 1}...`}
                  value={question}
                  onChange={(e) => handleQuestionChange(index, e.target.value)}
                />
                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveQuestion(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              The AI co-pilot will help facilitate these questions during the call
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={starting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartCall}
              className="flex-1"
              disabled={starting}
            >
              {starting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Starting Call...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Start Call & Join
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

