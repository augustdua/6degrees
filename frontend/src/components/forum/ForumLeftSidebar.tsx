import { Plus } from 'lucide-react';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
}

interface ForumLeftSidebarProps {
  communities: Community[];
  activeCommunity: string;
  onCommunityChange: (slug: string) => void;
  onCreatePost: () => void;
}

export const ForumLeftSidebar = ({
  communities,
  activeCommunity,
  onCommunityChange,
  onCreatePost
}: ForumLeftSidebarProps) => {
  return (
    <div className="font-reddit w-64 flex-shrink-0">
      <div className="sticky top-4 space-y-2">
        {/* Communities Section */}
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Communities
            </h3>
          </div>
          
          <div className="py-1">
            {/* All Communities */}
            <button
              onClick={() => onCommunityChange('all')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                activeCommunity === 'all'
                  ? 'bg-[#CBAA5A]/10 text-[#CBAA5A] border-l-2 border-[#CBAA5A]'
                  : 'text-muted-foreground hover:bg-muted border-l-2 border-transparent'
              }`}
            >
              <span className="text-sm font-medium">All</span>
            </button>

            {/* Individual Communities */}
            {communities.map((community) => (
              <button
                key={community.id}
                onClick={() => onCommunityChange(community.slug)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  activeCommunity === community.slug
                    ? 'bg-[#CBAA5A]/10 text-[#CBAA5A] border-l-2 border-[#CBAA5A]'
                    : 'text-muted-foreground hover:bg-muted border-l-2 border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate">{community.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Create Post Button */}
        <button
          onClick={onCreatePost}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#CBAA5A] hover:bg-[#D4B76A] text-black font-bold text-sm rounded-full transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Post
        </button>
      </div>
    </div>
  );
};

