#
# 6Degrees Consultation Co-Pilot Bot — AI-Powered Call Moderator
# FIXED VERSION: Bot always raises hand before speaking
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
from pipecat.frames.frames import Frame, LLMRunFrame, LLMFullResponseStartFrame, LLMFullResponseEndFrame, TextFrame, TranscriptionFrame, UserAudioRawFrame
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
from pipecatcloud.agent import SessionArguments

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
    
    BOT STATE FLOW:
    1. passive_listening: Bot observing conversation, PTT off (default state)
    2. active_listening: User speaking via PTT, asking bot a question
    3. thinking: Bot generating response (LLM processing)
    4. raised_hand: Bot has response ready, waiting for user approval
    5. speaking: Bot is talking (TTS playing)
    """
    def __init__(self, bot_participant_id=None, transport=None):
        self.last_human_speech_time = 0
        self.min_silence_before_bot_ms = 2000  # 2 seconds of silence required
        self.bot_participant_id = bot_participant_id
        self.is_human_speaking = False
        self.transport = transport
        
        # Bot state tracking
        self.bot_state = "passive_listening"
        
    async def on_transcription(self, frame: TranscriptionFrame, transport_id):
        """Update timing on any human transcription"""
        participant_id = getattr(frame, 'user_id', None) or getattr(frame, 'user', None)
        
        # If it's from a human (not the bot)
        if participant_id and participant_id != transport_id:
            self.last_human_speech_time = time.time()
            self.is_human_speaking = True
            
            # When human speaks, return to passive_listening (unless in raised_hand or active_listening)
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
    
    def _broadcast_context_to_ui(self, context_tracker):
        """Send conversation context to UI via app message"""
        logger.info("🚀 _broadcast_context_to_ui called!")
        try:
            if not context_tracker:
                logger.warning("⚠️ No context_tracker provided to broadcast")
                return
            
            if not hasattr(context_tracker, '_utterances'):
                logger.warning("⚠️ context_tracker has no _utterances attribute")
                return
            
            utterance_count = len(context_tracker._utterances)
            logger.info(f"📊 Preparing to broadcast {utterance_count} utterances to UI")
            
            # Build conversation history (last 20 messages)
            conversation_history = []
            for utt in context_tracker._utterances[-20:]:
                # Handle timestamp (could be float or datetime)
                timestamp_str = None
                if hasattr(utt, 'timestamp') and utt.timestamp:
                    if isinstance(utt.timestamp, float):
                        # Convert Unix timestamp to ISO format
                        from datetime import datetime
                        timestamp_str = datetime.fromtimestamp(utt.timestamp).isoformat()
                    elif hasattr(utt.timestamp, 'isoformat'):
                        # Already a datetime object
                        timestamp_str = utt.timestamp.isoformat()
                
                conversation_history.append({
                    'speaker_name': utt.speaker.name,
                    'speaker_role': utt.speaker.role,
                    'text': utt.text,
                    'timestamp': timestamp_str,
                    'is_ptt': utt.is_ptt,
                    'is_bot': utt.is_bot,
                    'is_question': utt.is_question,
                    'is_answer': utt.is_answer,
                    'channel': utt.channel,
                    'conversation_state': utt.conversation_state
                })
            
            # Send to UI
            if not self.transport:
                logger.warning("⚠️ No transport available for broadcast")
                return
                
            if not hasattr(self.transport, '_client') or not self.transport._client:
                logger.warning("⚠️ Transport has no _client or _client is None")
                return
            
            wrapper = self.transport._client
            if not hasattr(wrapper, '_client') or not wrapper._client:
                logger.warning("⚠️ Transport wrapper has no _client or _client is None")
                return
            
            daily_client = wrapper._client
            daily_client.send_app_message({
                'type': 'conversation_context_update',
                'conversation_history': conversation_history,
                'total_utterances': len(context_tracker._utterances)
            })
            logger.info(f"📡 Sent conversation context to UI ({len(conversation_history)} messages, total: {utterance_count})")
        except Exception as e:
            logger.error(f"❌ Failed to broadcast context to UI: {e}", exc_info=True)


class TranscriptionMonitor(FrameProcessor):
    """Monitor all transcriptions for PTT gating and hand raising"""
    def __init__(self, gating_system, transport_id, transport, participant_names=None, participant_roles=None, task=None, system_prompt=None, context_tracker=None):
        super().__init__(name="TranscriptionMonitor")
        self.gating_system = gating_system
        self.transport_id = transport_id
        self.transport = transport
        self.task = task  # Store task reference for speaking pre-generated response
        self.system_prompt = system_prompt  # System prompt for PTT response generation
        self.participant_names = {} if participant_names is None else participant_names
        self.participant_roles = {} if participant_roles is None else participant_roles
        self.context_tracker = context_tracker  # Real context tracker from processors module
        self.user_wants_bot_response = {}  # participant_id -> bool (PTT state)
        self.ptt_latch_per_participant = {}  # participant_id -> bool (latched PTT state)
        self.hand_raised = False  # Bot wants to speak (pending approval)
        self.hand_approved = False  # User clicked "Let AI speak"
        self.last_ptt_text = ""  # Buffer last PTT utterance for approval-time reply
        self.last_ptt_full_text = ""  # Full PTT transcript with speaker label
        self.intervention_message = ""  # PRE-GENERATED message ready to speak
        self.ptt_question_received = False  # Flag that PTT question needs response
        self.ptt_released_pending = {}  # participant_id -> bool: PTT was released, waiting for final transcript
        
        # Initialize OpenAI client for PTT response generation
        self.llm_client = None
        try:
            from openai import AsyncOpenAI
            self.llm_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize LLM for PTT: {e}")
        
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
            
            # Use latched PTT state
            ptt_latched = self.ptt_latch_per_participant.get(participant_id, False)
            ptt_active = ptt_currently_active or ptt_latched
            
            # Get speaker name and role
            speaker_name = self.participant_names.get(participant_id)
            if not speaker_name:
                speaker_name = f"Participant-{participant_id[:8]}"
            
            speaker_role = self.participant_roles.get(participant_id, "unknown")
            speaker_label = f"{speaker_name} ({speaker_role.upper()})" if speaker_name else "Unknown"
            
            if ptt_active:
                # PTT is active - user is speaking TO the bot
                logger.info(f"🎤 PTT active [{speaker_label}]: '{text[:50]}...'")
                full_ptt_text = f"[User speaking to AI] {speaker_label}: {text}"
                frame.text = full_ptt_text
                frame.is_ptt_transcript = True

                # ACCUMULATE ALL PTT text by appending (STT sends sentence fragments)
                # We combine all fragments into one complete utterance per PTT session
                if text and text.strip():
                    current_text = (text or "").strip()
                    
                    # Append new text if it's not already in buffer (avoid duplicates)
                    if not self.last_ptt_text:
                        self.last_ptt_text = current_text
                        logger.debug(f"📝 Started PTT buffer: '{current_text[:80]}...'")
                    elif current_text not in self.last_ptt_text:
                        # Deepgram sends new sentences, append them
                        self.last_ptt_text += " " + current_text
                        logger.debug(f"📝 Appended to PTT buffer: '{current_text[:60]}...'")
                        logger.debug(f"📝 Full buffer now: '{self.last_ptt_text[:100]}...'")
                    else:
                        logger.debug(f"📝 Skipping duplicate text: '{current_text[:60]}...'")
                    
                    # Update full text with latest speaker label
                    self.last_ptt_full_text = f"[User speaking to AI] {speaker_label}: {self.last_ptt_text}"

                
                # Set active listening state
                if text.strip() and self.gating_system:
                    self.gating_system.set_bot_state("active_listening")
                
                # Check if PTT was already released (transcript arrived after deactivate message)
                if participant_id and self.ptt_released_pending.get(participant_id, False) and text.strip():
                    logger.info(f"📝 Final PTT transcript received (PTT was already released): '{text[:50]}...'")
                    
                    # 📝 CONTEXT TRACKING: Record user utterance (same source as terminal log)
                    if self.context_tracker:
                        try:
                            self.context_tracker.add_utterance(
                                speaker_id=participant_id,
                                text=text,
                                is_ptt=True,
                                directed_to_id=self.transport_id
                            )
                            logger.info(f"✅ Recorded user utterance [{speaker_name} ({speaker_role.upper()})]: '{text[:50]}...'")
                            
                            # Broadcast updated context to UI
                            self.gating_system._broadcast_context_to_ui(self.context_tracker)
                        except Exception as e:
                            logger.error(f"❌ Failed to record user utterance: {e}")
                    
                    self.ptt_question_received = True
                    self.ptt_released_pending[participant_id] = False  # Clear flag
                    # Generate response
                    await self.generate_ptt_response()
                    
            else:
                # Passive listening - user talking amongst themselves
                logger.info(f"👂 Passive listening [{speaker_label}]: '{text[:50]}...'")
                frame.text = f"[Passive listening] {speaker_label}: {text}"
        
        await self.push_frame(frame, direction)
    
    async def generate_ptt_response(self):
        """ACTUALLY generate response for PTT question using LLM, then raise hand with preview"""
        if not self.ptt_question_received or not self.last_ptt_text or not self.llm_client:
            return
        
        logger.info(f"🤖 Generating REAL response for PTT question: '{self.last_ptt_text[:50]}...'")
        
        # Set thinking state
        if self.gating_system:
            self.gating_system.set_bot_state("thinking")
        
        try:
            # Build conversation context with system prompt + conversation history + PTT message
            messages = []
            
            if self.system_prompt:
                messages.append({
                    "role": "system",
                    "content": self.system_prompt
                })
            
            # 📚 ADD FULL CONVERSATION CONTEXT from context_tracker
            if self.context_tracker and hasattr(self.context_tracker, '_utterances'):
                conversation_history = []
                
                for utt in self.context_tracker._utterances:
                    speaker = utt.speaker
                    speaker_label = f"{speaker.name} ({speaker.role.upper()})"
                    
                    # Format: "August (BUYER): Hello, can you hear me?"
                    formatted_line = f"{speaker_label}: {utt.text}"
                    conversation_history.append(formatted_line)
                
                if conversation_history:
                    context_summary = "\n".join(conversation_history)
                    
                    # Log what context we're providing
                    logger.info(f"📚 Providing {len(conversation_history)} previous utterances as context")
                    logger.info(f"📝 FULL CONVERSATION CONTEXT:\n{'-'*60}\n{context_summary}\n{'-'*60}")
                    
                    # Add context as a user message before the current question
                    messages.append({
                        "role": "user",
                        "content": f"Previous conversation:\n{context_summary}"
                    })
            
            # Add the PTT question as user message
            messages.append({
                "role": "user",
                "content": self.last_ptt_full_text  # e.g. "[User speaking to AI] August (BUYER): Can you hear me?"
            })
            
            # Log the complete message array being sent to LLM
            logger.info(f"🤖 Sending {len(messages)} messages to LLM (system prompt + context + current question)")
            
            # Call LLM to generate actual response
            logger.info("🧠 Calling LLM to generate PTT response...")
            response = await self.llm_client.chat.completions.create(
                model="gpt-4o",
                temperature=0.7,
                max_tokens=150,  # Brief response (2-3 sentences)
                messages=messages
            )
            
            # Extract the generated response
            generated_message = response.choices[0].message.content.strip()
            
            # Store as intervention message (pre-generated response ready to speak)
            self.intervention_message = generated_message
            
            logger.info(f"✅ Generated response: '{generated_message[:100]}...'")
            
            # 📝 CONTEXT TRACKING: Record bot response when generated (same source as terminal log)
            if self.context_tracker:
                try:
                    bot_id = self.transport_id or "bot"
                    # Bot is responding to whoever spoke last (PTT user)
                    # Find the last PTT speaker from participant names/roles
                    directed_to_id = None
                    for pid, role in self.participant_roles.items():
                        if role in ['buyer', 'broker'] and pid != bot_id:
                            directed_to_id = pid
                            break
                    
                    self.context_tracker.add_utterance(
                        speaker_id=bot_id,
                        text=generated_message,
                        is_ptt=False,
                        directed_to_id=directed_to_id
                    )
                    logger.info(f"✅ Recorded bot response to context tracker (directed to: {directed_to_id[:8] if directed_to_id else 'unknown'})")
                    
                    # Broadcast updated context to UI
                    self.gating_system._broadcast_context_to_ui(self.context_tracker)
                except Exception as e:
                    logger.error(f"❌ Failed to record bot response: {e}")
            
            # Raise hand with preview of what bot will say
            await self.raise_hand(generated_message[:200])  # Show first 200 chars in UI
            
        except Exception as e:
            logger.error(f"❌ Failed to generate PTT response: {e}")
            # Fallback: raise hand with generic message
            self.intervention_message = "I have a response ready."
            await self.raise_hand("Response ready for your question")
        finally:
            # Clear the question flag and buffered text to avoid duplicate processing
            self.ptt_question_received = False
            self.last_ptt_text = ""
            self.last_ptt_full_text = ""
    
    def set_user_wants_response(self, participant_id: str, enabled: bool):
        """Called when participant toggles PTT button"""
        self.user_wants_bot_response[participant_id] = enabled
        
        if enabled:
            self.ptt_latch_per_participant[participant_id] = True
            self.ptt_released_pending[participant_id] = False  # Clear any previous flag
            # Clear PTT buffer for fresh start
            self.last_ptt_text = ""
            self.last_ptt_full_text = ""
            logger.info(f"🎤 PTT activated for {participant_id[:8]} (buffer cleared)")
            
            # IMPORTANT: If bot has hand raised, cancel it since user wants to say more
            if self.hand_raised:
                logger.info(f"🚫 Cancelling raised hand - user wants to provide more input")
                self.hand_raised = False
                self.hand_approved = False
                self.intervention_message = ""
                if self.gating_system:
                    self.gating_system.set_bot_state("active_listening")
        else:
            logger.info(f"🔇 PTT deactivated for {participant_id[:8]}")
            # PTT released - if we already have buffered text, generate response now
            if self.last_ptt_text and self.last_ptt_text.strip():
                logger.info(f"📝 PTT released with buffered text: '{self.last_ptt_text[:50]}...'")
                
                # 📝 CONTEXT TRACKING: Record user utterance when PTT released (same source as terminal log)
                if self.context_tracker:
                    try:
                        speaker_name = self.participant_names.get(participant_id, 'Unknown')
                        speaker_role = self.participant_roles.get(participant_id, 'unknown').upper()
                        
                        self.context_tracker.add_utterance(
                            speaker_id=participant_id,
                            text=self.last_ptt_text,
                            is_ptt=True,
                            directed_to_id=self.transport_id
                        )
                        logger.info(f"✅ Recorded user utterance [{speaker_name} ({speaker_role})]: '{self.last_ptt_text[:50]}...'")
                        
                        # Broadcast updated context to UI
                        self.gating_system._broadcast_context_to_ui(self.context_tracker)
                    except Exception as e:
                        logger.error(f"❌ Failed to record user utterance: {e}")
                
                self.ptt_question_received = True
                self.ptt_released_pending[participant_id] = False  # Clear flag since we're generating now
                # Schedule response generation (async)
                asyncio.create_task(self.generate_ptt_response())
            else:
                # No text yet - set flag so transcript handler will generate when it arrives
                logger.info(f"📝 PTT released, waiting for final transcript...")
                self.ptt_released_pending[participant_id] = True
            # Don't clear latch here - wait until response is delivered
    
    async def raise_hand(self, reason: str = ""):
        """Bot signals it wants to speak (needs user approval)"""
        if self.hand_raised:
            return  # Already raised
        
        # State transition to raised_hand
        if self.gating_system:
            self.gating_system.set_bot_state("raised_hand")
        
        self.hand_raised = True
        logger.info(f"✋ Bot raised hand: {reason}")
        
        # Send app message to UI to show visual indicator
        try:
            if hasattr(self.transport, '_client') and self.transport._client:
                wrapper = self.transport._client
                if hasattr(wrapper, '_client') and wrapper._client:
                    daily_client = wrapper._client
                    daily_client.send_app_message({'type': 'bot_hand_raised', 'reason': reason})
                    logger.info(f"✅ Sent bot_hand_raised notification to UI: {reason[:50]}...")
        except Exception as e:
            logger.error(f"❌ Failed to send hand raise notification: {e}")
    
    async def approve_hand(self, task=None):
        """User clicked 'Let AI speak' button - speak the PRE-GENERATED message"""
        if not self.hand_raised:
            return
        
        logger.info(f"👍 User approved bot to speak")
           
        # Set approved flag
        self.hand_approved = True
        
        # Clear hand raised
        self.hand_raised = False
        
        # Set speaking state
        if self.gating_system:
            self.gating_system.set_bot_state("speaking")
        
        # FIXED: Speak the PRE-GENERATED message (don't trigger new LLM generation)
        if task and self.intervention_message:
            logger.info(f"🗣️ Speaking pre-generated message: '{self.intervention_message[:100]}...'")
            
            # Send as a complete LLM response to prevent splitting by aggregators
            # This ensures the entire message goes to TTS
            from pipecat.frames.frames import LLMFullResponseStartFrame, TextFrame, LLMFullResponseEndFrame
            await task.queue_frames([
                LLMFullResponseStartFrame(),    # Signal: complete response starting
                TextFrame(text=self.intervention_message),   # The full pre-generated message
                LLMFullResponseEndFrame()       # Signal: response complete
            ])
            
            # Clear the message after using it
            self.intervention_message = ""
        else:
            logger.warning("⚠️ No pre-generated message to speak!")
        
        # Clear latches after approval
        for pid in list(self.ptt_latch_per_participant.keys()):
            self.ptt_latch_per_participant[pid] = False
        
        # Reset to passive listening after a delay
        asyncio.create_task(self._return_to_listening())
    
    async def _return_to_listening(self):
        """Return to passive listening after speaking"""
        await asyncio.sleep(3)  # Wait for response to complete
        if self.gating_system:
            self.gating_system.set_bot_state("passive_listening")
        self.hand_approved = False


class ResponseGatingProcessor(FrameProcessor):
    """
    Prevents LLM from responding when hand is not approved
    Also handles single-tier LLM analysis for passive listening
    """
    def __init__(self, transcription_monitor=None, transcription_gating=None, context_tracker=None):
        super().__init__(name="ResponseGating")
        self.transcription_monitor = transcription_monitor
        self.transcription_gating = transcription_gating
        self.context_tracker = context_tracker
        
        # Passive listening tracking (15 sec intervals - optimized)
        self.passive_buffer = []
        self.last_analysis_time = 0
        self.analysis_interval = 15  # Analyze every 15 seconds (balanced for cost/responsiveness)
        
        # Initialize OpenAI client for single-tier LLM analysis
        self.llm_client = None
        try:
            from openai import AsyncOpenAI
            self.llm_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            logger.info("✅ Single-tier LLM analysis system enabled")
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize LLM system: {e}")
            self.llm_client = None
        
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if await super().process_frame(frame, direction):
            return
        
        # Track bot state changes
        if isinstance(frame, LLMRunFrame):
            if self.transcription_gating and not self.transcription_monitor.hand_approved:
                # Block LLM if hand not approved
                logger.info(f"🚫 Blocking LLM run - hand not approved")
                return
        
        # Process transcriptions for passive listening analysis
        if isinstance(frame, TranscriptionFrame):
            is_ptt = getattr(frame, 'is_ptt_transcript', False)
            
            # Buffer transcripts for analysis when PTT is OFF (passive listening)
            if not is_ptt:
                text = getattr(frame, 'text', '') or ''
                clean_text = text.replace('[Passive listening] ', '').strip()
                if clean_text:
                    self.passive_buffer.append(clean_text)
                    
                    # Single-tier: Analyze every 30 seconds
                    await self._analyze_passive_listening()
        
        # Block UserStoppedSpeakingFrame unless hand is approved
        if hasattr(frame, '__class__') and 'UserStoppedSpeaking' in frame.__class__.__name__:
            if not self.transcription_monitor or not self.transcription_monitor.hand_approved:
                logger.info(f"🚫 Blocking auto-response trigger (hand not approved)")
                return  # Drop frame
            else:
                logger.info(f"✅ Allowing LLM response (hand approved)")
        
        await self.push_frame(frame, direction)
    
    async def _analyze_passive_listening(self):
        """
        Single-tier LLM analysis of passive listening (every 30 seconds)
        Returns JSON: {"type": "summary", "content": "..."} OR {"type": "question", "content": "..."}
        """
        if not self.llm_client or not self.context_tracker:
            return
        
        current_time = time.time()
        time_since_last = current_time - self.last_analysis_time
        
        # Only analyze every 30 seconds
        if time_since_last < self.analysis_interval:
            return
        
        # Need at least some passive listening content
        if len(self.passive_buffer) < 3:
            return
        
        try:
            # Get structured conversation context (last 10 utterances)
            recent_context = []
            if hasattr(self.context_tracker, '_utterances'):
                for u in self.context_tracker._utterances[-10:]:
                    recent_context.append({
                        "speaker": f"{u.speaker.name} ({u.speaker.role.upper()})",
                        "text": u.text,
                        "is_question": u.is_question,
                        "is_answer": u.is_answer
                    })
            
            # Get recent passive transcripts
            recent_passive = "\n".join(self.passive_buffer)
            
            logger.info(f"📊 Analyzing {len(self.passive_buffer)} passive listening transcripts...")
            
            import json
            response = await self.llm_client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.3,
                max_tokens=200,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": """You are an AI Co-Pilot monitoring a consultation call.

CONTEXT: You have access to the full conversation history. Use it to understand what's being discussed.

YOUR TASK: Analyze the recent passive listening (participants talking to each other) and respond with JSON:

If you detect FALSE INFORMATION, CONFUSION, CONTRADICTIONS, or need CLARIFICATION:
{
  "type": "question",
  "content": "Your clarifying question to help the conversation"
}

Otherwise, provide a SHORT INTERNAL SUMMARY (for your own tracking):
{
  "type": "summary",
  "content": "1-2 sentence summary of what was just discussed"
}

NOTE: Questions will trigger a "hand raise" so the user can approve you speaking. Summaries are logged silently."""
                    },
                    {
                        "role": "user",
                        "content": f"""Recent Conversation Context:
{json.dumps(recent_context, indent=2)}

Recent Passive Listening:
{recent_passive}

Analyze and respond in JSON."""
                    }
                ]
            )
            
            result_text = response.choices[0].message.content.strip()
            result = json.loads(result_text)
            
            analysis_type = result.get("type", "summary")
            content = result.get("content", "")
            
            if analysis_type == "question":
                logger.info(f"❓ Bot wants to ask: {content[:50]}...")
                # Raise hand with the question
                if self.transcription_monitor:
                    self.transcription_monitor.intervention_message = content
                    await self.transcription_monitor.raise_hand(content)
            else:
                logger.info(f"📝 Summary: {content[:50]}...")
            
            # Store the analysis in context tracker WITH TYPE TAG
            if self.context_tracker and content:
                bot_id = self.transcription_monitor.transport_id if self.transcription_monitor else "bot"
                # Use specific prefix based on type for UI differentiation
                prefix = "[Passive Question]" if analysis_type == "question" else "[Passive Summary]"
                self.context_tracker.add_utterance(
                    speaker_id=bot_id,
                    text=f"{prefix} {content}",
                    is_ptt=False
                )
                
                # Broadcast updated context to UI
                if self.transcription_monitor and self.transcription_monitor.gating_system:
                    self.transcription_monitor.gating_system._broadcast_context_to_ui(self.context_tracker)
            
            # Reset for next interval
            self.passive_buffer.clear()
            self.last_analysis_time = current_time
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse analysis JSON: {e}")
        except Exception as e:
            logger.error(f"❌ Passive analysis failed: {e}")


class BotAddressDetector(FrameProcessor):
    """Track if bot is being addressed in conversations"""
    def __init__(self):
        super().__init__(name="BotAddressDetector")
        self.bot_addressed = False
        self.last_text = ""
        self.ai_keywords = ['ai', 'a.i.', 'bot', 'robot', 'copilot', 'co-pilot', 'assistant', 'moderator', 'system']
        
    async def process_frame(self, frame: Frame, direction: FrameDirection):
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
                    participants = presence_data.get(room_name, [])
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
    return {}


async def main(transport: DailyTransport):
    """Main consultation co-pilot bot pipeline logic."""
    logger.info("🎙️ Starting consultation co-pilot bot pipeline...")

    # Extract room info for Daily API
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
    
    # Participant name cache
    participant_names = {}

    # Get consultation context from environment
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

    # Services - Deepgram with interim results disabled for complete transcripts
    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        params={
            "diarize": False,
            "punctuate": True,
            "model": "nova-2",
            "interim_results": False,  # Only send final transcripts
            "utterance_end_ms": 2000,  # Wait 2 seconds of silence before finalizing
        }
    )

    tts = OpenAITTSService(
        api_key=os.getenv("OPENAI_API_KEY"),
        voice="alloy",
    )

    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o"
    )

    # Build system prompt
    questions_context = ""
    if questions:
        questions_list = "\n".join([f"{i+1}. {q}" for i, q in enumerate(questions)])
        questions_context = f"""

BUYER'S KEY QUESTIONS TO TRACK:
{questions_list}

Monitor if these get answered."""

    # PTT-specific system prompt (used when user asks direct questions)
    ptt_system_prompt = f"""You are an AI Co-Pilot helping {buyer_name} in a consultation call about: {listing_title}.

PARTICIPANTS:
- You are assisting: {buyer_name} (the buyer)
- Consultant/Expert: {target_name}
{f'- Broker: {seller_name}' if seller_name else ''}

The user is asking YOU a direct question via push-to-talk (PTT).

CONTEXT: You have access to the full conversation history below. Use this context to provide informed, relevant answers.

YOUR ROLE:
- Answer the user's question directly and helpfully
- Reference previous conversation when relevant
- You know who the consultant is: {target_name}
- Keep responses brief (2-3 sentences) since this is a live voice call
- Be natural and conversational, like a helpful colleague

{questions_context}

Your response will be spoken aloud to the user."""

    # General system prompt (kept for pipeline, but PTT uses its own)
    system_prompt = f"""You are the AI Consultation Co-Pilot for 6Degrees in a live voice meeting between {buyer_name} (buyer) and {seller_name} (broker) about {target_name} regarding: {listing_title}.

YOU ARE IN A LIVE VOICE CALL. You HEAR participants speaking and when you respond, your text is spoken aloud.

CRITICAL: You must ALWAYS wait for hand approval before speaking. The hand raising is automatic - just respond when approved.

When you see "[User speaking to AI]": They pressed PTT and are asking YOU directly. Respond naturally.
When you see "[Passive listening]": They're talking amongst themselves. Stay silent.

{questions_context}

Respond like a colleague on a call, not a chatbot. Keep responses brief (2-3 sentences)."""

    messages = [{"role": "system", "content": system_prompt}]

    context = LLMContext(messages)
    context_aggregator = LLMContextAggregatorPair(context)
    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

    # Participant Role Mapping
    participant_role_map = {}

    # Create pipeline task first
    pipeline_task = None
    
    # Initialize REAL conversation context tracker from processors module
    from processors.conversation_context import ConversationContextTracker as RealContextTracker
    context_tracker = RealContextTracker(call_id=call_id)
    context_tracker.topic = listing_title
    context_tracker.predefined_questions = questions
    
    # Turn-taking systems
    transcription_gating = TranscriptionBasedGating(bot_participant_id, transport)
    transcription_monitor = TranscriptionMonitor(
        transcription_gating, 
        bot_participant_id, 
        transport,
        participant_names,
        participant_role_map,
        pipeline_task,  # Will be set after task creation
        ptt_system_prompt,   # Pass PTT-specific system prompt
        context_tracker  # Pass REAL context tracker (same source as terminal logs)
    )
    
    response_gating = ResponseGatingProcessor(transcription_monitor, transcription_gating, context_tracker)
    
    def _role_from_name(name: str) -> str:
        """Map participant name to role using name heuristics."""
        n = (name or "").lower()
        logger.debug(f"🔍 Role lookup for '{name}': checking against buyer='{buyer_name}', seller='{seller_name}', target='{target_name}'")
        
        if buyer_name and buyer_name.strip():
            if buyer_name.lower() in n or n in buyer_name.lower():
                logger.debug(f"  → Matched BUYER")
                return "buyer"
        
        if seller_name and seller_name.strip():
            if seller_name.lower() in n or n in seller_name.lower():
                logger.debug(f"  → Matched BROKER")
                return "broker"
        
        if target_name and target_name.strip():
            if target_name.lower() in n or n in target_name.lower():
                logger.debug(f"  → Matched CONSULTANT")
                return "consultant"
        
        logger.debug(f"  → No match, returning UNKNOWN")
        return "unknown"

    # Pipeline
    pipeline = Pipeline(
        [
            transport.input(),
            rtvi,
            stt,
            transcription_monitor,
            response_gating,
            # context_tracker is NOT in pipeline - it's passed to TranscriptionMonitor
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
    
    # Now set the task reference in transcription_monitor
    transcription_monitor.task = task

    # Event Handlers
    @transport.event_handler("on_app_message")
    async def on_app_message(transport, data, sender_id):
        """Handle PTT app messages and commands"""
        try:
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
                
                # Handle hand approval
                elif data.get('type') == 'approve_hand':
                    await transcription_monitor.approve_hand(task)
                    logger.info(f"👍 Hand approved via app message")
                
                # Handle hand rejection
                elif data.get('type') == 'cancel_bot_speech':
                    if transcription_monitor.hand_raised:
                        logger.info(f"❌ User rejected bot intervention")
                        transcription_monitor.hand_raised = False
                        transcription_monitor.hand_approved = False
                        transcription_monitor.intervention_message = ""
                        
                        if transcription_gating:
                            transcription_gating.set_bot_state("passive_listening")
                
        except Exception as e:
            logger.error(f"Error handling app message: {e}")
    
    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        logger.debug("Client ready event received")
        await rtvi.set_bot_ready()

    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport, participant):
        # Wire up bot ID to monitors
        if not transcription_monitor.transport_id:
            # Note: transport.participant_id is often empty at this point
            # We'll get the actual bot ID from the participant list later
            bot_id = transport.participant_id or "bot-pending"
            transcription_monitor.transport_id = bot_id
            transcription_gating.bot_participant_id = bot_id
            logger.info(f"🤖 Bot ID wired into monitors: {bot_id}")
            
            # Try to get actual bot ID from participant info
            # The bot participant will have a specific name pattern like "AI Co-Pilot (Local)"
            if room_name and daily_api_key:
                try:
                    all_participants = await fetch_participant_names_from_daily(room_name, daily_api_key)
                    for pid, pname in all_participants.items():
                        # Look for bot-like names
                        if any(keyword in pname for keyword in ['AI Co-Pilot', 'Local', 'Bot', 'Assistant']):
                            # This is likely the bot's ID
                            bot_id = pid
                            transcription_monitor.transport_id = bot_id
                            transcription_gating.bot_participant_id = bot_id
                            logger.info(f"✅ Found bot ID from API: {pid[:8]}... (name: {pname})")
                            break
                except Exception as e:
                    logger.debug(f"Could not fetch bot ID from API: {e}")
            
            # Register bot in context tracker
            context_tracker.register_participant(
                bot_id,
                "AI Co-Pilot",
                "bot"
            )
            logger.info(f"✅ Registered bot in context tracker (ID: {bot_id[:8] if bot_id and len(bot_id) > 8 else bot_id})")
        
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
        
        # Register in context tracker
        context_tracker.register_participant(participant_id, user_name, role)
        
        logger.debug(f"🗺️ Role map after adding {participant_id[:8]}: {participant_role_map}")
        logger.info(f"✅ First participant joined: {user_name} (role: {role.upper()})")
        logger.info(f"✅ Registered participant in context tracker: {user_name} ({role.upper()})")

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
        
        # Register in context tracker
        context_tracker.register_participant(participant_id, user_name, role)

        logger.debug(f"🗺️ Role map after adding {participant_id[:8]}: {participant_role_map}")
        logger.info(f"✅ Participant joined: {user_name} (role: {role.upper()})")
        logger.info(f"✅ Registered participant in context tracker: {user_name} ({role.upper()})")

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
    
    try:
        await runner.run(task)
    finally:
        # Save transcript on shutdown (Ctrl+C, participant left, or any exit)
        logger.info("💾 Saving call transcript and context...")
        try:
            import datetime, json
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
            txt_filename = f"call-transcript-{call_id}-{timestamp}.txt"
            json_filename = f"call-context-{call_id}-{timestamp}.json"
            
            # Save text transcript
            context_tracker.save_to_text_file(txt_filename)
            logger.info(f"✅ Transcript saved to: {txt_filename}")
            
            # Save JSON context
            with open(json_filename, "w", encoding="utf-8") as f:
                json.dump(context_tracker.export_to_json(), f, ensure_ascii=False, indent=2)
            logger.info(f"✅ JSON context saved to: {json_filename}")
        except Exception as e:
            logger.error(f"❌ Failed to save transcript: {e}")


# ============================================
# PRODUCTION ENTRY POINT (Pipecat Cloud)
# ============================================
async def bot(args: SessionArguments):
    """Main bot entry point compatible with Pipecat Cloud.
    
    This is the function that Pipecat Cloud calls when starting the bot.
    
    Args:
        args: Contains session info from Pipecat Cloud (room_url/token either directly or in body)
    """
    # Extract room_url and token from args (handles both DailySessionArguments and PipecatSessionArguments)
    room_url = getattr(args, 'room_url', None) or (args.body.get('room_url') if hasattr(args, 'body') and args.body else None)
    token = getattr(args, 'token', None) or (args.body.get('token') if hasattr(args, 'body') and args.body else None)
    
    if not room_url or not token:
        raise ValueError(f"Missing room_url or token in args: {args}")
    
    logger.info(f"🚀 Bot process initialized for room: {room_url}")

    async with aiohttp.ClientSession() as session:
        transport = DailyTransport(
            room_url,
            token,
            "AI Co-Pilot",
            params=DailyParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                audio_in_sample_rate=16000,
                audio_out_sample_rate=16000,
                vad_analyzer=SileroVADAnalyzer(params=VADParams(
                    stop_secs=2.0,
                    start_secs=0.2,
                    min_volume=0.6,
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
                    audio_in_sample_rate=16000,
                    audio_out_sample_rate=16000,
                    vad_analyzer=SileroVADAnalyzer(params=VADParams(
                        stop_secs=2.0,
                        start_secs=0.2,
                        min_volume=0.6,
                    )),
                ),
            )

            await main(transport)
    except Exception as e:
        logger.exception(f"❌ Error in local development mode: {e}")


if __name__ == "__main__":
    if LOCAL:
        try:
            asyncio.run(local_daily())
        except Exception as e:
            logger.exception(f"❌ Failed to run in local mode: {e}")
    else:
        # Production mode would be handled by Pipecat Cloud
        logger.error("❌ Must set LOCAL_RUN=true for local development")