"""
Job Manager for Connector Game
Handles job addition with OpenAI details generation and embedding similarity classification.
"""

import pickle
import networkx as nx
from pathlib import Path
import numpy as np
import os
import json
import csv
from openai import OpenAI

# Initialize OpenAI client from environment
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'data'
GRAPH_PATH = DATA_DIR / 'job_graph.gpickle'
DETAILS_CSV_PATH = DATA_DIR / 'core_jobs_with_details.csv'
EMB_NPZ_PATH = DATA_DIR / 'core_jobs_with_embeddings.npz'
EMB_CSV_PATH = DATA_DIR / 'core_jobs_with_embeddings.csv'


def generate_job_details(job_title, industry_name="Unknown Industry", sector_name="Unknown Sector"):
    """
    Use GPT-4 to generate comprehensive job details.
    Returns: dict with job_description, key_skills, responsibilities
    """
    prompt = f"""
    For the job title "{job_title}" in the "{industry_name}" industry (sector: {sector_name}),
    please provide detailed information in the following format:

    1. **Job Description**: Write a clear, concise 2-3 sentence description of what this person does, their main purpose, and key focus areas.

    2. **Key Skills**: List 5-7 essential skills required for this role. Include both technical and soft skills. Format as comma-separated values.

    3. **Primary Responsibilities**: List 4-6 main duties and responsibilities. Be specific about what this person actually does day-to-day. Format as comma-separated values.

    Focus on:
    - Realistic, industry-standard expectations
    - Practical skills and responsibilities
    - Both technical and interpersonal requirements
    - Day-to-day activities and deliverables

    Format your response as a JSON object with this structure:
    {{
        "description": "Clear 2-3 sentence description of the role",
        "skills": "Skill1, Skill2, Skill3, Skill4, Skill5",
        "responsibilities": "Responsibility1, Responsibility2, Responsibility3, Responsibility4"
    }}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert in job market analysis and career development. Provide accurate, realistic job information for various industries."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )

        content = response.choices[0].message.content.strip()

        # Try to parse JSON response
        try:
            job_details = json.loads(content)
            if isinstance(job_details, dict) and all(key in job_details for key in ['description', 'skills', 'responsibilities']):
                return {
                    "job_description": job_details.get('description', ''),
                    "key_skills": job_details.get('skills', ''),
                    "responsibilities": job_details.get('responsibilities', '')
                }
            else:
                print(f"Warning: Invalid JSON structure for {job_title}")
                return None
        except json.JSONDecodeError as e:
            print(f"JSON decode error for {job_title}: {e}")
            print(f"Raw response: {content}")
            return None

    except Exception as e:
        print(f"OpenAI API error for {job_title}: {e}")
        # Fallback
        return {
            "job_description": f"Professional specializing in {job_title}",
            "key_skills": "Communication, Problem-solving, Technical expertise, Collaboration, Adaptability",
            "responsibilities": "Perform core job duties, Collaborate with team members, Meet project objectives, Maintain quality standards"
        }


def generate_embedding_local(job_title, job_data):
    """
    Generate embedding using sentence-transformers (local, no Modal needed).
    Combines job_title + job_description + key_skills + responsibilities.
    """
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
        combined_text = f"{job_title} | {job_data['job_description']} | {job_data['key_skills']} | {job_data['responsibilities']}"
        return model.encode(combined_text)
    except Exception as e:
        print(f"Error generating embedding: {e}")
        raise


def classify_job_by_similarity(job_title, job_details, graph):
    """
    Classify job using embedding similarity to existing jobs in graph.

    Returns:
        (sector_name, industry_name, embedding)
    """
    print(f"Classifying '{job_title}' using embedding similarity...")

    # Generate embedding for new job
    new_embedding = generate_embedding_local(job_title, job_details)

    # Find most similar existing job
    max_similarity = -1
    best_match_node = None

    for node_id in graph.nodes():
        if 'embedding' not in graph.nodes[node_id]:
            continue

        existing_embedding = graph.nodes[node_id]['embedding']

        # Cosine similarity
        similarity = np.dot(new_embedding, existing_embedding) / (
            np.linalg.norm(new_embedding) * np.linalg.norm(existing_embedding)
        )

        if similarity > max_similarity:
            max_similarity = similarity
            best_match_node = node_id

    if best_match_node is not None:
        best_match = graph.nodes[best_match_node]
        sector = best_match['sector_name']
        industry = best_match['industry_name']

        print(f"  Most similar job: {best_match['job_title']} (similarity: {max_similarity:.3f})")
        print(f"  Classified as: {industry} / {sector}")

        return sector, industry, new_embedding
    else:
        # Fallback
        return "Professional Services", "Other Professional Services", new_embedding


def append_job_to_core_details(industry_name, sector_name, job_title, job_details):
    """
    Append the new job to core_jobs_with_details.csv.
    """
    try:
        DETAILS_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
        file_exists = DETAILS_CSV_PATH.exists()
        with open(DETAILS_CSV_PATH, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow([
                    'industry_code', 'industry_name', 'sector_name', 'job_title',
                    'job_description', 'key_skills', 'responsibilities'
                ])
            writer.writerow([
                '',  # industry_code (not critical)
                industry_name,
                sector_name,
                job_title,
                job_details.get('job_description', ''),
                job_details.get('key_skills', ''),
                job_details.get('responsibilities', '')
            ])
        print(f"[OK] Appended to {DETAILS_CSV_PATH.name}")
    except Exception as e:
        print(f"[WARN] Could not append to CSV: {e}")


def append_embedding_to_store(industry_name, sector_name, job_title, job_details, embedding):
    """
    Append embedding to NPZ store and metadata CSV.
    Returns embedding_index.
    """
    try:
        emb = np.array(embedding, dtype=np.float32)
        if emb.ndim == 1:
            emb = emb.reshape(1, -1)

        if EMB_NPZ_PATH.exists():
            data = np.load(EMB_NPZ_PATH)
            existing = data['embeddings']
            new_index = existing.shape[0]
            combined = np.vstack([existing, emb])
        else:
            EMB_NPZ_PATH.parent.mkdir(parents=True, exist_ok=True)
            combined = emb
            new_index = 0

        np.savez_compressed(EMB_NPZ_PATH, embeddings=combined)

        file_exists = EMB_CSV_PATH.exists()
        with open(EMB_CSV_PATH, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow([
                    'industry_code', 'industry_name', 'sector_name', 'job_title',
                    'job_description', 'key_skills', 'responsibilities', 'embedding_index'
                ])
            writer.writerow([
                '',
                industry_name,
                sector_name,
                job_title,
                job_details.get('job_description', ''),
                job_details.get('key_skills', ''),
                job_details.get('responsibilities', ''),
                new_index
            ])
        print(f"[OK] Updated embeddings store: index {new_index}")
        return int(new_index)
    except Exception as e:
        print(f"[WARN] Could not append embedding: {e}")
        return -1


def add_job_to_graph(job_title, sector, industry, job_details, embedding, graph_path=GRAPH_PATH):
    """
    Add a new job to the graph with proper embedding and connections.

    Returns:
        dict with id, title, sector, industry, connections
    """
    print(f"Loading graph from {graph_path}...")
    with open(graph_path, 'rb') as f:
        G = pickle.load(f)

    # Get new node ID
    max_id = max(G.nodes())
    new_id = max_id + 1

    # Add node to graph
    G.add_node(new_id,
               job_title=job_title,
               sector_name=sector,
               industry_name=industry,
               job_description=job_details['job_description'],
               key_skills=job_details['key_skills'],
               responsibilities=job_details['responsibilities'],
               embedding=embedding)

    print(f"Finding similar jobs to connect...")
    similarities = []
    for node_id in G.nodes():
        if node_id == new_id:
            continue
        if 'embedding' in G.nodes[node_id]:
            other_embedding = G.nodes[node_id]['embedding']
            similarity = np.dot(embedding, other_embedding) / (
                np.linalg.norm(embedding) * np.linalg.norm(other_embedding)
            )
            similarities.append((node_id, similarity))

    # Connect to top 12 most similar jobs
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_k = 12
    connections_made = 0

    for node_id, similarity in similarities[:top_k]:
        if similarity >= 0.65:
            G.add_edge(new_id, node_id, weight=float(similarity))
            print(f"  Connected to: {G.nodes[node_id]['job_title']} (similarity: {similarity:.3f})")
            connections_made += 1

    # Save updated graph (with backup)
    print(f"Saving updated graph...")
    backup_path = graph_path.parent / f"job_graph_backup_{max_id}.gpickle"
    import shutil
    if graph_path.exists():
        shutil.copy2(graph_path, backup_path)
        print(f"  Backup saved: {backup_path.name}")

    with open(graph_path, 'wb') as f:
        pickle.dump(G, f, protocol=pickle.HIGHEST_PROTOCOL)

    print(f"[SUCCESS] Job added! Node ID: {new_id}, Connections: {connections_made}")
    print(f"[SUCCESS] Graph now has {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    return {
        'id': int(new_id),
        'title': job_title,
        'sector': sector,
        'industry': industry,
        'connections': connections_made
    }
