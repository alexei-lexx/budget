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
    recognition.continuous = false; // stop automatically after the first utterance
    recognition.interimResults = false; // only deliver final transcripts, not partial guesses

    // microphone opened — recording begins
    recognition.onstart = () => {
      console.log("[voice] onstart");
      isRecording.value = true;
    };

    // any sound detected (speech or background noise)
    recognition.onsoundstart = () => {
      console.log("[voice] onsoundstart");
    };

    // sound classified as speech by the STT service
    recognition.onspeechstart = () => {
      console.log("[voice] onspeechstart");
    };

    // STT returned a transcript.
    // event.results — list of utterances (one per pause when continuous=true; always 1 here)
    // each utterance — list of alternatives ranked by confidence; [0] is the best guess
    // joining utterances covers the continuous=true case; with continuous=false it's always one
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript?.trim())
        .filter(Boolean) // removes empty/undefined transcripts — Boolean("") === false
        .join(" ");

      console.log("[voice] onresult:", transcript);

      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log("[voice] onerror:", event.error);
      if (event.error === "no-speech") {
        // silence — return to idle silently, nothing actionable for the user
      } else {
        // audio-capture / not-allowed / network etc. — user needs to know
        onError?.(`Microphone error: ${event.error}`);
      }
      isRecording.value = false;
    };

    // always fires last — clean up recording state regardless of how the session ended
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
