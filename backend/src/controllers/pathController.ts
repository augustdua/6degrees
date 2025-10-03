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
}

interface TreePath {
  pathUserIds: string[];
  pathParticipants: ChainParticipant[];
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
      paths.push({
        pathUserIds: path.map(p => p.userid),
        pathParticipants: path,
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
      path_userids: path.pathUserIds,
      path_participants: path.pathParticipants,
      reward: chain.total_reward / paths.length, // Divide reward equally among paths
      path_length: path.pathLength,
      is_complete: path.isComplete
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
 * Get all paths for a chain
 */
export const getChainPaths = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chainId } = req.params;

    const { data: paths, error } = await supabase
      .from('chain_paths')
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

export { buildChainPaths };