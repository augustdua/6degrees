import React from 'react';
import { Users, MapPin, Calendar, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ConnectionStory {
  id: string;
  photo_url: string;
  story?: string;
  featured_connection_name?: string;
  featured_connection_photo?: string;
  location?: string;
  year?: number;
}

interface ConnectionStoryCardProps {
  story: ConnectionStory;
  isOwner?: boolean;
  onEdit?: (story: ConnectionStory) => void;
  onDelete?: (storyId: string) => void;
  onClick?: (story: ConnectionStory) => void;
}

/**
 * Vertical connection story card (like Hinge/dating apps)
 * Full-height photo with story text overlaid at bottom
 */
export const ConnectionStoryCard: React.FC<ConnectionStoryCardProps> = ({
  story,
  isOwner = false,
  onEdit,
  onDelete,
  onClick
}) => {
  return (
    <div 
      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer"
      onClick={() => onClick?.(story)}
    >
      {/* Background Photo */}
      <img 
        src={story.photo_url} 
        alt={story.featured_connection_name || 'Connection story'}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />

      {/* Owner Actions (top right) */}
      {isOwner && (
        <div className="absolute top-3 right-3 z-20" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
                <MoreVertical className="w-4 h-4 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#333]">
              <DropdownMenuItem 
                onClick={() => onEdit?.(story)}
                className="text-white hover:bg-[#333] cursor-pointer"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Story
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete?.(story.id)}
                className="text-red-400 hover:bg-[#333] cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Content Overlay (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        {/* Featured Connection Badge */}
        {story.featured_connection_name && (
          <div className="flex items-center gap-2 mb-3">
            {story.featured_connection_photo ? (
              <img 
                src={story.featured_connection_photo} 
                alt={story.featured_connection_name}
                className="w-8 h-8 rounded-full border-2 border-[#CBAA5A] object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#CBAA5A]/20 border border-[#CBAA5A]/50 flex items-center justify-center">
                <Users className="w-4 h-4 text-[#CBAA5A]" />
              </div>
            )}
            <span className="text-[11px] font-gilroy font-bold tracking-[0.1em] text-[#CBAA5A] uppercase">
              with {story.featured_connection_name}
            </span>
          </div>
        )}

        {/* Story Text */}
        {story.story && (
          <p className="text-white font-gilroy text-sm leading-relaxed mb-3 line-clamp-3">
            "{story.story}"
          </p>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-[10px] font-gilroy tracking-[0.1em] text-white/60 uppercase">
          {story.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {story.location}
            </span>
          )}
          {story.year && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {story.year}
            </span>
          )}
        </div>
      </div>

      {/* Subtle Border on Hover */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-[#CBAA5A]/50 transition-colors pointer-events-none" />
    </div>
  );
};

/**
 * Add Story Card - placeholder for adding new stories
 */
export const AddStoryCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-[#333] hover:border-[#CBAA5A]/50 bg-[#0a0a0a] flex flex-col items-center justify-center gap-3 transition-all group"
    >
      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#333] group-hover:border-[#CBAA5A]/50 flex items-center justify-center transition-colors">
        <span className="text-3xl text-[#666] group-hover:text-[#CBAA5A] transition-colors">+</span>
      </div>
      <div className="text-center">
        <p className="font-gilroy text-[11px] font-bold tracking-[0.15em] text-[#666] group-hover:text-[#CBAA5A] uppercase transition-colors">
          Add Story
        </p>
        <p className="font-gilroy text-[9px] tracking-[0.1em] text-[#555] uppercase mt-1">
          Photo with a connection
        </p>
      </div>
    </button>
  );
};

/**
 * Stories Grid Container
 */
export const ConnectionStoriesGrid: React.FC<{
  stories: ConnectionStory[];
  isOwner?: boolean;
  onAddClick?: () => void;
  onEdit?: (story: ConnectionStory) => void;
  onDelete?: (storyId: string) => void;
  onStoryClick?: (story: ConnectionStory) => void;
}> = ({ stories, isOwner = false, onAddClick, onEdit, onDelete, onStoryClick }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {stories.map(story => (
        <ConnectionStoryCard
          key={story.id}
          story={story}
          isOwner={isOwner}
          onEdit={onEdit}
          onDelete={onDelete}
          onClick={onStoryClick}
        />
      ))}
      {isOwner && stories.length < 6 && onAddClick && (
        <AddStoryCard onClick={onAddClick} />
      )}
    </div>
  );
};

export default ConnectionStoryCard;

