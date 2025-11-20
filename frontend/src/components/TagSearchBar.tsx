import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { useTags } from '@/hooks/useTags';

interface TagSearchBarProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}

export const TagSearchBar: React.FC<TagSearchBarProps> = ({
  selectedTags,
  onTagsChange,
  placeholder = 'Search by tags...'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { allTags } = useTags();
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter tags based on search query
  const filteredTags = allTags.filter(
    (tag) =>
      tag.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedTags.includes(tag)
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag]);
    }
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredTags.length > 0) {
      handleAddTag(filteredTags[0]);
    } else if (e.key === 'Backspace' && searchQuery === '' && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-3xl mx-auto mb-4 md:mb-6 px-4 sm:px-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-5 sm:py-6 text-sm sm:text-base"
        />
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="default"
              className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm flex items-center gap-1 sm:gap-2"
            >
              {tag}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveTag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Tag suggestions dropdown */}
      {showSuggestions && searchQuery && filteredTags.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredTags.slice(0, 10).map((tag) => (
            <div
              key={tag}
              className="px-4 py-2 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleAddTag(tag)}
            >
              {tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

