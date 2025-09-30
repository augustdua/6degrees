import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/database';

interface ChainParticipant {
  userid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  joinedAt: string;
  rewardAmount: number;
  shareableLink?: string;
  parentUserId?: string;
  baseReward?: number;
  lastChildAddedAt?: string;
  freezeUntil?: string;
}

interface TreePath {
  pathUserIds: string[];
  pathParticipants: ChainParticipant[];
  subtreeRootId: string;
  leafUserId: string;
  pathLength: number;
  isComplete: boolean;
}

/**
 * Build all paths from creator to leaf nodes in a chain tree
 */
function buildChainPaths(participants: ChainParticipant[]): TreePath[] {
  const paths: TreePath[] = [];

  // Find creator (root node)
  const creator = participants.find(p => p.role === 'creator');
  if (!creator) {
    throw new Error('No creator found in chain');
  }

  // Build adjacency list (parent -> children mapping)
  const childrenMap = new Map<string, ChainParticipant[]>();
  participants.forEach(p => {
    if (p.parentUserId) {
      if (!childrenMap.has(p.parentUserId)) {
        childrenMap.set(p.parentUserId, []);
      }
      childrenMap.get(p.parentUserId)!.push(p);
    }
  });

  // Find all leaf nodes (nodes with no children)
  const leafNodes = participants.filter(p => {
    return !childrenMap.has(p.userid) && p.userid !== creator.userid;
  });

  // If no leaf nodes (only creator), creator is the only path
  if (leafNodes.length === 0) {
    return [{
      pathUserIds: [creator.userid],
      pathParticipants: [creator],
      subtreeRootId: creator.userid,
      leafUserId: creator.userid,
      pathLength: 1,
      isComplete: creator.role === 'target'
    }];
  }

  // DFS to find all paths from creator to each leaf
  function findPathToLeaf(
    currentNode: ChainParticipant,
    targetLeaf: ChainParticipant,
    currentPath: ChainParticipant[]
  ): ChainParticipant[] | null {
    currentPath.push(currentNode);

    // Found the leaf
    if (currentNode.userid === targetLeaf.userid) {
      return [...currentPath];
    }

    // Explore children
    const children = childrenMap.get(currentNode.userid) || [];
    for (const child of children) {
      const result = findPathToLeaf(child, targetLeaf, currentPath);
      if (result) {
        return result;
      }
    }

    currentPath.pop();
    return null;
  }

  // Build path for each leaf node
  for (const leaf of leafNodes) {
    const path = findPathToLeaf(creator, leaf, []);

    if (path && path.length >= 2) {
      // Determine subtree root (first child of creator in this path)
      const subtreeRoot = path.length > 1 ? path[1] : creator;

      paths.push({
        pathUserIds: path.map(p => p.userid),
        pathParticipants: path,
        subtreeRootId: subtreeRoot.userid,
        leafUserId: leaf.userid,
        pathLength: path.length,
        isComplete: leaf.role === 'target'
      });
    }
  }

  return paths;
}

/**
 * Calculate and store all paths for a chain
 * Called whenever a new node joins the chain
 */
export const updateChainPaths = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chainId } = req.params;

    // Fetch chain data
    const { data: chain, error: chainError } = await supabase
      .from('chains')
      .select('*')
      .eq('id', chainId)
      .single();

    if (chainError || !chain) {
      return res.status(404).json({
        success: false,
        message: 'Chain not found'
      });
    }

    // Build all paths
    const paths = buildChainPaths(chain.participants);

    // Delete existing paths for this chain
    await supabase
      .from('chain_paths')
      .delete()
      .eq('chain_id', chainId);

    // Insert new paths
    const pathRecords = paths.map(path => ({
      chain_id: chainId,
      path_id: `${chainId}-${path.leafUserId}`,
      creator_id: path.pathUserIds[0],
      leaf_userid: path.leafUserId,
      subtree_root_id: path.subtreeRootId,
      path_userids: path.pathUserIds,
      path_participants: path.pathParticipants,
      base_reward: chain.total_reward / paths.length, // Divide reward equally among paths
      current_reward: chain.total_reward / paths.length,
      path_length: path.pathLength,
      is_complete: path.isComplete,
      subtree_frozen_until: null,
      last_child_added_at: null
    }));

    const { error: insertError } = await supabase
      .from('chain_paths')
      .insert(pathRecords);

    if (insertError) {
      console.error('Error inserting paths:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update paths'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        pathCount: paths.length,
        paths: pathRecords
      }
    });
  } catch (error) {
    console.error('Error updating chain paths:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Freeze a subtree when a child is added
 */
export const freezeSubtree = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chainId, subtreeRootId } = req.params;
    const { freezeHours = 12 } = req.body;

    const freezeUntil = new Date(Date.now() + freezeHours * 60 * 60 * 1000);

    // Update all paths in this subtree
    const { error } = await supabase
      .from('chain_paths')
      .update({
        subtree_frozen_until: freezeUntil.toISOString(),
        last_child_added_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('chain_id', chainId)
      .eq('subtree_root_id', subtreeRootId);

    if (error) {
      console.error('Error freezing subtree:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to freeze subtree'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        subtreeRootId,
        frozenUntil: freezeUntil.toISOString()
      }
    });
  } catch (error) {
    console.error('Error freezing subtree:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get all paths for a chain with current reward calculations
 */
export const getChainPaths = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chainId } = req.params;

    const { data: paths, error } = await supabase
      .from('active_chain_paths_with_rewards')
      .select('*')
      .eq('chain_id', chainId);

    if (error) {
      console.error('Error fetching paths:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch paths'
      });
    }

    return res.status(200).json({
      success: true,
      data: paths
    });
  } catch (error) {
    console.error('Error fetching paths:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get subtree statistics for creator dashboard
 */
export const getSubtreeStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chainId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Verify user is the creator of this chain
    const { data: chain, error: chainError } = await supabase
      .from('chains')
      .select('*, connection_requests!inner(creator_id)')
      .eq('id', chainId)
      .single();

    if (chainError || !chain) {
      return res.status(404).json({
        success: false,
        message: 'Chain not found'
      });
    }

    // Check if user is creator
    const isCreator = chain.connection_requests?.creator_id === userId;
    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can view these statistics'
      });
    }

    // Fetch subtree statistics
    const { data: subtreeStats, error: statsError } = await supabase.rpc('get_subtree_statistics', {
      p_chain_id: chainId
    });

    if (statsError) {
      // If function doesn't exist, fall back to manual query
      console.log('RPC not found, using manual query');

      const { data: paths, error: pathsError } = await supabase
        .from('chain_paths')
        .select('*')
        .eq('chain_id', chainId);

      if (pathsError) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch statistics'
        });
      }

      // Group by subtree and calculate stats
      const subtreeMap = new Map<string, any>();

      for (const path of paths || []) {
        const subtreeId = path.subtree_root_id;

        if (!subtreeMap.has(subtreeId)) {
          // Find subtree root name from path participants
          const rootParticipant = path.path_participants.find(
            (p: any) => p.userid === subtreeId
          );

          subtreeMap.set(subtreeId, {
            subtree_root_id: subtreeId,
            subtree_root_name: rootParticipant
              ? `${rootParticipant.firstName} ${rootParticipant.lastName}`
              : 'Unknown',
            path_count: 0,
            total_reward: 0,
            avg_path_length: 0,
            deepest_path_length: 0,
            leaf_count: 0,
            is_frozen: false,
            freeze_ends_at: null,
            path_lengths: []
          });
        }

        const stats = subtreeMap.get(subtreeId);
        stats.path_count++;
        stats.total_reward += parseFloat(path.current_reward || 0);
        stats.path_lengths.push(path.path_length);
        stats.leaf_count++;

        // Check if frozen
        if (path.subtree_frozen_until && new Date(path.subtree_frozen_until) > new Date()) {
          stats.is_frozen = true;
          stats.freeze_ends_at = path.subtree_frozen_until;
        }

        stats.deepest_path_length = Math.max(stats.deepest_path_length, path.path_length);
      }

      // Calculate averages
      const subtrees = Array.from(subtreeMap.values()).map(stats => {
        const avgLength = stats.path_lengths.reduce((a: number, b: number) => a + b, 0) / stats.path_lengths.length;
        delete stats.path_lengths;
        return {
          ...stats,
          avg_path_length: avgLength
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          chain_id: chainId,
          subtrees: subtrees.sort((a, b) => b.path_count - a.path_count)
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        chain_id: chainId,
        subtrees: subtreeStats
      }
    });
  } catch (error) {
    console.error('Error fetching subtree stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export { buildChainPaths };