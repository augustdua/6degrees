"""
Script to add a custom job to the graph.
Handles classification, job details generation, embedding generation, and graph updating.
Uses existing Modal infrastructure for GPU-based embeddings.

Process:
1. Use GPT to classify job into sector/industry
2. Use GPT to generate job_description, key_skills, responsibilities
3. Use Modal to generate embedding from combined text (description + skills + responsibilities)
4. Add job to graph with all fields
5. Create connections based on embedding similarity
"""

import pickle
import networkx as nx
from pathlib import Path
import numpy as np
import os
import sys
import json
import csv

# Add version5/scripts to path to import Modal embedding generator
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "version5" / "scripts"))

from openai import OpenAI

# Set up OpenAI API (using environment variable)
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

GRAPH_PATH = Path(__file__).parent.parent.parent / "version5" / "graphs" / "version2_optimized" / "job_graph_with_bridges.gpickle"
NAICS_PATH = Path(__file__).parent.parent.parent / "version5" / "data" / "industry" / "focused_naics_4digit.csv"
DATA_DIR = Path(__file__).parent.parent.parent / "version5" / "data" / "industry"
DETAILS_CSV_PATH = DATA_DIR / "core_jobs_with_details.csv"
EMB_NPZ_PATH = DATA_DIR / "core_jobs_with_embeddings.npz"
EMB_CSV_PATH = DATA_DIR / "core_jobs_with_embeddings.csv"


def load_naics_industries():
    """Load NAICS industry classifications from CSV."""
    import pandas as pd
    try:
        df = pd.read_csv(NAICS_PATH)
        # Create mapping of industry_name to sector_name
        industries = {}
        for _, row in df.iterrows():
            industries[row['industry_name']] = {
                'sector': row['sector_name'],
                'code': row['naics_code']
            }
        return industries
    except Exception as e:
        print(f"Could not load NAICS data: {e}")
        return {}


def generate_job_details(job_title, industry_name="Unknown Industry", sector_name="Unknown Sector"):
    """
    Use GPT-4 to generate comprehensive job details (matching generate_job_details.py format).
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
                # Convert to expected format
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
        return {
            "job_description": f"Professional in the field of {job_title}",
            "key_skills": "Communication, Problem-solving, Technical expertise",
            "responsibilities": "Perform job duties, Collaborate with team, Meet objectives"
        }


def generate_embedding_via_modal(job_title, job_data):
    """
    Generate embedding using Modal (GPU-accelerated).
    Combines job_title + job_description + key_skills + responsibilities.

    Args:
        job_title: Title of the job
        job_data: dict with job_description, key_skills, responsibilities

    Returns:
        numpy array of embedding
    """
    try:
        # Try to use Modal
        import modal
        import modal_embeddings

        # Combine text fields (INCLUDING job_title for better semantic matching)
        combined_text = f"{job_title} | {job_data['job_description']} | {job_data['key_skills']} | {job_data['responsibilities']}"

        # Generate embedding via Modal
        with modal_embeddings.app.run():
            generator = modal_embeddings.EmbeddingGenerator()
            embeddings = generator.embed.remote([combined_text])

        return np.array(embeddings[0])
    except Exception as e:
        print(f"Modal not available, using local generation: {e}")
        # Fallback: use sentence-transformers locally
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
            combined_text = f"{job_title} | {job_data['job_description']} | {job_data['key_skills']} | {job_data['responsibilities']}"
            return model.encode(combined_text)
        except:
            raise Exception("Neither Modal nor sentence-transformers available")


def classify_job_by_similarity(job_title, job_details, graph):
    """
    Classify job using embedding similarity to existing jobs in graph.
    This is MUCH more reliable than GPT classification.

    Args:
        job_title: Title of the job
        job_details: dict with job_description, key_skills, responsibilities
        graph: NetworkX graph with existing jobs

    Returns:
        (sector_name, industry_name, embedding) - from the most similar existing job
    """
    print("Classifying job using embedding similarity to existing jobs...")

    # Generate embedding for new job (includes title)
    new_embedding = generate_embedding_via_modal(job_title, job_details)

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

        print(f"  [OK] Most similar job: {best_match['job_title']} (similarity: {max_similarity:.3f})")
        print(f"  [OK] Classified as: {industry} / {sector}")

        return sector, industry, new_embedding
    else:
        # Fallback
        return "Professional, Scientific, and Technical Services", "Other Professional, Scientific, and Technical Services", new_embedding


def append_job_to_core_details(industry_name, sector_name, job_title, job_details):
    """
    Append the new job to core_jobs_with_details.csv as the source of truth.
    Columns: industry_code, industry_name, sector_name, job_title, job_description, key_skills, responsibilities
    """
    try:
        industries = load_naics_industries()
        naics_code = industries.get(industry_name, {}).get('code', '')

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
                naics_code,
                industry_name,
                sector_name,
                job_title,
                job_details.get('job_description', ''),
                job_details.get('key_skills', ''),
                job_details.get('responsibilities', '')
            ])
        print(f"[OK] Appended to {DETAILS_CSV_PATH.name}: {job_title}")
    except Exception as e:
        print(f"[WARN] Could not append to core_jobs_with_details.csv: {e}")


def append_embedding_to_store(industry_name, sector_name, job_title, job_details, embedding: np.ndarray) -> int:
    """
    Append embedding to NPZ store and metadata CSV and return embedding_index.
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

        industries = load_naics_industries()
        naics_code = industries.get(industry_name, {}).get('code', '')
        file_exists = EMB_CSV_PATH.exists()
        with open(EMB_CSV_PATH, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow([
                    'industry_code', 'industry_name', 'sector_name', 'job_title',
                    'job_description', 'key_skills', 'responsibilities', 'embedding_index'
                ])
            writer.writerow([
                naics_code,
                industry_name,
                sector_name,
                job_title,
                job_details.get('job_description', ''),
                job_details.get('key_skills', ''),
                job_details.get('responsibilities', ''),
                new_index
            ])
        print(f"[OK] Updated embeddings store: index {new_index} for {job_title}")
        return int(new_index)
    except Exception as e:
        print(f"[WARN] Could not append embedding to store: {e}")
        return -1


def add_job_to_graph(job_title, sector, industry, job_details, embedding, graph_path=GRAPH_PATH):
    """
    Add a new job to the graph with proper embedding and connections.

    WHAT THIS DOES:
    1. Loads existing graph from disk (pickle file)
    2. Adds ONE new node with all job fields + embedding
    3. Compares new embedding with ALL existing embeddings
    4. Creates edges to top-12 most similar jobs (similarity >= 0.65)
    5. Saves UPDATED graph back to disk (overwrites pickle file)
    6. Creates backup of previous graph version

    NOTE:
    - No bridge logic is applied. If a job has no similar neighbors above the
      threshold, it will remain isolated and may not appear in UI lists that
      only include the main component.

    WHAT THIS DOES NOT DO:
    - Does NOT regenerate any existing embeddings
    - Does NOT rebuild entire graph from scratch
    - Does NOT modify existing nodes or edges
    - Does NOT add bridges

    Args:
        job_title: Title of the job
        sector: Sector name (from similarity-based classification)
        industry: Industry name (from similarity-based classification)
        job_details: dict with job_description, key_skills, responsibilities
        embedding: Pre-computed embedding (from classification step)
        graph_path: Path to graph file
    """
    # Load graph
    print(f"Loading graph from {graph_path}...")
    with open(graph_path, 'rb') as f:
        G = pickle.load(f)

    # Get new node ID
    max_id = max(G.nodes())
    new_id = max_id + 1

    print(f"Using pre-computed embedding for '{job_title}'...")

    # Add node to graph with ALL fields (matching original graph structure)
    G.add_node(new_id,
               job_title=job_title,
               sector_name=sector,
               industry_name=industry,
               job_description=job_details['job_description'],
               key_skills=job_details['key_skills'],
               responsibilities=job_details['responsibilities'],
               embedding=embedding)

    print(f"Finding similar jobs to connect...")
    # Find top-k most similar jobs using EXISTING embeddings
    # We do NOT regenerate any embeddings - just use what's already in the graph
    similarities = []
    for node_id in G.nodes():
        if node_id == new_id:
            continue
        if 'embedding' in G.nodes[node_id]:
            other_embedding = G.nodes[node_id]['embedding']
            # Cosine similarity - comparing new embedding with existing ones
            similarity = np.dot(embedding, other_embedding) / (
                np.linalg.norm(embedding) * np.linalg.norm(other_embedding)
            )
            similarities.append((node_id, similarity))

    # Connect to top 12 most similar jobs (similar to version2 top_k=12)
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_k = 12

    for node_id, similarity in similarities[:top_k]:
        if similarity >= 0.65:  # Use version2 threshold
            G.add_edge(new_id, node_id, weight=float(similarity))
            print(f"  Connected to: {G.nodes[node_id]['job_title']} (similarity: {similarity:.3f})")

    # No bridge logic: if the node has zero neighbors after thresholding, it
    # remains isolated. This keeps graph construction consistent with
    # similarity-only edges.

    # Save updated graph (with backup)
    print(f"Saving updated graph...")
    # Create backup before modifying
    backup_path = graph_path.parent / f"job_graph_backup_{max_id}.gpickle"
    import shutil
    shutil.copy2(graph_path, backup_path)
    print(f"  Backup saved: {backup_path.name}")

    # Save new graph (ONLY the graph file is regenerated, not embeddings)
    with open(graph_path, 'wb') as f:
        pickle.dump(G, f, protocol=pickle.HIGHEST_PROTOCOL)

    print(f"[SUCCESS] Job added successfully! Node ID: {new_id}")
    print(f"[SUCCESS] Graph saved with {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    return {
        'id': int(new_id),
        'title': job_title,
        'sector': sector,
        'industry': industry,
        'connections': len(list(G.neighbors(new_id)))
    }


if __name__ == '__main__':
    # Test
    job_title = "Math Researcher"

    print(f"\n{'='*60}")
    print(f"Adding New Job: {job_title}")
    print(f"{'='*60}\n")

    # Step 1: Generate initial job details for classification
    print("Step 1: Generating initial job details for classification...")
    initial_job_details = generate_job_details(job_title, "Unknown Industry", "Unknown Sector")
    print(f"  [OK] Initial Description: {initial_job_details['job_description'][:80]}...\n")

    # Step 2: Classify using embedding similarity (also generates embedding)
    print("Step 2: Classifying job using ML (embedding similarity)...")
    # Load graph for classification
    with open(GRAPH_PATH, 'rb') as f:
        G = pickle.load(f)

    sector, industry, embedding = classify_job_by_similarity(job_title, initial_job_details, G)
    print(f"  [OK] Sector: {sector}")
    print(f"  [OK] Industry: {industry}\n")

    # Step 3: Regenerate job details with proper industry context
    print("Step 3: Regenerating job details with industry context...")
    job_details = generate_job_details(job_title, industry, sector)
    print(f"  [OK] Description: {job_details['job_description'][:80]}...")
    print(f"  [OK] Skills: {job_details['key_skills'][:60]}...")
    print(f"  [OK] Responsibilities: {job_details['responsibilities'][:60]}...\n")

    # Step 4: Add to graph (reuses embedding from classification)
    print("Step 4: Adding to graph...")
    result = add_job_to_graph(job_title, sector, industry, job_details, embedding)
    print(f"\n{'='*60}")
    print(f"[SUCCESS] Job Added Successfully!")
    print(f"{'='*60}")
    print(f"Result: {result}")
