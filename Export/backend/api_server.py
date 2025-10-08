"""
Flask backend for 6 Degrees of Jobs game.
Serves game levels and validates moves.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pickle
import networkx as nx
import random
from pathlib import Path
import threading
from queue import Queue
from add_custom_job import (
    classify_job_by_similarity,
    generate_job_details,
    add_job_to_graph,
    append_job_to_core_details,
    append_embedding_to_store,
    generate_embedding_via_modal,
)

app = Flask(__name__)
CORS(app)

# Store progress for async job processing
job_processing_progress = {}

# Job processing queue (ensures sequential processing, prevents race conditions)
job_queue = Queue()
queue_lock = threading.Lock()

# Load the graph
GRAPH_PATH = Path(__file__).parent.parent.parent / "version5" / "graphs" / "version2_optimized" / "job_graph_with_bridges.gpickle"

print("Loading graph...")
with open(GRAPH_PATH, 'rb') as f:
    G = pickle.load(f)

# Get main component nodes only
components = list(nx.connected_components(G))
main_component = max(components, key=len)
playable_nodes = list(main_component)

print(f"Graph loaded: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
print(f"Playable nodes: {len(playable_nodes)}")


def get_job_info(node_id):
    """Get job information for a node."""
    data = G.nodes[node_id]
    return {
        'id': int(node_id),  # Convert numpy int64 to Python int
        'title': data['job_title'],
        'industry': data['industry_name'],
        'sector': data['sector_name']
    }


def generate_level(difficulty='medium'):
    """Generate a new level based on difficulty."""
    # Difficulty mapping to path lengths
    difficulty_ranges = {
        'easy': (3, 4),
        'medium': (5, 7),
        'hard': (8, 10),
        'expert': (11, 15)
    }

    min_steps, max_steps = difficulty_ranges.get(difficulty, (5, 7))

    # Find a valid path
    max_attempts = 100
    for _ in range(max_attempts):
        start, end = random.sample(playable_nodes, 2)

        try:
            path = nx.shortest_path(G, source=start, target=end)
            path_length = len(path) - 1  # Number of steps

            if min_steps <= path_length <= max_steps:
                return {
                    'start': get_job_info(start),
                    'target': get_job_info(end),
                    'optimalPathLength': path_length,
                    'currentNode': get_job_info(start)
                }
        except nx.NetworkXNoPath:
            continue

    # Fallback to any valid path
    start, end = random.sample(playable_nodes, 2)
    try:
        path = nx.shortest_path(G, source=start, target=end)
        return {
            'start': get_job_info(start),
            'target': get_job_info(end),
            'optimalPathLength': len(path) - 1,
            'currentNode': get_job_info(start)
        }
    except:
        # Last resort
        return generate_level('easy')


def generate_choices(current_node_id, target_node_id):
    """
    Generate 3 choices: 1 correct (on shortest path), 2 incorrect.
    """
    try:
        # Get optimal path
        shortest_path = nx.shortest_path(G, source=current_node_id, target=target_node_id)

        if len(shortest_path) == 1:
            # Already at target
            return {
                'choices': [],
                'correct': None,
                'reachedTarget': True
            }

        correct_choice = shortest_path[1]  # Next node on optimal path

        # Get all neighbors
        neighbors = list(G.neighbors(current_node_id))

        # Remove correct choice
        wrong_neighbors = [n for n in neighbors if n != correct_choice]

        # Pick 2 random wrong choices
        if len(wrong_neighbors) >= 2:
            wrong_choices = random.sample(wrong_neighbors, 2)
        else:
            # Not enough wrong neighbors, use any nodes
            all_wrong = [n for n in playable_nodes if n not in [current_node_id, correct_choice]]
            wrong_choices = random.sample(all_wrong, 2)

        # Combine and shuffle
        all_choices = [correct_choice] + wrong_choices
        random.shuffle(all_choices)

        return {
            'choices': [get_job_info(node) for node in all_choices],
            'correct': int(correct_choice),  # Convert numpy int64 to Python int
            'reachedTarget': False
        }

    except nx.NetworkXNoPath:
        return {
            'choices': [],
            'correct': None,
            'error': 'No path exists'
        }


@app.route('/api/level/new', methods=['GET'])
def new_level():
    """Generate a new level."""
    difficulty = request.args.get('difficulty', 'medium')
    level = generate_level(difficulty)
    return jsonify(level)


@app.route('/api/level/choices', methods=['POST'])
def get_choices():
    """Get choices for current node."""
    data = request.json
    current_node_id = data.get('currentNodeId')
    target_node_id = data.get('targetNodeId')

    if current_node_id is None or target_node_id is None:
        return jsonify({'error': 'Missing node IDs'}), 400

    choices_data = generate_choices(current_node_id, target_node_id)
    return jsonify(choices_data)


@app.route('/api/level/validate', methods=['POST'])
def validate_choice():
    """Validate if a choice is correct."""
    data = request.json
    current_node_id = data.get('currentNodeId')
    target_node_id = data.get('targetNodeId')
    chosen_node_id = data.get('chosenNodeId')

    if None in [current_node_id, target_node_id, chosen_node_id]:
        return jsonify({'error': 'Missing node IDs'}), 400

    try:
        # Get optimal next step
        shortest_path = nx.shortest_path(G, source=current_node_id, target=target_node_id)

        if len(shortest_path) == 1:
            # Already at target
            return jsonify({'correct': True, 'reachedTarget': True})

        correct_next = shortest_path[1]
        is_correct = (chosen_node_id == correct_next)

        # Check if reached target
        reached_target = (chosen_node_id == target_node_id)

        return jsonify({
            'correct': is_correct,
            'reachedTarget': reached_target,
            'chosenNode': get_job_info(chosen_node_id)
        })

    except nx.NetworkXNoPath:
        return jsonify({'error': 'No path exists'}), 400


@app.route('/api/graph/info', methods=['GET'])
def graph_info():
    """Get graph statistics."""
    return jsonify({
        'totalNodes': G.number_of_nodes(),
        'totalEdges': G.number_of_edges(),
        'playableNodes': len(playable_nodes)
    })


@app.route('/api/jobs/all', methods=['GET'])
def get_all_jobs():
    """Get all available jobs."""
    jobs = [get_job_info(node_id) for node_id in playable_nodes]
    # Sort alphabetically by title
    jobs.sort(key=lambda x: x['title'])
    return jsonify({'jobs': jobs})


@app.route('/api/level/calculate-path', methods=['POST'])
def calculate_path():
    """Calculate optimal path length between two nodes."""
    data = request.json
    start_id = data.get('startId')
    target_id = data.get('targetId')

    if start_id is None or target_id is None:
        return jsonify({'error': 'Missing node IDs'}), 400

    try:
        path = nx.shortest_path(G, source=start_id, target=target_id)
        path_length = len(path) - 1  # Number of steps

        return jsonify({
            'pathLength': path_length,
            'path': [get_job_info(node) for node in path]
        })
    except nx.NetworkXNoPath:
        return jsonify({'error': 'No path exists between these jobs'}), 400


def job_queue_worker():
    """
    Background worker that processes jobs from the queue ONE AT A TIME.
    This ensures NO race conditions - jobs are processed sequentially.
    """
    global G, playable_nodes

    print("Job queue worker started. Waiting for jobs...")

    while True:
        # Block until a job is available
        job_id, job_title = job_queue.get()

        try:
            print(f"\n[Queue Worker] Processing job: {job_title} (ID: {job_id})")

            job_processing_progress[job_id] = {'progress': 10, 'status': 'Generating initial job details...'}

            # Step 1: Generate initial job details for classification (10% -> 20%)
            initial_job_details = generate_job_details(job_title, "Unknown Industry", "Unknown Sector")
            job_processing_progress[job_id] = {'progress': 20, 'status': 'Classifying with ML (embedding similarity)...'}

            # Step 2: Classify using embedding similarity (20% -> 40%)
            # This also generates the embedding, so we reuse it
            sector, industry, embedding = classify_job_by_similarity(job_title, initial_job_details, G)
            job_processing_progress[job_id] = {'progress': 40, 'status': 'Regenerating job details with industry context...'}

            # Step 3: Regenerate job details with proper industry context (40% -> 55%)
            job_details = generate_job_details(job_title, industry, sector)
            job_processing_progress[job_id] = {'progress': 55, 'status': 'Generating final embedding...'}

            # Generate final embedding from the final description/skills/responsibilities (55% -> 60%)
            final_embedding = generate_embedding_via_modal(job_title, job_details)
            # Persist to data stores
            append_job_to_core_details(industry, sector, job_title, job_details)
            append_embedding_to_store(industry, sector, job_title, job_details, final_embedding)
            job_processing_progress[job_id] = {'progress': 60, 'status': 'Adding to graph...'}

            # Step 4: Add to graph (60% -> 80%)
            # CRITICAL: This reads graph, modifies it, and writes it back
            # Queue ensures only ONE thread does this at a time!
            # Use the final embedding for similarity edges
            result = add_job_to_graph(job_title, sector, industry, job_details, final_embedding, GRAPH_PATH)
            job_processing_progress[job_id] = {'progress': 80, 'status': 'Reloading graph...'}

            # Step 5: Reload graph in memory (80% -> 100%)
            with open(GRAPH_PATH, 'rb') as f:
                G = pickle.load(f)

            # Update playable nodes
            components = list(nx.connected_components(G))
            main_component = max(components, key=len)
            playable_nodes = list(main_component)

            job_processing_progress[job_id] = {
                'progress': 100,
                'status': 'Complete!',
                'job': {
                    'id': result['id'],
                    'title': job_title,
                    'sector': sector,
                    'industry': industry
                }
            }

            print(f"[Queue Worker] ✓ Job completed: {job_title} (Node ID: {result['id']})")

        except Exception as e:
            print(f"[Queue Worker] ✗ Error processing {job_title}: {e}")
            job_processing_progress[job_id] = {
                'progress': 0,
                'status': f'Error: {str(e)}',
                'error': True
            }

        finally:
            # Mark task as done
            job_queue.task_done()


@app.route('/api/jobs/add', methods=['POST'])
def add_custom_job():
    """Add a custom job to the database (queued for sequential processing)."""
    data = request.json
    job_title = data.get('jobTitle', '').strip()

    if not job_title:
        return jsonify({'error': 'Job title is required'}), 400

    # Check if job already exists
    existing_job = None
    for node_id in G.nodes():
        if G.nodes[node_id]['job_title'].lower() == job_title.lower():
            existing_job = get_job_info(node_id)
            break

    if existing_job:
        return jsonify({
            'message': 'Job already exists',
            'job': existing_job
        })

    # Generate unique job ID for tracking
    import uuid
    job_id = str(uuid.uuid4())

    # Check queue size
    queue_size = job_queue.qsize()

    # Add to queue (will be processed sequentially by worker thread)
    job_queue.put((job_id, job_title))

    print(f"[API] Job '{job_title}' added to queue (position: {queue_size + 1})")

    return jsonify({
        'jobId': job_id,
        'message': 'Job added to processing queue',
        'queuePosition': queue_size + 1
    })


@app.route('/api/jobs/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get status of job processing."""
    if job_id not in job_processing_progress:
        return jsonify({'error': 'Job not found'}), 404

    return jsonify(job_processing_progress[job_id])


if __name__ == '__main__':
    # Start the job queue worker thread (daemon so it exits when main thread exits)
    worker_thread = threading.Thread(target=job_queue_worker, daemon=True)
    worker_thread.start()
    print("[OK] Job queue worker started in background")

    app.run(debug=True, port=5000)
