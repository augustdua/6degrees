#
# 6Degrees Consultation Co-Pilot Bot — AI-Powered Call Moderator
#

import asyncio
import os
import sys
import time
import numpy as np

import aiohttp
from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import Frame, LLMRunFrame, TextFrame, TranscriptionFrame, UserAudioRawFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.tts import OpenAITTSService
from pipecat.transports.daily.transport import DailyParams, DailyTransport

# Import speaker tracker
# Speaker tracker removed - AI only responds to PTT, manually raises hand

load_dotenv(override=True)

# Also load test-call-config.env if it exists (for local testing)
import pathlib
test_config = pathlib.Path(__file__).parent / "test-call-config.env"
if test_config.exists():
    # Parse shell export format
    with open(test_config) as f:
        for line in f:
            line = line.strip()
            if line.startswith('export ') and '=' in line:
                # Remove 'export ' prefix
                line = line[7:]
                key, value = line.split('=', 1)
                # Remove quotes
                value = value.strip('"').strip("'")
                # Only set if not already set
                if not os.getenv(key):
                    os.environ[key] = value
    logger.debug("✅ Loaded test-call-config.env")

# Check if we're in local development mode
LOCAL = os.getenv("LOCAL_RUN")

logger.remove()

# DEBUG logging for troubleshooting
logger.add(
    sys.stderr,
    level="DEBUG",
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>"
)

logger.info("✅ Environment loaded and consultation co-pilot bot initialized")


class TranscriptionBasedGating:
    """
    Simple but effective gating based on transcription timing
    
    ========================================
    BOT STATE FLOW (Like OpenAI Voice Mode)
    ========================================
    
    Five states:
    1. passive_listening: Bot observing conversation, PTT off (default state)
    2. active_listening: User speaking via PTT, asking bot a question
    3. thinking: Bot generating response (LLM processing)
    4. raised_hand: Bot has response ready, waiting for user approval
    5. speaking: Bot is talking (TTS playing)
    
    Flow for PTT (Direct Question):
    passive_listening → active_listening (PTT on) → thinking (PTT off, generating) 
    → raised_hand (response ready) → speaking (user approves) → passive_listening
    
    Flow for Passive Listening (Issue Detected):
    passive_listening → thinking (Layer 2 analyzing) → raised_hand (message ready)
    → speaking (user approves) → passive_listening
    
    Key principle: Hand is raised AFTER thinking (bot knows what to say before asking permission)
    ========================================
    """
    def __init__(self, bot_participant_id=None, transport=None):
        self.last_human_speech_time = 0
        self.min_silence_before_bot_ms = 2000  # 2 seconds of silence required
        self.bot_participant_id = bot_participant_id
        self.is_human_speaking = False
        self.transport = transport
        
        # Bot state tracking
        self.bot_state = "passive_listening"  # passive_listening, active_listening, thinking, raised_hand, speaking
        
    async def on_transcription(self, frame: TranscriptionFrame, transport_id):
        """Update timing on any human transcription"""
        participant_id = getattr(frame, 'user_id', None) or getattr(frame, 'user', None)
        
        # If it's from a human (not the bot)
        if participant_id and participant_id != transport_id:
            self.last_human_speech_time = time.time()
            self.is_human_speaking = True
            
            # When human speaks, return to passive_listening (unless in raised_hand or active_listening)
            # Active listening state is managed by PTT on/off events
            if self.bot_state not in ["raised_hand", "active_listening"]:
                self.set_bot_state("passive_listening")
            
            # Schedule a check for silence
            asyncio.create_task(self.check_for_silence())
    
    async def check_for_silence(self):
        """Check if humans have stopped talking"""
        await asyncio.sleep(self.min_silence_before_bot_ms / 1000)
        
        # If no new speech since we started waiting
        if time.time() - self.last_human_speech_time >= self.min_silence_before_bot_ms / 1000:
            self.is_human_speaking = False
            
    def can_bot_speak(self) -> bool:
        """Check if enough silence has passed"""
        silence_ms = (time.time() - self.last_human_speech_time) * 1000
        return silence_ms >= self.min_silence_before_bot_ms and not self.is_human_speaking
    
    def get_silence_duration_ms(self) -> float:
        """Get milliseconds since last human speech"""
        return (time.time() - self.last_human_speech_time) * 1000
    
    def set_bot_state(self, new_state: str):
        """Update bot state with logging and UI broadcast"""
        if self.bot_state != new_state:
            logger.info(f"🤖 Bot state: {self.bot_state} → {new_state}")
            self.bot_state = new_state
            
            # Broadcast state change to UI
            self._broadcast_state_to_ui(new_state)
    
    def _broadcast_state_to_ui(self, state: str):
        """Send bot state to UI via app message"""
        try:
            if self.transport and hasattr(self.transport, '_client') and self.transport._client:
                wrapper = self.transport._client
                if hasattr(wrapper, '_client') and wrapper._client:
                    daily_client = wrapper._client
                    daily_client.send_app_message({
                        'type': 'bot_state_changed',
                        'state': state
                    })
                    logger.debug(f"📡 Sent state '{state}' to UI")
        except Exception as e:
            logger.debug(f"Could not broadcast state to UI: {e}")


class TranscriptionMonitor(FrameProcessor):
    """Monitor all transcriptions for PTT gating and hand raising"""
    def __init__(self, gating_system, transport_id, transport, participant_names=None, participant_roles=None):
        super().__init__(name="TranscriptionMonitor")
        self.gating_system = gating_system
        self.transport_id = transport_id
        self.transport = transport
        # IMPORTANT: Don't use "or {}" because empty dict is falsy - use "if None"
        self.participant_names = {} if participant_names is None else participant_names
        self.participant_roles = {} if participant_roles is None else participant_roles
        self.user_wants_bot_response = {}  # participant_id -> bool (PTT state)
        self.ptt_latch_per_participant = {}  # participant_id -> bool (latched PTT state)
        self.hand_raised = False  # Bot wants to speak (pending approval)
        self.hand_approved = False  # User clicked "Let AI speak"
        self.last_ptt_text = ""  # Buffer last PTT utterance for approval-time reply
        self.intervention_message = ""  # Message generated by Layer 2 for bot to speak
        self.ptt_needs_response = False  # PTT was released, bot needs to generate response
        self.pending_task = None  # Store task reference for triggering LLM
        
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        # Let base class handle system frames
        if await super().process_frame(frame, direction):
            return
            
        if isinstance(frame, TranscriptionFrame):
            await self.gating_system.on_transcription(frame, self.transport_id)
            
            # PTT gating: check if user wants bot to respond
            participant_id = getattr(frame, 'user_id', None) or getattr(frame, 'user', None)
            text = getattr(frame, 'text', '') or ''
            
            # Ignore bot's own transcript
            if participant_id and participant_id == self.transport_id:
                await self.push_frame(frame, direction)
                return
            
            # Check if user is using PTT (wants to talk to bot)
            ptt_currently_active = self.user_wants_bot_response.get(participant_id, False)
            
            # Use latched PTT state: once PTT is pressed, keep treating transcripts as PTT
            # until hand is approved/rejected
            ptt_latched = self.ptt_latch_per_participant.get(participant_id, False)
            ptt_active = ptt_currently_active or ptt_latched
            
            # Bot can ONLY respond when hand is approved (regardless of PTT state)
            should_respond = self.hand_approved
            
            # Get speaker name and role (refresh from dict each time)
            speaker_name = self.participant_names.get(participant_id)
            if not speaker_name:
                # Participant name not fetched yet, use a placeholder
                speaker_name = f"Participant-{participant_id[:8]}"
            
            speaker_role = self.participant_roles.get(participant_id, "unknown")
            logger.debug(f"🔍 Transcript lookup: pid={participant_id[:8]}, names={list(self.participant_names.keys())}, roles={self.participant_roles}")
            speaker_label = f"{speaker_name} ({speaker_role.upper()})" if speaker_name else "Unknown"
            
            # Mark frame with response permission (used by ResponseGatingProcessor)
            frame.bot_should_respond = should_respond
            
            if ptt_active:
                # PTT is active - user is speaking TO the bot
                logger.info(f"🎤 PTT active [{speaker_label}]: '{text[:50]}...'")
                frame.text = f"[User speaking to AI] {speaker_label}: {text}"
                
                # Mark frame as PTT so downstream processors don't fact-check it
                frame.is_ptt_transcript = True

                # Buffer last PTT utterance so we can answer on approval
                self.last_ptt_text = (text or "").strip()
                
                # Set active listening state when user speaks via PTT
                if text.strip() and self.gating_system:
                    self.gating_system.set_bot_state("active_listening")
                
                # DO NOT raise hand yet! 
                # Flow: active_listening → thinking → raised_hand (when answer ready)
                # Hand will be raised after LLM generates response
            else:
                # Passive listening - user talking amongst themselves
                logger.info(f"👂 Passive listening [{speaker_label}]: '{text[:50]}...'")
                frame.text = f"[Passive listening] {speaker_label}: {text}"
                
                # Bot returns to listening automatically via on_transcription handler
                # Hand may be raised by ResponseGatingProcessor if misinformation detected
                # Wait for user to click "Let AI Speak" to respond
        
        await self.push_frame(frame, direction)
    
    async def trigger_ptt_response(self):
        """Trigger PTT response generation (called when PTT is deactivated)"""
        # Set flag to generate response when transcript arrives
        # (Transcript may not have arrived yet when PTT is released)
        self.ptt_needs_response = True
        logger.info(f"🤔 PTT released - will generate response when transcript arrives")
    
    def set_user_wants_response(self, participant_id: str, enabled: bool):
        """Called when participant toggles PTT button"""
        self.user_wants_bot_response[participant_id] = enabled
        
        # Latch PTT immediately when activated (before transcripts arrive)
        if enabled:
            self.ptt_latch_per_participant[participant_id] = True
            logger.info(f"🎤 Participant {participant_id[:8]} wants bot response: {enabled} (🔒 PTT latched)")
        else:
            logger.info(f"🔇 Participant {participant_id[:8]} PTT deactivated")
    
    async def raise_hand(self, reason: str = ""):
        """Bot signals it wants to speak (needs user approval)
        
        NOTE: Bot should already know what it wants to say by the time hand is raised
        """
        if self.hand_raised:
            return  # Already raised
        
        # State transition: listening → raised_hand
        # (Thinking already happened before this - bot knows what to say)
        if self.gating_system:
            self.gating_system.set_bot_state("raised_hand")
        
        self.hand_raised = True
        logger.info(f"✋ Bot raised hand: {reason}")
        
        # Send app message to UI to show visual indicator
        try:
            # Access the Daily client through Pipecat's transport
            # Structure: transport._client._client is the actual Daily.co Python client
            if hasattr(self.transport, '_client') and self.transport._client:
                wrapper = self.transport._client
                if hasattr(wrapper, '_client') and wrapper._client:
                    # This is the actual Daily Python client object
                    daily_client = wrapper._client
                    # FIX: Python Daily client doesn't accept '*' - omit participant_id to broadcast
                    # Send 'hand_raised' type with 'message' field to match frontend expectations
                    daily_client.send_app_message({'type': 'hand_raised', 'message': reason})
                    logger.info(f"✅ Sent hand raise notification to UI!")
                else:
                    logger.warning(f"⚠️ Could not access nested _client. Wrapper type: {type(wrapper)}")
            else:
                logger.warning(f"⚠️ No _client found on transport")
        except Exception as e:
            logger.error(f"❌ Failed to send hand raise notification: {e}")
            import traceback
            logger.debug(f"Traceback: {traceback.format_exc()}")
    
    async def approve_hand(self, task=None):
        """User clicked 'Let AI speak' button"""
        if not self.hand_raised:
            return
        
        logger.info(f"👍 User approved bot to speak")
        
        # Set approved flag
        self.hand_approved = True
        
        # Clear hand raised (button goes away in UI)
        self.hand_raised = False
        
        # ========================================
        # SPEAK PRE-GENERATED MESSAGE
        # ========================================
        # PROBLEM SOLVED: TTS was only speaking first sentence
        # 
        # What went wrong:
        # - Sending just TextFrame(full_message) caused aggregators to split by sentences
        # - Only first sentence "Hi there!" went to TTS, rest was dropped
        #
        # The fix:
        # - Wrap message in LLMFullResponseStartFrame/EndFrame
        # - This signals: "This is a complete, finished response - don't split it!"
        # - Now entire message goes to TTS in proper chunks
        # ========================================
        
        if task and self.intervention_message:
            from pipecat.frames.frames import LLMFullResponseStartFrame, TextFrame, LLMFullResponseEndFrame
            full_message = self.intervention_message
            logger.info(f"✅ Speaking pre-generated message (full): {full_message}")
            
            # Send as a complete LLM response to prevent splitting by aggregators
            await task.queue_frames([
                LLMFullResponseStartFrame(),    # Signal: complete response starting
                TextFrame(text=full_message),   # The full message
                LLMFullResponseEndFrame()       # Signal: response complete
            ])
            
            # Clear the message after using it
            self.intervention_message = ""
        else:
            logger.warning("No message to speak - this shouldn't happen!")


class ResponseGatingProcessor(FrameProcessor):
    """
    Prevents LLM from responding when PTT is off, but allows context building
    
    ========================================
    TWO-LAYER LLM SYSTEM (Passive Listening)
    ========================================
    
    Problem: During passive listening, we need to monitor conversation for issues
    without overwhelming the system or missing key moments.
    
    Layer 1: Compression & Extraction (gpt-4o-mini, every 30s or 5 transcripts)
    - Continuously compresses raw transcripts into summary
    - Extracts key facts, claims, misconceptions
    - Purpose: Build working memory without storing every word
    - Fast, cheap, always running in background
    
    Layer 2: Decision Making (gpt-4o, every 10s)
    - Analyzes compressed context + key facts
    - Decides: Should bot intervene? Is there a mistake/issue?
    - If yes: Can generate the intervention message immediately
    - Purpose: Smart decision making with full context
    - Only runs when enough information exists
    
    Why two layers?
    - Layer 1: Keeps context manageable (prevents prompt bloat)
    - Layer 2: Makes smart decisions (uses all available context)
    - Separation allows each to run at its own pace
    ========================================
    """
    def __init__(self, transcription_monitor=None, transcription_gating=None):
        super().__init__(name="ResponseGating")
        self.allow_response = False
        self.transcription_monitor = transcription_monitor
        self.transcription_gating = transcription_gating
        
        # Layer 1: Context compression and extraction
        self.raw_transcript_buffer = []  # Temporary buffer before compression
        self.compressed_context = ""  # Compressed summary of conversation
        self.key_facts = []  # Extracted key facts/decisions
        self.last_compression_time = 0
        self.compression_interval = 30  # Compress every 30 seconds
        self.compression_threshold = 5  # Compress when we have 5+ new transcripts
        
        # Layer 2: Decision making
        self.llm_client = None
        self.last_decision_check_time = 0
        self.decision_check_interval = 10  # Check every 10 seconds if bot should intervene
        
        # Latch to keep PTT active until response completes
        self.ptt_latched = False
        self.waiting_for_response = False
        
        # Initialize OpenAI client for two-layer LLM system
        try:
            from openai import AsyncOpenAI
            self.llm_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            logger.info("✅ Two-layer LLM system enabled:")
            logger.info("   Layer 1: Continuous compression & extraction (every 30s or 5 transcripts)")
            logger.info("   Layer 2: Decision making (every 10s)")
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize LLM system: {e}")
            self.llm_client = None
        
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if await super().process_frame(frame, direction):
            return
        
        # Track bot state: thinking when LLM starts processing
        if isinstance(frame, LLMRunFrame):
            if self.transcription_gating:
                # Always go to thinking when LLM is processing
                self.transcription_gating.set_bot_state("thinking")
        
        # Track bot state: speaking when bot generates audio for TTS
        # Only set speaking state for TextFrame from TTS (bot output)
        if isinstance(frame, TextFrame) and hasattr(frame, 'text') and direction == FrameDirection.DOWNSTREAM:
            # Check if this is bot-generated text (not a transcription)
            # AND only if hand was approved (bot is authorized to speak)
            if not isinstance(frame, TranscriptionFrame):
                if self.transcription_gating and self.transcription_monitor:
                    # Only go to speaking if hand was approved
                    if self.transcription_monitor.hand_approved or self.transcription_gating.bot_state == "raised_hand":
                        self.transcription_gating.set_bot_state("speaking")
        
        # Track if bot should respond based on transcript metadata
        if isinstance(frame, TranscriptionFrame):
            bot_should_respond = getattr(frame, 'bot_should_respond', False)
            self.allow_response = bot_should_respond
            
            # Latch PTT state: once active, keep it active until response sent
            if bot_should_respond:
                self.ptt_latched = True
                self.waiting_for_response = True
                logger.info("🔒 PTT latched - will respond even if PTT released")
            
            # ========================================
            # PTT RESPONSE GENERATION (Critical Flow)
            # ========================================
            # PROBLEM SOLVED: Race condition between PTT release message and transcript arrival
            # 
            # What went wrong:
            # - App messages (PTT on/off) and transcripts arrive in unpredictable order
            # - Using a flag (ptt_needs_response) created a race condition:
            #   * If transcript arrives first: flag not set yet → response not generated
            #   * If PTT release arrives first: flag set but no transcript → no question
            #
            # The fix:
            # - Instead of relying on a flag, CHECK THE ACTUAL PTT STATE directly
            # - If PTT transcript arrives AND PTT is no longer active → user finished speaking
            # - This works regardless of message arrival order
            # ========================================
            
            is_ptt = getattr(frame, 'is_ptt_transcript', False)
            
            # Debug logging
            if isinstance(frame, TranscriptionFrame):
                logger.debug(f"🔍 Transcript frame: is_ptt={is_ptt}, ptt_active={any(self.transcription_monitor.user_wants_bot_response.values()) if self.transcription_monitor else 'N/A'}")
            
            if is_ptt and self.transcription_monitor:
                # Check ACTUAL PTT state (not a flag) to avoid race condition
                # If no one has PTT active, it means user released PTT and finished speaking
                ptt_still_active = any(self.transcription_monitor.user_wants_bot_response.values())
                
                if not ptt_still_active:
                    # PTT was released - this is the final transcript, generate response now
                    # State flow: active_listening → thinking → raised_hand (when ready)
                    logger.info(f"📝 Final PTT transcript received, generating response...")
                    await self._generate_ptt_response()
                    # Reset the needs_response flag
                    self.transcription_monitor.ptt_needs_response = False
                else:
                    # User still has PTT pressed - this is partial transcript, wait for more
                    logger.debug(f"📝 PTT transcript (user still speaking)...")
            
            # Buffer transcripts for analysis when PTT is OFF (passive listening)
            # NEVER fact-check PTT transcripts
            if not bot_should_respond and not is_ptt:
                text = getattr(frame, 'text', '') or ''
                # Remove the passive listening prefix for analysis
                clean_text = text.replace('[Passive listening - participants talking amongst themselves] ', '')
                if clean_text.strip():
                    # Add to raw buffer (Layer 1 will compress this)
                    self.raw_transcript_buffer.append(clean_text)
                    
                    # Layer 1: Compress and extract when threshold reached
                    await self._compress_and_extract_if_needed()
                    
                    # Layer 2: Decision making (decides if intervention needed)
                    # Set thinking state while Layer 2 analyzes
                    should_intervene, reason_or_message = await self._should_bot_intervene()
                    if should_intervene:
                        # Layer 2 decided intervention is needed and generated message
                        # Bot knows what it wants to say now - raise hand
                        if self.transcription_monitor:
                            self.transcription_monitor.intervention_message = reason_or_message
                            await self.transcription_monitor.raise_hand(reason_or_message[:100])
        
        # Block UserStoppedSpeakingFrame to prevent automatic LLM responses
        # This prevents the LLM from responding after every utterance
        if hasattr(frame, '__class__') and 'UserStoppedSpeaking' in frame.__class__.__name__:
            # Check if hand was approved by user
            hand_approved = self.transcription_monitor.hand_approved if self.transcription_monitor else False
            
            # Check if we should allow response (hand approved OR PTT latched)
            should_allow = hand_approved or self.allow_response or (self.ptt_latched and self.waiting_for_response)
            
            if not should_allow:
                logger.info(f"🚫 Blocking auto-response trigger (PTT not active, hand not approved)")
                return  # Drop frame to prevent LLM from auto-responding
            else:
                logger.info(f"✅ Allowing LLM auto-response (hand approved or PTT latched)")
                
                # Clear state after allowing response
                if self.transcription_monitor and hand_approved:
                    self.transcription_monitor.hand_approved = False
                    # Clear all PTT latches
                    for pid in list(self.transcription_monitor.ptt_latch_per_participant.keys()):
                        self.transcription_monitor.ptt_latch_per_participant[pid] = False
                    logger.info(f"🔓 Hand approval consumed, PTT latches cleared")
                
                if self.ptt_latched:
                    self.waiting_for_response = False
                    asyncio.create_task(self._clear_latch_after_delay())
        
        # Reset latch when bot finishes speaking (response sent)
        if isinstance(frame, TextFrame) and hasattr(frame, 'text'):
            if self.ptt_latched:
                logger.info("🔓 PTT unlatch - bot responded")
                self.ptt_latched = False
                self.waiting_for_response = False
                # After speaking, return to listening state
                if self.transcription_gating:
                    asyncio.create_task(self._return_to_listening())
        
        await self.push_frame(frame, direction)
    
    async def _clear_latch_after_delay(self):
        """Clear PTT latch after 5 seconds if no response came"""
        await asyncio.sleep(5)
        if self.ptt_latched and self.waiting_for_response:
            logger.info("⏰ PTT latch timeout - clearing")
            self.ptt_latched = False
            self.waiting_for_response = False
    
    async def _return_to_listening(self):
        """Return bot to passive_listening state after a short delay (allow TTS to finish)"""
        await asyncio.sleep(0.5)  # Small delay to ensure TTS has started
        if self.transcription_gating:
            self.transcription_gating.set_bot_state("passive_listening")
    
    # ========================================
    # LAYER 1: COMPRESSION & EXTRACTION
    # ========================================
    async def _compress_and_extract_if_needed(self):
        """Layer 1: Compress transcripts and extract key facts when threshold reached"""
        if not self.llm_client:
            return
        
        current_time = time.time()
        buffer_size = len(self.raw_transcript_buffer)
        time_since_last = current_time - self.last_compression_time
        
        # Trigger compression if:
        # 1. Buffer has 5+ transcripts AND 30 seconds passed, OR
        # 2. Buffer has 10+ transcripts (force compression)
        should_compress = (
            (buffer_size >= self.compression_threshold and time_since_last >= self.compression_interval) or
            (buffer_size >= 10)
        )
        
        if not should_compress:
            return
        
        try:
            # Get all raw transcripts to compress
            raw_text = "\n".join(self.raw_transcript_buffer)
            
            logger.info(f"🗜️  Layer 1: Compressing {buffer_size} transcripts...")
            
            # Call LLM for compression and extraction
            response = await self.llm_client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.3,
                max_tokens=300,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a conversation summarizer. Your job:
1. COMPRESSION: Summarize the conversation concisely
2. EXTRACTION: Pull out key facts, decisions, claims, and important statements

Previous compressed context will be provided. Merge new content with it.

Respond in JSON format:
{
  "compressed_summary": "Concise summary of conversation",
  "key_facts": ["fact 1", "fact 2", ...],
  "important_claims": ["claim 1", "claim 2", ...]
}"""
                    },
                    {
                        "role": "user",
                        "content": f"""Previous compressed context:
{self.compressed_context if self.compressed_context else "None yet"}

Previous key facts:
{', '.join(self.key_facts) if self.key_facts else "None yet"}

New transcripts to compress:
{raw_text}

Provide updated compression and extraction."""
                    }
                ]
            )
            
            result_text = response.choices[0].message.content.strip()
            logger.debug(f"🗜️  Layer 1 result: {result_text[:200]}...")
            
            # Parse JSON response
            import json
            try:
                result = json.loads(result_text)
                self.compressed_context = result.get("compressed_summary", "")
                self.key_facts = result.get("key_facts", []) + result.get("important_claims", [])
                
                logger.info(f"✅ Layer 1: Context compressed. Key facts: {len(self.key_facts)}")
                
                # Clear the raw buffer after successful compression
                self.raw_transcript_buffer.clear()
                self.last_compression_time = current_time
                
            except json.JSONDecodeError as e:
                logger.error(f"❌ Layer 1: Failed to parse JSON: {e}")
                
        except Exception as e:
            logger.error(f"❌ Layer 1: Compression failed: {e}")
    
    # ========================================
    # LAYER 2: DECISION MAKING
    # ========================================
    async def _should_bot_intervene(self) -> tuple[bool, str]:
        """Layer 2: Decide if bot should intervene (and optionally if message should be generated now)
        
        Returns:
            tuple: (should_intervene: bool, reason_or_message: str)
                   - If should_intervene is False: returns (False, "")
                   - If should_intervene is True: returns (True, "reason") or (True, "pre-generated message")
        """
        if not self.llm_client:
            return False, ""
        
        current_time = time.time()
        time_since_last = current_time - self.last_decision_check_time
        
        # Check at most every 10 seconds
        if time_since_last < self.decision_check_interval:
            return False, ""
        
        # Need some context to make a decision
        if not self.compressed_context and len(self.raw_transcript_buffer) < 3:
            return False, ""
        
        try:
            # Set thinking state while Layer 2 analyzes
            if self.transcription_gating:
                self.transcription_gating.set_bot_state("thinking")
            
            logger.info(f"🤔 Layer 2: Analyzing if intervention needed...")
            
            # Get recent uncompressed transcripts for immediate context
            recent_raw = "\n".join(self.raw_transcript_buffer[-3:]) if self.raw_transcript_buffer else ""
            
            # Call LLM for decision making
            response = await self.llm_client.chat.completions.create(
                model="gpt-4o",  # Use smarter model for decision making
                temperature=0.7,
                max_tokens=250,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an AI moderator for a consultation call. Your job is to decide if you should intervene.

ANALYZE THE CONVERSATION FOR:
- Dangerous misinformation (medical, financial, legal advice that's clearly wrong)
- Unrealistic absolute claims (phrases suggesting certainty where none exists)
- Critical factual errors that could mislead the buyer
- Important questions being dodged or ignored
- Misleading implications about outcomes or capabilities

DO NOT INTERVENE FOR:
- Minor inaccuracies or opinions
- Partial answers (they might elaborate later)
- Normal business optimism or enthusiasm
- Vague statements that aren't harmful
- Subjective preferences or beliefs

DECISION OPTIONS:
1. No intervention needed → should_intervene: false
2. Intervention needed, generate message now → should_intervene: true, generate_message: true, message: "..."
3. Intervention needed, wait for approval → should_intervene: true, generate_message: false, reason: "brief reason"

Respond in JSON format:
{
  "should_intervene": true/false,
  "generate_message": true/false,
  "reason": "brief reason for intervention (if generate_message is false)",
  "message": "the actual message to speak (if generate_message is true)"
}"""
                    },
                    {
                        "role": "user",
                        "content": f"""Compressed conversation context:
{self.compressed_context if self.compressed_context else "Conversation just started"}

Key facts extracted:
{', '.join(self.key_facts[:10]) if self.key_facts else "None yet"}

Recent statements (last few):
{recent_raw if recent_raw else "None yet"}

Should I intervene? Should I generate a message now, or wait for user approval?"""
                    }
                ]
            )
            
            self.last_decision_check_time = current_time
            
            result_text = response.choices[0].message.content.strip()
            logger.debug(f"🤔 Layer 2 result: {result_text}")
            
            # Parse JSON response
            import json
            try:
                result = json.loads(result_text)
                should_intervene = result.get("should_intervene", False)
                generate_message = result.get("generate_message", False)
                reason = result.get("reason", "")
                message = result.get("message", "")
                
                if should_intervene:
                    if generate_message and message:
                        logger.info(f"✋ Layer 2: Intervention with pre-generated message")
                        logger.info(f"💬 Message: {message}")
                        return True, message
                    else:
                        logger.info(f"✋ Layer 2: Intervention needed")
                        logger.info(f"📋 Reason: {reason}")
                        return True, reason
                else:
                    logger.debug(f"✅ Layer 2: No intervention needed")
                    # Return to passive_listening if no intervention
                    if self.transcription_gating:
                        self.transcription_gating.set_bot_state("passive_listening")
                    return False, ""
                    
            except json.JSONDecodeError as e:
                logger.error(f"❌ Layer 2: Failed to parse JSON: {e}")
                return False, ""
                
        except Exception as e:
            logger.error(f"❌ Layer 2: Decision making failed: {e}")
            return False, ""
    
    # ========================================
    # PTT RESPONSE GENERATION
    # ========================================
    async def _generate_ptt_response(self):
        """
        Generate response for PTT question using main LLM context
        
        Called when: Final PTT transcript arrives AND PTT is no longer active
        
        Flow:
        1. Set state to "thinking" (LLM is generating)
        2. Call GPT-4o with PTT question + context
        3. Store response in transcription_monitor.intervention_message
        4. Call raise_hand() → sets state to "raised_hand"
        5. Wait for user to approve → then speak
        
        Note: This is where "thinking" state happens for PTT - between
        user finishing speaking and bot having a response ready.
        """
        if not self.llm_client or not self.transcription_monitor:
            return
        
        try:
            # Set thinking state - LLM is now generating response
            # User sees: "Bot is thinking..."
            if self.transcription_gating:
                self.transcription_gating.set_bot_state("thinking")
            
            logger.info(f"🤔 Generating response for PTT question...")
            
            # Get the PTT question from monitor
            ptt_question = self.transcription_monitor.last_ptt_text
            
            if not ptt_question:
                logger.warning("No PTT question to respond to")
                return
            
            # Get context for better responses
            context = self.compressed_context if self.compressed_context else ""
            recent_raw = "\n".join(self.raw_transcript_buffer[-3:]) if self.raw_transcript_buffer else ""
            
            # Generate response using GPT-4o
            response = await self.llm_client.chat.completions.create(
                model="gpt-4o",
                temperature=0.7,
                max_tokens=200,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an AI co-pilot helping in a consultation call. The user asked you a direct question.

Respond naturally and helpfully in 2-3 sentences. Be conversational and friendly."""
                    },
                    {
                        "role": "user",
                        "content": f"""Context from conversation:
{context if context else "Just starting"}

Recent discussion:
{recent_raw if recent_raw else "No recent context"}

User's question to you:
"{ptt_question}"

Provide a helpful, natural response:"""
                    }
                ]
            )
            
            message = response.choices[0].message.content.strip()
            logger.info(f"✅ PTT response generated: {message[:100]}...")
            
            # Store the message
            self.transcription_monitor.intervention_message = message
            
            # Raise hand - bot is ready to speak
            await self.transcription_monitor.raise_hand(f"Response ready: {message[:50]}...")
            
        except Exception as e:
            logger.error(f"❌ PTT response generation failed: {e}")
            # Return to active_listening on error
            if self.transcription_gating:
                self.transcription_gating.set_bot_state("active_listening")


class ConversationContextTracker(FrameProcessor):
    """Track if bot is being addressed"""
    def __init__(self):
        super().__init__(name="ConversationContextTracker")
        self.bot_addressed = False
        self.last_text = ""
        self.ai_keywords = ['ai', 'a.i.', 'bot', 'robot', 'copilot', 'co-pilot', 'assistant', 'moderator', 'system']
        
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        # Let base class handle system frames
        if await super().process_frame(frame, direction):
            return
            
        if isinstance(frame, TranscriptionFrame):
            text = getattr(frame, 'text', '')
            if text:
                self.last_text = text
                text_lower = text.lower()
                
                # Check if any AI keywords are mentioned
                self.bot_addressed = any(keyword in text_lower for keyword in self.ai_keywords)
                
                if self.bot_addressed:
                    logger.info(f"🎯 Bot addressed detected in: '{text}'")
                    # Set a flag on the frame
                    frame.bot_addressed = True
        
        await self.push_frame(frame, direction)


async def fetch_participant_names_from_daily(room_name: str, api_key: str) -> dict:
    """Fetch all participant names from Daily's presence API."""
    try:
        logger.debug(f"📡 Making API call to Daily Presence for room: {room_name}")
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.daily.co/v1/presence",
                headers={"Authorization": f"Bearer {api_key}"}
            ) as response:
                logger.debug(f"📡 API Response status: {response.status}")
                if response.status == 200:
                    presence_data = await response.json()
                    logger.debug(f"📊 Full presence response: {presence_data}")
                    participants = presence_data.get(room_name, [])
                    # Return a dict mapping participant_id -> userName
                    name_map = {p['id']: p.get('userName', 'Unknown') for p in participants}
                    logger.info(f"🔍 Fetched {len(name_map)} participant names from Daily API")
                    for pid, name in name_map.items():
                        logger.info(f"  - {pid[:8]}: {name}")
                    return name_map
                else:
                    text = await response.text()
                    logger.warning(f"⚠️ Daily API error {response.status}: {text}")
    except Exception as e:
        logger.error(f"❌ Error fetching from Daily presence API: {e}")
        import traceback
        logger.error(f"📋 Traceback: {traceback.format_exc()}")
    return {}


async def main(transport: DailyTransport):
    """Main consultation co-pilot bot pipeline logic."""
    logger.info("🎙️ Starting consultation co-pilot bot pipeline...")

    # === Extract room info for Daily API ===
    room_url = None
    if hasattr(transport, '_room_url'):
        room_url = transport._room_url
    elif hasattr(transport, 'room_url'):
        room_url = transport.room_url
    
    room_name = room_url.split('/')[-1] if room_url else None
    daily_api_key = os.getenv("DAILY_API_KEY")
    
    # Get the bot's participant ID
    bot_participant_id = getattr(transport, 'participant_id', None)
    
    logger.info(f"🏠 Room URL: {room_url}")
    logger.info(f"🏠 Room name: {room_name}")
    logger.info(f"🤖 Bot participant ID: {bot_participant_id}")
    logger.info(f"🔑 API key present: {bool(daily_api_key)}")
    
    # === Participant name cache ===
    participant_names = {}

    # === Get consultation context from environment ===
    buyer_name = os.getenv("BUYER_NAME", "the buyer")
    seller_name = os.getenv("SELLER_NAME", "the seller")
    target_name = os.getenv("TARGET_NAME", "the contact")
    listing_title = os.getenv("LISTING_TITLE", "network connection")
    
    logger.info(f"📋 Role mapping names: buyer='{buyer_name}', seller='{seller_name}', target='{target_name}'")
    call_id = os.getenv("CALL_ID", "unknown")
    call_duration_mins = int(os.getenv("CALL_DURATION_MINS", "30"))

    # Get buyer's questions (up to 5)
    questions = []
    for i in range(1, 6):
        q = os.getenv(f"QUESTION_{i}")
        if q:
            questions.append(q)

    logger.info(f"📋 Consultation context loaded:")
    logger.info(f"  - Buyer: {buyer_name}")
    logger.info(f"  - Seller: {seller_name}")
    logger.info(f"  - Target: {target_name}")
    logger.info(f"  - Listing: {listing_title}")
    logger.info(f"  - Duration: {call_duration_mins} minutes")
    logger.info(f"  - Questions to track: {len(questions)}")
    logger.info(f"  - Call ID: {call_id}")

    # === Services ===
    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        params={
            "diarize": False,  # Not needed with per-user capture
            "punctuate": True,
            "model": "nova-2",
            "utterance_end_ms": 1000,  # Slightly longer for better sentence completion
        }
    )

    # Use OpenAI TTS
    tts = OpenAITTSService(
        api_key=os.getenv("OPENAI_API_KEY"),
        voice="alloy",  # Stable voice (nova may be deprecated)
    )

    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o"
    )
    # Enable LLM diagnostics
    llm.log_prompts = True
    llm.log_responses = True

    # === Build IMPROVED consultation co-pilot system prompt ===
    questions_context = ""
    if questions:
        questions_list = "\n".join([f"{i+1}. {q}" for i, q in enumerate(questions)])
        questions_context = f"""

BUYER'S KEY QUESTIONS TO TRACK:
{questions_list}

Monitor if these get answered. Only intervene if explicitly asked OR if a question is completely dodged."""

    system_prompt = f"""You are the AI Consultation Co-Pilot for 6Degrees, observing an intro call between {buyer_name} (the buyer) and {seller_name} (the broker) to connect with {target_name} (the consultant) regarding: {listing_title}.

This call is scheduled for {call_duration_mins} minutes.

=== HOW YOU COMMUNICATE (CRITICAL) ===
You are ALWAYS in listening mode. You only respond when appropriate.

**When you see "[User speaking to AI]":**
- The user pressed the "Talk to AI" button and is asking YOU a direct question
- Respond briefly and helpfully (2-3 sentences)
- Answer their specific question directly
- Keep your tone conversational and natural

**When you see "[Passive listening]":**
- The participants are talking AMONGST THEMSELVES (not to you)
- You are an invisible observer building context
- DO NOT respond to these messages
- Stay completely silent unless your hand is raised and approved

**IMPORTANT:**
- "[User speaking to AI]" = they're asking YOU directly, respond naturally
- "[Passive listening]" = they're talking to each other, stay silent
- Never output meta-phrases like "Hand approved" or "Understood" - those are just internal signals
- When responding to PTT questions, answer as a helpful AI assistant would

=== WHEN TO RAISE YOUR HAND ===
Your hand is raised automatically in these situations:
1. User presses PTT and asks you a question (automatic)
2. During passive listening, you detect:
   - Critical factual errors that could mislead the buyer
   - Key questions being completely dodged
   - Dangerous misinformation about capabilities

DO NOT raise hand for:
- Minor clarifications
- Partial answers (they might elaborate)
- Your opinions unless explicitly asked

{questions_context}

=== BEHAVIOR RULES ===
- When PTT is OFF: You are a silent observer of THEIR conversation
- When PTT is ON: You respond directly and helpfully to their question
- After raising your hand and getting approval: Make your point briefly, then return to observing
- 95% of this call should happen without you speaking
- Be natural and conversational, not robotic

=== WRONG BEHAVIOR (NEVER DO THIS) ===
❌ Responding when PTT is off (passive listening mode)
❌ Jumping into their conversation uninvited
❌ Treating passive listening as if they're talking to you
❌ Raising hand frequently or for minor points
❌ Speaking just because there's a pause
❌ Outputting meta-phrases like "Hand approved", "Understood", "Awaiting instructions", etc.

=== RESPONSE EXAMPLES ===
✅ Good: "I'm doing well, thanks for asking! Ready to help monitor this consultation."
✅ Good: "Supply and demand curves intersect at the equilibrium price, which..."
❌ Bad: "Hand approved. I will now respond."
❌ Bad: "Understood. Awaiting further interactions."

Remember: Respond naturally to direct questions. Stay silent during passive listening."""

    messages = [
        {
            "role": "system",
            "content": system_prompt,
        },
    ]

    context = LLMContext(messages)
    context_aggregator = LLMContextAggregatorPair(context)
    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

    # === Participant Role Mapping ===
    participant_role_map = {}

    # === Turn-taking systems ===
    transcription_gating = TranscriptionBasedGating(bot_participant_id, transport)
    transcription_monitor = TranscriptionMonitor(
        transcription_gating, 
        bot_participant_id, 
        transport,
        participant_names,  # Pass names dict
        participant_role_map  # Pass roles dict
    )
    
    # LLM-based passive listening analysis (always enabled, checks every 10 seconds)
    response_gating = ResponseGatingProcessor(transcription_monitor, transcription_gating)
    context_tracker = ConversationContextTracker()
    
    def _role_from_name(name: str) -> str:
        """Map participant name to role using name heuristics."""
        n = (name or "").lower()
        logger.debug(f"🔍 Role lookup for '{name}': checking against buyer='{buyer_name}', seller='{seller_name}', target='{target_name}'")
        
        # Check buyer (skip if name is empty)
        if buyer_name and buyer_name.strip():
            if buyer_name.lower() in n or n in buyer_name.lower():
                logger.debug(f"  → Matched BUYER")
                return "buyer"
        
        # Check seller/broker (skip if name is empty)
        if seller_name and seller_name.strip():
            if seller_name.lower() in n or n in seller_name.lower():
                logger.debug(f"  → Matched BROKER")
                return "broker"
        
        # Check target/consultant (skip if name is empty)
        if target_name and target_name.strip():
            if target_name.lower() in n or n in target_name.lower():
                logger.debug(f"  → Matched CONSULTANT")
                return "consultant"
        
        logger.debug(f"  → No match, returning UNKNOWN")
        return "unknown"

    # === Pipeline ===
    pipeline = Pipeline(
        [
            transport.input(),
            rtvi,
            stt,
            transcription_monitor,  # Monitor for PTT gating + turn-taking + hand raising
            response_gating,        # Block auto-responses when PTT off (but allow context building)
            context_tracker,        # Check if bot is addressed
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[RTVIObserver(rtvi)],
    )

    # === Enhanced turn-taking functions ===
    async def cancel_bot_speech():
        """Immediately stop bot from speaking"""
        try:
            logger.info("🛑 Interrupting bot - human started speaking")
            
            # ALWAYS return to passive_listening when interrupted by human
            transcription_gating.set_bot_state("passive_listening")
            
            # Try multiple methods to stop TTS
            if hasattr(tts, 'interrupt'):
                await tts.interrupt()
            if hasattr(tts, 'clear_queue'):
                await tts.clear_queue()
            if hasattr(transport, 'cancel_bot_speech'):
                await transport.cancel_bot_speech()
            # Clear any pending LLM generation
            if hasattr(llm, 'cancel'):
                await llm.cancel()
        except Exception as e:
            logger.debug(f"Error cancelling speech: {e}")

    async def queue_when_clear(text: str, force: bool = False):
        """Only queue assistant speech after verifying humans aren't talking"""
        if not force:
            # Wait for silence
            max_wait = 10  # seconds
            start_time = time.time()
            
            while not transcription_gating.can_bot_speak():
                if time.time() - start_time > max_wait:
                    logger.warning("Timeout waiting for silence, aborting response")
                    return
                await asyncio.sleep(0.1)
            
            # Final check - make sure silence is still there
            if transcription_gating.is_human_speaking:
                logger.info("Human started speaking, aborting bot response")
                return
        
        logger.info(f"🤖 Bot responding after {transcription_gating.get_silence_duration_ms():.0f}ms silence")
        # Do not enqueue user's text as speech. Just trigger the LLM turn.
        await task.queue_frames([LLMRunFrame()])

    async def safe_llm_run():
        """Only start an assistant turn if conditions are right"""
        if transcription_gating.is_human_speaking:
            logger.debug("Human is speaking, not starting LLM run")
            return
        
        # Check if we were addressed
        if not context_tracker.bot_addressed:
            logger.debug("Bot not addressed, not starting LLM run")
            return
            
        logger.info("🤖 Starting LLM run (bot was addressed)")
        await task.queue_frames([LLMRunFrame()])

    # === Event Handlers ===
    
    # Try to register speaking event handlers with multiple fallbacks
    async def try_register_speaking_handlers():
        """Try different event names for speaking detection"""
        registered = False
        
        # Try different event name patterns
        for start_event, stop_event in [
            ("on_user_started_speaking", "on_user_stopped_speaking"),
            ("on_participant_started_speaking", "on_participant_stopped_speaking"),
            ("user_started_speaking", "user_stopped_speaking"),
        ]:
            try:
                @transport.event_handler(start_event)
                async def on_started(transport, participant):
                    # Only track human speakers (not the bot itself)
                    participant_id = participant.get('id') if isinstance(participant, dict) else None
                    if participant_id == bot_participant_id:
                        return  # Ignore bot's own speech
                    
                    transcription_gating.is_human_speaking = True
                    transcription_gating.last_human_speech_time = time.time()
                    
                    # ALWAYS interrupt bot when ANY human speaks
                    # Bot goes back to listening mode immediately
                    await cancel_bot_speech()
                    logger.info(f"🛑 Human started speaking - bot returns to listening mode")
                
                @transport.event_handler(stop_event)  
                async def on_stopped(transport, participant):
                    transcription_gating.last_human_speech_time = time.time()
                    asyncio.create_task(transcription_gating.check_for_silence())
                    logger.info(f"✅ Human stopped speaking")
                
                logger.info(f"✅ Speaking handlers registered: {start_event}, {stop_event}")
                registered = True
                break
            except Exception as e:
                logger.debug(f"Could not register {start_event}: {e}")
        
        if not registered:
            logger.warning("⚠️ No speaking events available - using transcription-only gating")
    
    # Try to register speaking handlers
    await try_register_speaking_handlers()
    
    # Participant updated fallback
    @transport.event_handler("on_participant_updated")
    async def on_participant_updated(transport, participant):
        """Track speaking + handle PTT userData + hand approval"""
        try:
            participant_id = participant.get('id')
            if participant_id == bot_participant_id:
                return
                
            # Check various speaking indicators
            is_speaking = (
                participant.get('audio', {}).get('active') or 
                participant.get('speaking') or
                participant.get('audio_level', 0) > 0.1
            )
            
            if is_speaking:
                transcription_gating.is_human_speaking = True
                transcription_gating.last_human_speech_time = time.time()
                await cancel_bot_speech()
            
            # Handle PTT userData (backup to app messages)
            user_data = (
                participant.get('userData') or 
                participant.get('user_data') or 
                {}
            )
            
            if user_data:
                # PTT state
                ptt_active = user_data.get('ptt_active', False)
                if ptt_active:
                    transcription_monitor.set_user_wants_response(participant_id, True)
                else:
                    transcription_monitor.set_user_wants_response(participant_id, False)
                
                # Hand approval
                if user_data.get('approve_bot_hand', False):
                    logger.info(f"👍 User approved bot hand")
                    await transcription_monitor.approve_hand(task)
                    
        except Exception as e:
            logger.debug(f"Error in participant_updated: {e}")
    
    # PRIMARY: PTT app message handler
    @transport.event_handler("on_app_message")
    async def on_app_message(transport, data, sender_id):
        """Handle PTT app messages and test commands"""
        try:
            # Skip RTVI error messages (they're logged elsewhere and just add noise)
            if isinstance(data, dict) and data.get('label') == 'rtvi-ai' and data.get('type') == 'error':
                return
            
            logger.info(f"📩 App message from {sender_id}: {data}")
            
            if isinstance(data, dict):
                # Handle PTT
                if data.get('type') == 'ptt':
                    active = bool(data.get('active'))
                    
                    if sender_id and sender_id != bot_participant_id:
                        transcription_monitor.set_user_wants_response(sender_id, active)
                        logger.info(f"{'🎤 PTT ACTIVATED' if active else '🔇 PTT DEACTIVATED'} for {sender_id[:8]}")
                        
                        # On PTT OFF: Set flag to generate response when transcript arrives
                        if not active:
                            logger.info(f"🔧 DEBUG: About to call trigger_ptt_response()")
                            await transcription_monitor.trigger_ptt_response()
                            logger.info(f"🔧 DEBUG: Finished trigger_ptt_response()")
                            # Response will be generated when the PTT transcript frame is processed
                
                # Handle test hand raise command
                elif data.get('type') == 'test_hand_raise':
                    reason = data.get('reason', 'Testing hand raise feature')
                    await transcription_monitor.raise_hand(reason)
                    logger.info(f"🧪 Test: Raised hand with reason: {reason}")
                
                # Handle hand approval
                elif data.get('type') == 'approve_hand':
                    await transcription_monitor.approve_hand(task)
                    logger.info(f"👍 Hand approved via app message")
                
        except Exception as e:
            logger.error(f"Error handling app message: {e}")
    
    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        logger.debug("Client ready event received")
        await rtvi.set_bot_ready()
        # Don't auto-start conversation

    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport, participant):
        # Wire up bot ID to monitors (critical for raise_hand to work!)
        if not transcription_monitor.transport_id:
            transcription_monitor.transport_id = transport.participant_id
            transcription_gating.bot_participant_id = transport.participant_id
            logger.info(f"🤖 Bot ID wired into monitors: {transport.participant_id}")
        
        participant_id = participant.get('id')
        
        # Fetch participant names from Daily API
        if room_name and daily_api_key:
            all_participants = await fetch_participant_names_from_daily(room_name, daily_api_key)
            participant_names.update(all_participants)
        
        # Get this participant's name
        user_name = participant_names.get(participant_id)
        if not user_name:
            user_name = (
                participant.get('user_name') or 
                participant.get('userName') or 
                participant.get('info', {}).get('userName') or
                'Unknown'
            )
        
        participant_names[participant_id] = user_name
        
        # Get role
        user_data = participant.get('user_data', {})
        role = user_data.get('role') or _role_from_name(user_name)
        participant_role_map[participant_id] = role
        
        logger.debug(f"🗺️ Role map after adding {participant_id[:8]}: {participant_role_map}")
        logger.info(f"✅ First participant joined: {user_name} (role: {role.upper()})")
        
        # TEST: Queue a canned reply to prove TTS→Daily audio path works
        # await task.queue_frames([TextFrame("Test: can you hear me?")])
        
        # Check who's missing
        present_roles = {r for r in participant_role_map.values() if r in {"buyer", "broker", "consultant"}}
        expected_roles = {"buyer", "broker"}
        missing_roles = expected_roles - present_roles
        
        # Only greet in waiting room scenario
        if missing_roles and role != "unknown":
            first_name = user_name.split()[0] if user_name and user_name != "Unknown" else "there"
            missing_names = []
            if "buyer" in missing_roles and buyer_name:
                missing_names.append(buyer_name.split()[0])
            if "broker" in missing_roles and seller_name:
                missing_names.append(seller_name.split()[0])
            
            if missing_names:
                intro = f"Hi {first_name}! I'm your AI co-pilot. We're waiting for {' and '.join(missing_names)} to join."
                await queue_when_clear(intro, force=True)  # Force in waiting room
        else:
            logger.info(f"✅ Entering silent observer mode")

    @transport.event_handler("on_participant_joined")
    async def on_participant_joined(transport, participant):
        participant_id = participant.get('id')
        
        # Fetch participant names
        if room_name and daily_api_key:
            all_participants = await fetch_participant_names_from_daily(room_name, daily_api_key)
            participant_names.update(all_participants)
        
        # Get this participant's name
        user_name = participant_names.get(participant_id)
        if not user_name:
            user_name = (
                participant.get('user_name') or 
                participant.get('userName') or 
                participant.get('info', {}).get('userName') or
                'Unknown'
            )
        
        participant_names[participant_id] = user_name
        
        # Get role
        user_data = participant.get('user_data', {})
        role = user_data.get('role') or _role_from_name(user_name)
        participant_role_map[participant_id] = role

        logger.debug(f"🗺️ Role map after adding {participant_id[:8]}: {participant_role_map}")
        logger.info(f"✅ Participant joined: {user_name} (role: {role.upper()})")
        
        # Check if this is a late joiner
        has_conversation_started = len(participant_role_map) > 2  # More than 2 participants already
        
        if has_conversation_started and role in {"buyer", "broker", "consultant"}:
            # Late joiner - provide brief context
            first_name = user_name.split()[0] if user_name and user_name != "Unknown" else "there"
            
            # Get who's here
            present_names = []
            for pid, prole in participant_role_map.items():
                if pid != participant_id and prole in {"buyer", "broker", "consultant"}:
                    pname = participant_names.get(pid, "Unknown")
                    if pname and pname != "Unknown":
                        present_names.append(pname.split()[0])
            
            if present_names:
                context_msg = f"Hi {first_name}, welcome! {' and '.join(present_names)} {'is' if len(present_names) == 1 else 'are'} here discussing {listing_title}."
                await queue_when_clear(context_msg, force=True)  # Force for late joiner

    @transport.event_handler("on_participant_left")
    async def on_participant_left(transport, participant, reason):
        participant_id = participant.get('id')
        role = participant_role_map.get(participant_id, 'unknown')
        user_name = participant_names.get(participant_id, participant.get('user_name', 'Unknown'))
        logger.info(f"❌ Participant left: {user_name} (role: {role})")
        
        # Only end if key participant leaves
        if role in {"buyer", "broker"}:
            await task.cancel()

    runner = PipelineRunner(handle_sigint=False, force_gc=True)
    await runner.run(task)


# ============================================
# PRODUCTION ENTRY POINT (Pipecat Cloud)
# ============================================
async def bot(runner_args):
    """Main bot entry point compatible with Pipecat Cloud."""
    body = getattr(runner_args, "body", None) or {}

    room_url = body.get("room_url") if isinstance(body, dict) else None
    token = body.get("token") if isinstance(body, dict) else None

    if not room_url:
        room_url = getattr(runner_args, "room_url", None)
    if not token:
        token = getattr(runner_args, "token", None)

    # Apply config env vars
    if isinstance(body, dict):
        config_env = body.get("config") or {}
        if isinstance(config_env, dict):
            for k, v in config_env.items():
                if v is not None:
                    os.environ[str(k)] = str(v)

    if not room_url or not token:
        logger.warning("⚠️ No room_url/token available yet")
        return

    logger.info(f"🚀 Bot process initialized for room: {room_url}")

    async with aiohttp.ClientSession() as session:
        transport = DailyTransport(
            room_url,
            token,
            "AI Co-Pilot",
            params=DailyParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                vad_analyzer=SileroVADAnalyzer(params=VADParams(
                    stop_secs=2.0,      # Wait 2 seconds of silence before ending (prevents mid-sentence responses)
                    start_secs=0.2,     # Quicker start detection
                    min_volume=0.6,     # Higher threshold to avoid noise
                )),
            ),
        )

        try:
            await main(transport)
            logger.info("✅ Bot process completed")
        except Exception as e:
            logger.exception(f"❌ Error in bot process: {str(e)}")
            raise


# ============================================
# LOCAL DEVELOPMENT ENTRY POINT
# ============================================
async def local_daily():
    """Daily transport for local development."""
    from runner import configure

    try:
        async with aiohttp.ClientSession() as session:
            (room_url, token) = await configure(session)
            transport = DailyTransport(
                room_url,
                token,
                "AI Co-Pilot (Local)",
                params=DailyParams(
                    audio_in_enabled=True,
                    audio_out_enabled=True,
                    vad_analyzer=SileroVADAnalyzer(params=VADParams(
                        stop_secs=2.0,      # Wait 2 seconds of silence before ending
                        start_secs=0.2,
                        min_volume=0.6,
                    )),
                ),
            )

            await main(transport)
    except Exception as e:
        logger.exception(f"❌ Error in local development mode: {e}")


if LOCAL and __name__ == "__main__":
    try:
        asyncio.run(local_daily())
    except Exception as e:
        logger.exception(f"❌ Failed to run in local mode: {e}")