const content = document.getElementById('content');
const speakBtn = document.getElementById('speakBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const status = document. getElementById('status');
const wordCount = document.getElementById('wordCount');

let allText = '';  // All saved text
let currentSessionText = '';  // Current session interim+final
let isRecording = false;
let recognition = null;
let restartTimer = null;

window.SpeechRecognition = window. SpeechRecognition || window.webkitSpeechRecognition;

if (!window. SpeechRecognition) {
  status.textContent = '❌ Not supported';
  speakBtn.disabled = true;
}

function getSelectedLanguage() {
  const selected = document.querySelector('input[name="lang"]:checked');
  return selected ? selected.value : 'fa-IR';
}

function updateDisplay() {
  const displayText = allText + currentSessionText;
  content. textContent = displayText || 'متن شما اینجا نمایش داده می‌شود...';
  content.parentElement.scrollTop = content.parentElement.scrollHeight;
  
  const words = displayText.trim().split(/\s+/).filter(w => w.length > 0);
  wordCount.textContent = words. length > 0 ? `${words.length} words` : '';
}

function saveCurrentSession() {
  if (currentSessionText. trim()) {
    allText += currentSessionText;
    console.log('Saved session.  Total length:', allText.length);
  }
  currentSessionText = '';
}

function createAndStartRecognition() {
  if (! isRecording) return;
  
  // Clear any existing restart timer
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  
  try {
    recognition = new window. SpeechRecognition();
    recognition.lang = getSelectedLanguage();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition. maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Recognition started');
      status.textContent = '🔴 Recording... ';
    };

    recognition. onresult = (e) => {
      let sessionFinal = '';
      let sessionInterim = '';

      for (let i = 0; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          sessionFinal += transcript + ' ';
        } else {
          sessionInterim = transcript;
        }
      }

      // Update current session text (final + interim from this recognition session)
      currentSessionText = sessionFinal + sessionInterim;
      updateDisplay();
    };

    recognition. onerror = (e) => {
      console.log('Error:', e.error);
      if (e.error === 'no-speech') {
        status.textContent = '🎤 Listening...  (speak now)';
      } else if (e.error === 'network') {
        status.textContent = '🔄 Network issue, reconnecting...';
      } else if (e.error !== 'aborted') {
        status.textContent = '⚠️ ' + e.error + ' - reconnecting...';
      }
    };

    recognition.onend = () => {
      console.log('Recognition ended, isRecording:', isRecording);
      
      // Save the final text from this session (not interim)
      // Extract only final results
      const finalOnly = currentSessionText.replace(/[^. !?]*$/, ''); // Keep complete sentences
      if (currentSessionText.trim()) {
        allText += currentSessionText;
        currentSessionText = '';
      }
      
      updateDisplay();
      
      // Restart if still recording
      if (isRecording) {
        status.textContent = '🔄 Continuing...';
        restartTimer = setTimeout(() => {
          if (isRecording) {
            createAndStartRecognition();
          }
        }, 100);
      }
    };

    recognition.start();
    console.log('Recognition started successfully');
    
    // Schedule a proactive restart before Google's timeout
    // Google typically cuts off around 60 seconds
    restartTimer = setTimeout(() => {
      if (isRecording && recognition) {
        console.log('Proactive restart to prevent timeout');
        status.textContent = '🔄 Refreshing connection...';
        
        // Save current session before stopping
        if (currentSessionText.trim()) {
          allText += currentSessionText;
          currentSessionText = '';
          updateDisplay();
        }
        
        try {
          recognition.stop(); // This will trigger onend which restarts
        } catch (e) {
          console.log('Stop error:', e);
          createAndStartRecognition();
        }
      }
    }, 25000); // Restart every 25 seconds to be safe
    
  } catch (err) {
    console.log('Start error:', err);
    status.textContent = '🔄 Retrying...';
    
    restartTimer = setTimeout(() => {
      if (isRecording) {
        createAndStartRecognition();
      }
    }, 500);
  }
}

function startRecording() {
  // Keep existing text if any
  isRecording = true;
  currentSessionText = '';
  
  speakBtn.textContent = '⏹ Stop';
  speakBtn.classList.add('recording');
  document.querySelectorAll('input[name="lang"]').forEach(r => r.disabled = true);
  
  createAndStartRecognition();
}

function stopRecording() {
  isRecording = false;
  
  // Clear restart timer
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  
  // Save any remaining text
  if (currentSessionText.trim()) {
    allText += currentSessionText;
    currentSessionText = '';
  }
  
  if (recognition) {
    try {
      recognition.stop();
    } catch (err) {}
    recognition = null;
  }
  
  speakBtn.textContent = '▶ Start';
  speakBtn.classList.remove('recording');
  status.textContent = '✅ Stopped - ' + allText. split(/\s+/).filter(w => w).length + ' words recorded';
  document.querySelectorAll('input[name="lang"]').forEach(r => r.disabled = false);
  
  updateDisplay();
}

speakBtn.addEventListener('click', () => {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

clearBtn.addEventListener('click', () => {
  allText = '';
  currentSessionText = '';
  content.textContent = 'متن شما اینجا نمایش داده می‌شود... ';
  status.textContent = 'Cleared';
  wordCount.textContent = '';
});

copyBtn.addEventListener('click', () => {
  const text = (allText + currentSessionText).trim();
  if (text) {
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✅';
      status. textContent = 'Copied ' + text.split(/\s+/).filter(w => w).length + ' words!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
    });
  } else {
    status.textContent = 'Nothing to copy';
  }
});
