/**
 * AI Verification Service
 * Orchestrates Whisper (transcription) + GPT-4 (analysis) + Rekognition (face verification)
 * for PayNet intro call verification
 */

import OpenAI from 'openai';
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';
import { supabase } from '../config/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

interface TranscriptSegment {
  speaker: string; // 'seller', 'buyer', 'target'
  text: string;
  timestamp: number;
  duration: number;
}

interface QuestionAnalysis {
  question_number: number;
  question_text: string;
  was_asked: boolean;
  was_answered: boolean;
  is_substantive: boolean;
  response_text?: string;
  response_duration?: number;
  quality_score: number; // 0-10
}

interface FaceVerificationResult {
  average_confidence: number;
  frames_analyzed: number;
  frames_passed: number;
  is_verified: boolean; // true if average >= 85%
}

interface VerificationResult {
  final_verdict: 'success' | 'failure';
  duration_minutes: number;
  duration_met: boolean; // >= 30 minutes
  face_verification: FaceVerificationResult;
  questions: QuestionAnalysis[];
  questions_substantive_count: number;
  quality_score: number; // Overall 1-10
  failure_reason?: string;
  full_transcript: string;
  ai_analysis: any;
}

/**
 * Transcribe audio using Whisper with speaker diarization
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    console.log('🎤 Transcribing audio with Whisper...');

    // Download audio file
    const response = await fetch(audioUrl);
    const audioBlob = await response.blob();
    const audioFile = new File([audioBlob], 'call-audio.mp3', { type: 'audio/mpeg' });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });

    console.log('✅ Transcription complete');
    return JSON.stringify(transcription);
  } catch (error: any) {
    console.error('❌ Error transcribing audio:', error.message);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Analyze transcript with GPT-4 to track questions
 */
export async function analyzeQuestionsWithGPT4(
  transcript: string,
  questions: string[]
): Promise<QuestionAnalysis[]> {
  try {
    console.log('🤖 Analyzing questions with GPT-4...');

    const prompt = `You are analyzing a 3-way intro call transcript to verify if the buyer's questions were asked and substantively answered.

BUYER'S 5 QUESTIONS:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

TRANSCRIPT:
${transcript}

For each question, analyze:
1. Was the question asked (even if paraphrased)?
2. Was it answered by the target person?
3. Was the answer substantive? (Specific, helpful, demonstrates expertise, >30 seconds, not vague platitudes)

Return JSON array with this structure:
[
  {
    "question_number": 1,
    "question_text": "...",
    "was_asked": true/false,
    "was_answered": true/false,
    "is_substantive": true/false,
    "response_text": "...",
    "response_duration": seconds,
    "quality_score": 0-10
  },
  ...
]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert call analyst. Return only valid JSON, no markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    console.log('✅ Question analysis complete');

    return result.questions || [];
  } catch (error: any) {
    console.error('❌ Error analyzing questions:', error.message);
    throw new Error(`Failed to analyze questions: ${error.message}`);
  }
}

/**
 * Verify face using AWS Rekognition
 */
export async function verifyFace(
  referenceImageUrl: string,
  videoFramesUrls: string[]
): Promise<FaceVerificationResult> {
  try {
    console.log('👤 Verifying face with AWS Rekognition...');
    console.log(`   Reference image: ${referenceImageUrl}`);
    console.log(`   Analyzing ${videoFramesUrls.length} frames`);

    // Download reference image
    const refResponse = await fetch(referenceImageUrl);
    const refBuffer = Buffer.from(await refResponse.arrayBuffer());

    let totalConfidence = 0;
    let framesPassed = 0;
    const framesAnalyzed = videoFramesUrls.length;

    // Compare each frame to reference image
    for (const frameUrl of videoFramesUrls) {
      try {
        const frameResponse = await fetch(frameUrl);
        const frameBuffer = Buffer.from(await frameResponse.arrayBuffer());

        const command = new CompareFacesCommand({
          SourceImage: { Bytes: refBuffer },
          TargetImage: { Bytes: frameBuffer },
          SimilarityThreshold: 70 // Minimum 70% to count as a match
        });

        const result = await rekognition.send(command);

        if (result.FaceMatches && result.FaceMatches.length > 0) {
          const confidence = result.FaceMatches[0].Similarity || 0;
          totalConfidence += confidence;

          if (confidence >= 85) {
            framesPassed++;
          }

          console.log(`   Frame ${framesPassed}/${framesAnalyzed}: ${confidence.toFixed(1)}% match`);
        }
      } catch (error) {
        console.error(`   Frame analysis failed, skipping...`);
      }
    }

    const averageConfidence = framesAnalyzed > 0 ? totalConfidence / framesAnalyzed : 0;
    const isVerified = averageConfidence >= 85;

    console.log(`✅ Face verification complete: ${averageConfidence.toFixed(1)}% average`);

    return {
      average_confidence: Math.round(averageConfidence * 100) / 100,
      frames_analyzed: framesAnalyzed,
      frames_passed: framesPassed,
      is_verified: isVerified
    };
  } catch (error: any) {
    console.error('❌ Error verifying face:', error.message);
    throw new Error(`Failed to verify face: ${error.message}`);
  }
}

/**
 * Generate final verification verdict
 */
export async function generateVerificationReport(
  callId: string,
  bidId: string,
  audioUrl: string,
  videoFramesUrls: string[],
  referenceImageUrl: string,
  questions: string[],
  callDurationMinutes: number
): Promise<VerificationResult> {
  try {
    console.log('📊 Generating verification report for call:', callId);

    // Step 1: Transcribe audio
    const transcriptJson = await transcribeAudio(audioUrl);
    const transcript = JSON.parse(transcriptJson);
    const fullTranscriptText = transcript.text || '';

    // Step 2: Analyze questions
    const questionAnalysis = await analyzeQuestionsWithGPT4(fullTranscriptText, questions);
    const substantiveCount = questionAnalysis.filter(q => q.is_substantive).length;

    // Step 3: Verify face
    const faceVerification = await verifyFace(referenceImageUrl, videoFramesUrls);

    // Step 4: Calculate overall quality score
    const qualityScore = (
      (faceVerification.is_verified ? 3 : 0) +
      (callDurationMinutes >= 30 ? 3 : 0) +
      (substantiveCount >= 2 ? 4 : substantiveCount * 2)
    ) / 10 * 10; // Scale to 0-10

    // Step 5: Determine final verdict
    const durationMet = callDurationMinutes >= 30;
    const questionsPass = substantiveCount >= 1; // At least 1-2 questions answered
    const facePass = faceVerification.is_verified;

    const success = durationMet && questionsPass && facePass;

    let failureReason: string | undefined;
    if (!success) {
      if (!durationMet) failureReason = 'Call duration less than 30 minutes';
      else if (!facePass) failureReason = 'Face verification failed (< 85% confidence)';
      else if (!questionsPass) failureReason = 'No substantive answers provided';
    }

    const result: VerificationResult = {
      final_verdict: success ? 'success' : 'failure',
      duration_minutes: callDurationMinutes,
      duration_met: durationMet,
      face_verification: faceVerification,
      questions: questionAnalysis,
      questions_substantive_count: substantiveCount,
      quality_score: Math.round(qualityScore * 10) / 10,
      failure_reason: failureReason,
      full_transcript: fullTranscriptText,
      ai_analysis: {
        transcript_segments: transcript.segments || [],
        question_analysis: questionAnalysis
      }
    };

    // Step 6: Save to database
    await saveVerificationReport(callId, bidId, result);

    console.log('✅ Verification report complete:', success ? 'SUCCESS' : 'FAILURE');
    if (failureReason) {
      console.log('   Reason:', failureReason);
    }

    return result;
  } catch (error: any) {
    console.error('❌ Error generating verification report:', error.message);
    throw new Error(`Failed to generate verification report: ${error.message}`);
  }
}

/**
 * Save verification report to database
 */
async function saveVerificationReport(
  callId: string,
  bidId: string,
  result: VerificationResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_verification_reports')
      .insert({
        call_id: callId,
        bid_id: bidId,
        face_verification_status: result.face_verification.is_verified ? 'verified' : 'failed',
        face_match_confidence_avg: result.face_verification.average_confidence,
        frames_analyzed: result.face_verification.frames_analyzed,
        frames_passed: result.face_verification.frames_passed,
        questions_asked: result.questions.filter(q => q.was_asked).length,
        questions_answered: result.questions.filter(q => q.was_answered).length,
        questions_substantive: result.questions_substantive_count,
        question_1_status: getQuestionStatus(result.questions[0]),
        question_2_status: getQuestionStatus(result.questions[1]),
        question_3_status: getQuestionStatus(result.questions[2]),
        question_4_status: getQuestionStatus(result.questions[3]),
        question_5_status: getQuestionStatus(result.questions[4]),
        duration_minutes: result.duration_minutes,
        duration_met: result.duration_met,
        final_verdict: result.final_verdict,
        failure_reason: result.failure_reason,
        quality_score: result.quality_score,
        full_transcript: result.full_transcript,
        ai_analysis_json: result.ai_analysis
      });

    if (error) {
      console.error('Error saving verification report:', error);
      throw error;
    }

    console.log('✅ Verification report saved to database');
  } catch (error) {
    console.error('❌ Error saving verification report:', error);
    throw error;
  }
}

/**
 * Helper: Get question status string
 */
function getQuestionStatus(q?: QuestionAnalysis): string {
  if (!q) return 'unanswered';
  if (q.is_substantive) return 'substantive';
  if (q.was_answered) return 'vague';
  return 'unanswered';
}

/**
 * Real-time intervention: Decide if AI should speak
 */
export async function shouldAIIntervene(
  recentTranscript: TranscriptSegment[],
  questionsAsked: number,
  totalQuestions: number
): Promise<{ shouldIntervene: boolean; message?: string }> {
  try {
    // Check for long silence (no speech in last 30 seconds)
    const lastSegment = recentTranscript[recentTranscript.length - 1];
    const timeSinceLastSpeech = Date.now() - lastSegment.timestamp;

    if (timeSinceLastSpeech > 30000) {
      return {
        shouldIntervene: true,
        message: 'Would you like to ask your next question?'
      };
    }

    // Check if off-topic (ask GPT-4)
    const recentText = recentTranscript.slice(-5).map(s => `${s.speaker}: ${s.text}`).join('\n');

    const prompt = `Is this conversation on-topic for a professional intro call, or is it random chitchat?

Recent conversation:
${recentText}

Questions remaining: ${totalQuestions - questionsAsked}

Return JSON: { "on_topic": true/false, "should_redirect": true/false, "message": "..." }`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    if (result.should_redirect) {
      return {
        shouldIntervene: true,
        message: result.message || "Let's return to the buyer's questions."
      };
    }

    return { shouldIntervene: false };
  } catch (error) {
    console.error('Error in AI intervention check:', error);
    return { shouldIntervene: false };
  }
}
