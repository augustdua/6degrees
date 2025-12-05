import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, Plus, Sparkles, RefreshCw } from 'lucide-react';

interface Community {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
  url: string;
}

interface CreateForumPostModalProps {
  open: boolean;
  onClose: () => void;
  communities: Community[];
  onPostCreated: (post: any) => void;
  defaultCommunity?: string;
}

export const CreateForumPostModal = ({
  open,
  onClose,
  communities,
  onPostCreated,
  defaultCommunity
}: CreateForumPostModalProps) => {
  const [selectedCommunity, setSelectedCommunity] = useState(defaultCommunity || '');
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Poll state
  const [poll, setPoll] = useState<{ question: string; options: string[] } | null>(null);
  const [generatingPoll, setGeneratingPoll] = useState(false);

  // Build in Public specific
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [dayNumber, setDayNumber] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectUrl, setNewProjectUrl] = useState('');

  const isBuildInPublic = selectedCommunity === 'build-in-public';

  // Fetch user's projects
  useEffect(() => {
    if (isBuildInPublic) {
      apiGet('/api/forum/projects/mine')
        .then(data => setProjects(data.projects || []))
        .catch(err => console.error('Error fetching projects:', err));
    }
  }, [isBuildInPublic]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCommunity(defaultCommunity || '');
      setContent('');
      setMediaUrls([]);
      setMediaInput('');
      setError('');
      setPoll(null);
      setSelectedProject('');
      setDayNumber('');
      setMilestoneTitle('');
      setShowNewProject(false);
      setNewProjectName('');
      setNewProjectUrl('');
    }
  }, [open, defaultCommunity]);

  const handleAddMedia = () => {
    if (mediaInput.trim() && mediaUrls.length < 4) {
      setMediaUrls([...mediaUrls, mediaInput.trim()]);
      setMediaInput('');
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const data = await apiPost('/api/forum/projects', {
        name: newProjectName.trim(),
        url: newProjectUrl.trim() || null
      });
      setProjects([data.project, ...projects]);
      setSelectedProject(data.project.id);
      setShowNewProject(false);
      setNewProjectName('');
      setNewProjectUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  };

  const handleGeneratePoll = async () => {
    if (content.trim().length < 10) {
      setError('Please write at least 10 characters before generating a poll');
      return;
    }

    setGeneratingPoll(true);
    setError('');

    try {
      const data = await apiPost('/api/forum/polls/generate', {
        content: content.trim(),
        community_slug: selectedCommunity
      });
      setPoll(data.poll);
    } catch (err: any) {
      setError(err.message || 'Failed to generate poll');
    } finally {
      setGeneratingPoll(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCommunity || !content.trim()) {
      setError('Please select a community and enter content');
      return;
    }

    if (!poll) {
      setError('Please generate a poll before posting');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload: any = {
        community_slug: selectedCommunity,
        content: content.trim(),
        media_urls: mediaUrls,
        poll: poll
      };

      if (isBuildInPublic) {
        if (selectedProject) {
          payload.project_id = selectedProject;
        }
        if (dayNumber) {
          payload.day_number = parseInt(dayNumber);
          payload.post_type = 'bip_day';
        }
        if (milestoneTitle) {
          payload.milestone_title = milestoneTitle;
        }
      }

      const data = await apiPost('/api/forum/posts', payload);
      onPostCreated(data.post);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCommunityData = communities.find(c => c.slug === selectedCommunity);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111] border-[#333] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-reddit text-xl">Create Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Community Selector */}
          <div className="space-y-2">
            <Label>Community</Label>
            <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
              <SelectTrigger className="bg-[#0a0a0a] border-[#333]">
                <SelectValue placeholder="Select a community" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#333]">
                {communities.map((community) => (
                  <SelectItem key={community.id} value={community.slug}>
                    <div className="flex items-center gap-2">
                      <span>{community.icon}</span>
                      <span>{community.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Build in Public specific fields */}
          {isBuildInPublic && (
            <>
              {/* Project Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Project (optional)</Label>
                  <button
                    type="button"
                    onClick={() => setShowNewProject(!showNewProject)}
                    className="text-xs text-[#CBAA5A] hover:underline"
                  >
                    {showNewProject ? 'Cancel' : '+ New Project'}
                  </button>
                </div>

                {showNewProject ? (
                  <div className="space-y-2 p-3 bg-[#0a0a0a] rounded-lg border border-[#333]">
                    <Input
                      placeholder="Project name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="bg-[#111] border-[#333]"
                    />
                    <Input
                      placeholder="Project URL (optional)"
                      value={newProjectUrl}
                      onChange={(e) => setNewProjectUrl(e.target.value)}
                      className="bg-[#111] border-[#333]"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateProject}
                      size="sm"
                      className="w-full bg-[#CBAA5A] text-black"
                    >
                      Create Project
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="bg-[#0a0a0a] border-[#333]">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#333]">
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Day Number */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Day Number</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 42"
                    value={dayNumber}
                    onChange={(e) => setDayNumber(e.target.value)}
                    className="bg-[#0a0a0a] border-[#333]"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Milestone (optional)</Label>
                  <Input
                    placeholder="e.g. First $1k MRR"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    className="bg-[#0a0a0a] border-[#333]"
                  />
                </div>
              </div>
            </>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              placeholder={
                isBuildInPublic
                  ? "What did you build today? Share your progress..."
                  : selectedCommunity === 'wins'
                  ? "What's your win? Share the good news!"
                  : selectedCommunity === 'failures'
                  ? "What went wrong? Share your learnings..."
                  : selectedCommunity === 'network'
                  ? "Who are you looking to connect with?"
                  : "What's on your mind?"
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-[#0a0a0a] border-[#333] min-h-[120px]"
            />
          </div>

          {/* Generate Poll Button */}
          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleGeneratePoll}
              disabled={generatingPoll || content.trim().length < 10}
              variant="outline"
              className="w-full border-[#333] hover:border-[#CBAA5A] hover:bg-[#CBAA5A]/10 transition-all"
            >
              {generatingPoll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Poll...
                </>
              ) : poll ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Poll
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Poll with AI
                </>
              )}
            </Button>

            {/* Poll Preview */}
            {poll && (
              <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#333] space-y-3">
                <p className="text-white font-medium text-sm">{poll.question}</p>
                <div className="space-y-2">
                  {poll.options.map((option, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 bg-[#1a1a1a] rounded-lg text-sm text-[#888] border border-[#222]"
                    >
                      {option}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#555]">Preview - users will vote on this poll</p>
              </div>
            )}
          </div>

          {/* Media URLs */}
          <div className="space-y-2">
            <Label>Images (up to 4)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste image URL"
                value={mediaInput}
                onChange={(e) => setMediaInput(e.target.value)}
                className="bg-[#0a0a0a] border-[#333]"
                disabled={mediaUrls.length >= 4}
              />
              <Button
                type="button"
                onClick={handleAddMedia}
                disabled={!mediaInput.trim() || mediaUrls.length >= 4}
                variant="outline"
                className="border-[#333]"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={url}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg border border-[#333]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedCommunity || !content.trim() || !poll || submitting}
            className="w-full bg-[#CBAA5A] hover:bg-[#D4B76A] text-black font-reddit font-bold"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {selectedCommunityData?.icon} Post
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

