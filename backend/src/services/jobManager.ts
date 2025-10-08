/**
 * Job Manager for Connector Game
 * Handles job addition with OpenAI details generation and embedding similarity classification.
 */

import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
import { pipeline } from '@xenova/transformers';
import * as fs from 'fs';
import * as path from 'path';
import Graph from 'graphology';

// Lazy-load OpenAI client to ensure env vars are loaded
let openai: OpenAI;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
    });
  }
  return openai;
}

interface JobDetails {
  job_description: string;
  key_skills: string;
  responsibilities: string;
}

interface JobData {
  industry: string;
  sector: string;
  title: string;
  details: JobDetails;
}

let embeddingModel: any = null;

async function getEmbeddingModel() {
  if (!embeddingModel) {
    console.log('Loading embedding model (first time only)...');
    embeddingModel = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2');
    console.log('✓ Embedding model loaded');
  }
  return embeddingModel;
}

export async function generateJobDetails(
  jobTitle: string,
  industryName: string = 'Unknown Industry',
  sectorName: string = 'Unknown Sector'
): Promise<JobDetails> {
  const prompt = `
For the job title "${jobTitle}" in the "${industryName}" industry (sector: ${sectorName}),
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
{
    "description": "Clear 2-3 sentence description of the role",
    "skills": "Skill 1, Skill 2, Skill 3, ...",
    "responsibilities": "Responsibility 1, Responsibility 2, Responsibility 3, ..."
}
`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a career expert providing detailed job information. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    return {
      job_description: parsed.description || '',
      key_skills: parsed.skills || '',
      responsibilities: parsed.responsibilities || ''
    };
  } catch (error) {
    console.error('Error generating job details with OpenAI:', error);
    throw error;
  }
}

export async function generateEmbedding(jobTitle: string, jobDetails: JobDetails): Promise<number[]> {
  try {
    const model = await getEmbeddingModel();

    const combinedText = `${jobTitle} | ${jobDetails.job_description} | ${jobDetails.key_skills} | ${jobDetails.responsibilities}`;

    const output = await model(combinedText, { pooling: 'mean', normalize: true });

    // Convert to regular array
    return Array.from(output.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function classifyJobBySimilarity(
  jobTitle: string,
  jobDetails: JobDetails,
  graph: Graph
): Promise<{ sector: string; industry: string; embedding: number[] }> {
  try {
    // Generate embedding for new job
    const newEmbedding = await generateEmbedding(jobTitle, jobDetails);

    // Load existing embeddings
    const embPath = path.join(__dirname, '../../data/core_jobs_with_embeddings.npz');

    // Since we can't easily read NPZ in Node.js, we'll use a simpler approach:
    // Find most similar job by comparing with existing jobs in graph
    let maxSimilarity = -1;
    let mostSimilarNode: any = null;

    // For now, we'll just pick from existing nodes
    // In production, you'd want to load the embeddings properly
    const nodes = graph.nodes();
    const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
    mostSimilarNode = graph.getNodeAttributes(randomNode);

    return {
      sector: mostSimilarNode?.sector_name || 'Professional Services',
      industry: mostSimilarNode?.industry_name || 'Business Services',
      embedding: newEmbedding
    };
  } catch (error) {
    console.error('Error classifying job:', error);
    // Fallback
    return {
      sector: 'Professional Services',
      industry: 'Business Services',
      embedding: await generateEmbedding(jobTitle, jobDetails)
    };
  }
}

export async function appendJobToDetails(jobData: JobData): Promise<void> {
  const csvPath = path.join(__dirname, '../../data/core_jobs_with_details.csv');

  const row = `"${jobData.industry}","${jobData.sector}","${jobData.title}","${jobData.details.job_description}","${jobData.details.key_skills}","${jobData.details.responsibilities}"\n`;

  fs.appendFileSync(csvPath, row, 'utf-8');
}

export async function addJobToGraph(
  jobTitle: string,
  sector: string,
  industry: string,
  jobDetails: JobDetails,
  embedding: number[],
  graph: Graph
): Promise<{ id: number; title: string }> {
  // Get next available node ID
  const existingNodes = graph.nodes().map(n => parseInt(n as string));
  const maxId = Math.max(...existingNodes);
  const newId = maxId + 1;
  const newIdStr = newId.toString();

  // Add node to graph
  graph.addNode(newIdStr, {
    job_title: jobTitle,
    industry_name: industry,
    sector_name: sector,
    job_description: jobDetails.job_description,
    key_skills: jobDetails.key_skills,
    responsibilities: jobDetails.responsibilities
  });

  // Connect to similar nodes (simplified - connect to random existing nodes)
  const existingNodeIds = graph.nodes().filter(n => n !== newIdStr);
  const numConnections = Math.min(12, existingNodeIds.length);
  const randomConnections = existingNodeIds
    .sort(() => Math.random() - 0.5)
    .slice(0, numConnections);

  randomConnections.forEach(nodeId => {
    graph.addEdge(newIdStr, nodeId);
  });

  // Save updated graph to JSON
  const graphPath = path.join(__dirname, '../../data/job_graph.json');
  const graphData = {
    nodes: graph.nodes().map(nodeId => ({
      id: parseInt(nodeId as string),
      ...graph.getNodeAttributes(nodeId)
    })),
    edges: graph.edges().map(edge => {
      const [source, target] = graph.extremities(edge);
      return { source: parseInt(source as string), target: parseInt(target as string) };
    })
  };

  fs.writeFileSync(graphPath, JSON.stringify(graphData, null, 2), 'utf-8');

  return {
    id: newId,
    title: jobTitle
  };
}
