import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check, Sparkles, Zap, Trophy, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
  isValid: boolean;
  isOptional?: boolean;
}

interface GamifiedFormCarouselProps {
  steps: FormStep[];
  onComplete: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const motivationalMessages = [
  { icon: Sparkles, text: "You're doing great!", color: "text-yellow-500" },
  { icon: Zap, text: "Keep the momentum going!", color: "text-blue-500" },
  { icon: Trophy, text: "Almost there, champion!", color: "text-purple-500" },
  { icon: Target, text: "On target! Keep going!", color: "text-green-500" },
];

const GamifiedFormCarousel: React.FC<GamifiedFormCarouselProps> = ({
  steps,
  onComplete,
  onCancel,
  isSubmitting = false,
  submitButtonText = 'Complete'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showMotivation, setShowMotivation] = useState(false);
  const [motivationIndex, setMotivationIndex] = useState(0);

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const canGoNext = currentStepData.isValid || currentStepData.isOptional;
  const canGoPrevious = currentStep > 0;

  // Show motivational message when progressing
  useEffect(() => {
    if (currentStep > 0 && currentStep % 2 === 0) {
      setMotivationIndex(Math.floor(Math.random() * motivationalMessages.length));
      setShowMotivation(true);
      const timer = setTimeout(() => setShowMotivation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Mark step as completed when moving forward
  useEffect(() => {
    if (canGoNext && currentStep > 0) {
      setCompletedSteps(prev => new Set([...prev, currentStep - 1]));
    }
  }, [currentStep, canGoNext]);

  const handleNext = () => {
    if (canGoNext && !isLastStep) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    } else if (isLastStep && canGoNext) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentStep(prev => Math.max(prev - 1, 0));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canGoNext && !isSubmitting) {
      e.preventDefault();
      handleNext();
    }
  };

  const MotivationMessage = motivationalMessages[motivationIndex];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step indicators */}
        <div className="flex justify-between mt-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                index <= currentStep ? "opacity-100" : "opacity-30"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  completedSteps.has(index)
                    ? "bg-[#CBAA5A] text-black scale-110"
                    : index === currentStep
                    ? "bg-primary text-primary-foreground scale-110 animate-pulse"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {completedSteps.has(index) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motivational Message */}
      {showMotivation && (
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
            <div className="flex items-center gap-3">
              <MotivationMessage.icon className={cn("w-6 h-6", MotivationMessage.color)} />
              <p className="font-semibold text-lg">{MotivationMessage.text}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Current Step Card */}
      <Card 
        className="p-8 shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-right-4"
        onKeyPress={handleKeyPress}
      >
        {/* Step Header */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
            {currentStepData.title}
            {currentStepData.isOptional && (
              <span className="text-sm font-normal text-muted-foreground">
                (Optional)
              </span>
            )}
          </h2>
          {currentStepData.description && (
            <p className="text-muted-foreground">{currentStepData.description}</p>
          )}
        </div>

        {/* Step Content */}
        <div className="mb-8 min-h-[200px] flex flex-col justify-center">
          {currentStepData.component}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={canGoPrevious ? handlePrevious : onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {canGoPrevious ? 'Previous' : 'Cancel'}
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext || isSubmitting}
            className={cn(
              "flex-1 transition-all",
              isLastStep && canGoNext && "bg-[#CBAA5A] hover:bg-[#B28A28] animate-pulse text-black"
            )}
          >
            {isSubmitting ? (
              'Submitting...'
            ) : isLastStep ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {submitButtonText}
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Skip button for optional steps */}
        {currentStepData.isOptional && !currentStepData.isValid && !isLastStep && (
          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleNext}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Skip this step
            </Button>
          </div>
        )}
      </Card>

      {/* Completion Indicator */}
      {completedSteps.size > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            🎉 {completedSteps.size} of {steps.length} steps completed!
          </p>
        </div>
      )}
    </div>
  );
};

export default GamifiedFormCarousel;
















