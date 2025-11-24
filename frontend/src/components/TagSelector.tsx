import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus, Sparkles } from 'lucide-react';
import { useTags } from '@/hooks/useTags';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  autoSuggestedTags?: string[];
  maxTags?: number;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  autoSuggestedTags = [],
  maxTags = 7
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { allTags, popularTags } = useTags();

  // Filter tags based on search
  const filteredTags = allTags.filter((tag) =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Suggested tags that aren't already selected
  const availableSuggestions = autoSuggestedTags.filter(
    (tag) => !selectedTags.includes(tag)
  );

  // Popular tags that aren't selected
  const availablePopularTags = popularTags
    .filter((tag) => !selectedTags.includes(tag.name))
    .slice(0, 10);

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else if (selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-3">
      <Label>Tags</Label>
      
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
        {selectedTags.length === 0 ? (
          <span className="text-sm text-muted-foreground">No tags selected</span>
        ) : (
          selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="default"
              className="px-3 py-1 text-sm flex items-center gap-2"
            >
              {tag}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveTag(tag)}
              />
            </Badge>
          ))
        )}
      </div>

      {/* AI Suggested tags (if available) */}
      {availableSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI Suggested</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleToggleTag(tag)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Browse all tags button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Browse All Tags
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Tags</DialogTitle>
            <DialogDescription>
              Choose up to {maxTags} tags to categorize your content.{' '}
              {selectedTags.length}/{maxTags} selected
            </DialogDescription>
          </DialogHeader>

          {/* Search input */}
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />

          <ScrollArea className="h-[400px] pr-4">
            {/* Popular tags section */}
            {!searchQuery && availablePopularTags.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3">Popular Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {availablePopularTags.map((tag) => (
                    <Badge
                      key={tag.name}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleToggleTag(tag.name)}
                    >
                      {tag.name} ({tag.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* All tags */}
            <div>
              <h4 className="text-sm font-semibold mb-3">
                {searchQuery ? 'Search Results' : 'All Tags'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {(searchQuery ? filteredTags : allTags).map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-primary hover:text-primary-foreground'
                      }`}
                      onClick={() => handleToggleTag(tag)}
                    >
                      {isSelected && <X className="h-3 w-3 mr-1" />}
                      {tag}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">
        Tags help people discover your content. You can select up to {maxTags} tags.
      </p>
    </div>
  );
};








