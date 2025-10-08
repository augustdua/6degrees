"""
Python service for Connector game graph operations.
This service handles NetworkX graph operations that can't be done in TypeScript.
"""
import os
import pickle
import random
import threading
from queue import Queue
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS
import networkx as nx
from dotenv import load_dotenv
import uuid

# Load environment variables
load_dotenv()

# Import job manager functions
from job_manager import (
    generate_job_details,
    classify_job_by_similarity,
    add_job_to_graph,
    append_job_to_core_details,
    append_embedding_to_store,
    generate_embedding_local
)

app = Flask(__name__)
CORS(app)

# Job processing queue and progress tracking
job_processing_progress = {}
job_queue = Queue()
queue_lock = threading.Lock()

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'data'
GRAPH_PATH = DATA_DIR / 'job_graph.gpickle'

print(f"Loading graph from: {GRAPH_PATH}")

# Load the graph
try:
    with open(GRAPH_PATH, 'rb') as f:
        G = pickle.load(f)
    print(f"✓ Graph loaded: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
except Exception as e:
    print(f"✗ Error loading graph: {e}")
    G = nx.Graph()

# Get main component nodes only (playable nodes)
components = list(nx.connected_components(G))
main_component = max(components, key=len) if components else set()
playable_nodes = list(main_component)
print(f"✓ Playable nodes: {len(playable_nodes)}")


def get_job_info(node_id):
    """Get job information for a node."""
    if node_id not in G.nodes:
        return None

    data = G.nodes[node_id]
    return {
        'id': int(node_id),
        'title': data.get('job_title', 'Unknown'),
        'industry': data.get('industry_name', 'Unknown'),
        'sector': data.get('sector_name', 'Unknown')
    }


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'graph_loaded': G.number_of_nodes() > 0,
        'total_nodes': G.number_of_nodes(),
        'playable_nodes': len(playable_nodes)
    })


@app.route('/api/jobs/all', methods=['GET'])
def get_all_jobs():
    """Get all available jobs."""
    try:
        jobs = [get_job_info(node_id) for node_id in playable_nodes]
        # Sort alphabetically by title
        jobs.sort(key=lambda x: x['title'])
        return jsonify({'jobs': jobs})
    except Exception as e:
        print(f"Error fetching jobs: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/level/calculate-path', methods=['POST'])
def calculate_path():
    """Calculate optimal path between two nodes."""
    try:
        data = request.json
        start_id = data.get('startId')
        target_id = data.get('targetId')

        if start_id is None or target_id is None:
            return jsonify({'error': 'Missing node IDs'}), 400

        # Convert to int if needed
        start_id = int(start_id)
        target_id = int(target_id)

        # Check if nodes exist
        if start_id not in G.nodes or target_id not in G.nodes:
            return jsonify({'error': 'Node not found in graph'}), 400

        # Calculate shortest path
        try:
            path = nx.shortest_path(G, source=start_id, target=target_id)
            path_length = len(path) - 1  # Number of steps

            return jsonify({
                'pathLength': path_length,
                'path': [get_job_info(node) for node in path]
            })
        except nx.NetworkXNoPath:
            return jsonify({'error': 'No path exists between these jobs'}), 400

    except Exception as e:
        print(f"Error calculating path: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/level/choices', methods=['POST'])
def get_choices():
    """Get choices for current node."""
    try:
        data = request.json
        current_node_id = data.get('currentNodeId')
        target_node_id = data.get('targetNodeId')

        if current_node_id is None or target_node_id is None:
            return jsonify({'error': 'Missing node IDs'}), 400

        # Convert to int if needed
        current_node_id = int(current_node_id)
        target_node_id = int(target_node_id)

        # Check if reached target
        if current_node_id == target_node_id:
            return jsonify({
                'choices': [],
                'correct': None,
                'reachedTarget': True
            })

        # Get optimal path
        try:
            shortest_path = nx.shortest_path(G, source=current_node_id, target=target_node_id)
        except nx.NetworkXNoPath:
            return jsonify({
                'choices': [],
                'correct': None,
                'error': 'No path exists'
            })

        if len(shortest_path) == 1:
            return jsonify({
                'choices': [],
                'correct': None,
                'reachedTarget': True
            })

        correct_choice = shortest_path[1]  # Next node on optimal path

        # Get all neighbors
        neighbors = list(G.neighbors(current_node_id))

        # Remove correct choice
        wrong_neighbors = [n for n in neighbors if n != correct_choice]

        # Pick 2 random wrong choices
        if len(wrong_neighbors) >= 2:
            wrong_choices = random.sample(wrong_neighbors, 2)
        else:
            # Not enough wrong neighbors, use any playable nodes
            all_wrong = [n for n in playable_nodes if n not in [current_node_id, correct_choice]]
            wrong_choices = random.sample(all_wrong, min(2, len(all_wrong)))

        # Combine and shuffle
        all_choices = [correct_choice] + wrong_choices
        random.shuffle(all_choices)

        return jsonify({
            'choices': [get_job_info(node) for node in all_choices],
            'correct': int(correct_choice),
            'reachedTarget': False
        })

    except Exception as e:
        print(f"Error generating choices: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/level/validate', methods=['POST'])
def validate_choice():
    """Validate if a choice is correct."""
    try:
        data = request.json
        current_node_id = data.get('currentNodeId')
        target_node_id = data.get('targetNodeId')
        chosen_node_id = data.get('chosenNodeId')

        if None in [current_node_id, target_node_id, chosen_node_id]:
            return jsonify({'error': 'Missing node IDs'}), 400

        # Convert to int
        current_node_id = int(current_node_id)
        target_node_id = int(target_node_id)
        chosen_node_id = int(chosen_node_id)

        # Get optimal next step
        try:
            shortest_path = nx.shortest_path(G, source=current_node_id, target=target_node_id)
        except nx.NetworkXNoPath:
            return jsonify({'error': 'No path exists'}), 400

        if len(shortest_path) == 1:
            return jsonify({'correct': True, 'reachedTarget': True})

        correct_next = shortest_path[1]
        is_correct = (chosen_node_id == correct_next)
        reached_target = (chosen_node_id == target_node_id)

        return jsonify({
            'correct': is_correct,
            'reachedTarget': reached_target,
            'chosenNode': get_job_info(chosen_node_id)
        })

    except Exception as e:
        print(f"Error validating choice: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/graph/info', methods=['GET'])
def graph_info():
    """Get graph statistics."""
    return jsonify({
        'totalNodes': G.number_of_nodes(),
        'totalEdges': G.number_of_edges(),
        'playableNodes': len(playable_nodes)
    })


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
            sector, industry, embedding = classify_job_by_similarity(job_title, initial_job_details, G)
            job_processing_progress[job_id] = {'progress': 40, 'status': 'Regenerating job details with industry context...'}

            # Step 3: Regenerate job details with proper industry context (40% -> 55%)
            job_details = generate_job_details(job_title, industry, sector)
            job_processing_progress[job_id] = {'progress': 55, 'status': 'Generating final embedding...'}

            # Generate final embedding from the final description (55% -> 60%)
            final_embedding = generate_embedding_local(job_title, job_details)
            job_processing_progress[job_id] = {'progress': 60, 'status': 'Saving job details...'}

            # Persist to data stores
            append_job_to_core_details(industry, sector, job_title, job_details)
            append_embedding_to_store(industry, sector, job_title, job_details, final_embedding)
            job_processing_progress[job_id] = {'progress': 70, 'status': 'Adding to graph...'}

            # Step 4: Add to graph (70% -> 90%)
            result = add_job_to_graph(job_title, sector, industry, job_details, final_embedding, GRAPH_PATH)
            job_processing_progress[job_id] = {'progress': 90, 'status': 'Reloading graph...'}

            # Step 5: Reload graph in memory (90% -> 100%)
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
            import traceback
            traceback.print_exc()
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

    port = int(os.environ.get('PYTHON_SERVICE_PORT', 5001))
    print(f"\n🚀 Connector Python Service starting on port {port}")
    print(f"📊 Graph Stats: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    print(f"🎮 Playable nodes: {len(playable_nodes)}\n")

    app.run(host='0.0.0.0', port=port, debug=True)
