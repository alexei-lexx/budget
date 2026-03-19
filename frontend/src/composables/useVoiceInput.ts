import { ref } from "vue";

export function useVoiceInput({
  onTranscript,
  onError,
}: {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
}) {
  // SpeechRecognition is Chrome/Edge only — absent in Firefox
  const isSupported = typeof SpeechRecognition !== "undefined";
  const isRecording = ref(false);

  let recognition: SpeechRecognition | null = null;

  function startRecording() {
    if (!isSupported || isRecording.value) return;

    recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop automatically after the first utterance
    recognition.interimResults = false; // Only deliver final transcripts, not partial guesses

    // Microphone opened — recording begins
    recognition.onstart = () => {
      console.log("[voice] onstart");
      isRecording.value = true;
    };

    // Any sound detected (speech or background noise)
    recognition.onsoundstart = () => {
      console.log("[voice] onsoundstart");
    };

    // Sound classified as speech by the STT service
    recognition.onspeechstart = () => {
      console.log("[voice] onspeechstart");
    };

    // STT returned a transcript.
    // event.results — list of utterances (one per pause when continuous=true; always 1 here)
    // Each utterance — list of alternatives ranked by confidence; [0] is the best guess
    // Joining utterances covers the continuous=true case; with continuous=false it's always one
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript?.trim())
        .filter(Boolean) // Removes empty/undefined transcripts — Boolean("") === false
        .join(" ");

      console.log("[voice] onresult:", transcript);

      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = async (event: SpeechRecognitionErrorEvent) => {
      console.log("[voice] onerror:", event.error);
      if (event.error === "no-speech") {
        // Silence — return to idle silently, nothing actionable for the user
      } else if (event.error === "not-allowed") {
        // Distinguish mic permission denied from speech service failure
        const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (perm.state === "granted") {
          onError?.("Speech service unavailable — try again");
        } else {
          onError?.("Microphone access denied — check browser permissions");
        }
      } else if (event.error === "audio-capture") {
        onError?.("Microphone not available — check your device");
      } else if (event.error === "network") {
        onError?.("Network error — try again");
      } else {
        onError?.("Voice input failed — try again");
      }
      isRecording.value = false;
    };

    // Always fires last — clean up recording state regardless of how the session ended
    recognition.onend = () => {
      console.log("[voice] onend");
      isRecording.value = false;
    };

    recognition.start();
  }

  function stopRecording() {
    recognition?.stop();
  }

  return {
    isSupported,
    isRecording,
    startRecording,
    stopRecording,
  };
}
