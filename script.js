/****************************************
  WHAT THE BEEP?! — FULL FEATURE BUILD
****************************************/

// ✅ ALL SOUNDS (EDIT HERE ONLY)
const soundLibrary = [
  { name: "Microwave (Done)", file: "sounds/microwavedone.mp3" },
  { name: "Microwave (Input Time)", file: "sounds/microwavetimein.mp3" },
  { name: "Cutter (Cutting)", file: "sounds/cuttercutting.mp3" },
  { name: "Cutter (Error)", file: "sounds/cuttererror.mp3" },
  { name: "Cutter (Joe)", file: "sounds/cutterjoe.mp3" },
  { name: "Air Blow Gun", file: "sounds/blower.mp3" },
  { name: "Barcode Scanner", file: "sounds/barcodescanner.mp3" },
  { name: "Printer", file: "sounds/printer.mp3" },
  { name: "Scanner (Scanning)", file: "sounds/scannerscanning.mp3" },
  { name: "Scanner (Stuck)", file: "sounds/scannerstuck.mp3" }
];

// ✅ DIFFICULTY SETTINGS
const difficulties = {
  easy:   { choices: 2, penalty: 0, rounds: 5, time: 8 },
  normal: { choices: 3, penalty: 2, rounds: 5, time: 6 },
  hard:   { choices: 4, penalty: 4, rounds: 5, time: 4 }
};
let difficulty = difficulties.normal;

// ✅ GAME STATE
let availableSounds = [];
let currentSound;
let roundCount = 0;
let totalTime = 0;
let startTime;
let audio;
let timerInterval;
let secondsLeft;
let lastPlayerName = ""; // To store the last entered name for pre-filling prompt

// ✅ ELEMENTS
const startBtn = document.getElementById("startBtn");
const replayBtn = document.getElementById("replayBtn");
const choicesDiv = document.getElementById("choices");
const feedback = document.getElementById("feedback");
const timeText = document.getElementById("time");
const roundInfo = document.getElementById("roundInfo");
const timerText = document.getElementById("timer");
const leaderboardEl = document.getElementById("leaderboard");

// ****************************************
// ✅ FIREBASE CONFIGURATION AND INITIALIZATION
// ****************************************
const firebaseConfig = {
  // Your project's Firebase configuration
  // For Realtime Database, you primarily need projectId and databaseURL.
  // You can find these in your Firebase project settings -> Project settings -> General
  projectId: "what-the-beep-scores",
  databaseURL: "https://what-the-beep-scores-default-rtdb.firebaseio.com",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the Realtime Database service
const database = firebase.database();
const leaderboardRef = database.ref('leaderboard/scores');

let globalLeaderboard = []; // To store scores fetched from Firebase

// Listen for leaderboard updates from Firebase
// Orders by time (ascending, as lower time is better) and limits to the top 10 scores
leaderboardRef.orderByChild('time').limitToFirst(10).on('value', (snapshot) => {
  const scores = [];
  snapshot.forEach((childSnapshot) => {
    const score = childSnapshot.val();
    scores.push({
      key: childSnapshot.key, // Store the Firebase push key for highlighting
      name: score.name,
      time: score.time,
      difficulty: score.difficulty,
      timestamp: score.timestamp // Useful for tie-breaking or display if needed
    });
  });

  // Since orderByChild('time') already sorts it, we can directly assign.
  // However, local sort ensures consistency in case of any Firebase query nuances
  // or if we ever fetch more than 10 but only display 10.
  scores.sort((a, b) => a.time - b.time);
  globalLeaderboard = scores;
  renderLeaderboard(); // Render with the latest data
});

// ✅ LEADERBOARD RENDER
function renderLeaderboard(highlightedKey = null) { // highlightedKey is the Firebase push key
  leaderboardEl.innerHTML = "";
  if (globalLeaderboard.length === 0) {
    leaderboardEl.innerHTML = "<li>No scores yet</li>";
    return;
  }
  globalLeaderboard.forEach((e, i) => {
    const li = document.createElement("li");
    li.textContent = `#${i + 1} ${e.name} — ${e.time}s (${e.difficulty})`;
    if (e.key === highlightedKey) { // Check against the Firebase push key
      li.style.fontWeight = "bold";
      li.style.color = "green";
    }
    leaderboardEl.appendChild(li);
  });
}

// ✅ BUTTONS
startBtn.onclick = startGame;
replayBtn.onclick = replaySound;

// ✅ DIFFICULTY SELECT
function setDifficulty(level) {
  difficulty = difficulties[level];
  feedback.textContent = `Difficulty: ${level.toUpperCase()}`;
}

// ✅ GAME FLOW
function startGame() {
  // Enable gameplay button colors
  document.body.classList.add('playing');

  roundCount = 0;
  totalTime = 0;
  availableSounds = [...soundLibrary]; // Use spread to create a shallow copy
  nextRound();
}

function nextRound() {
  clearInterval(timerInterval);

  if (roundCount >= difficulty.rounds) {
    endGame();
    return;
  }

  roundCount++;
  feedback.textContent = "";
  timeText.textContent = "";
  choicesDiv.innerHTML = "";
  roundInfo.textContent = `Round ${roundCount} of ${difficulty.rounds}`;

  // ✅ Pick & remove sound (no repeats)
  const index = Math.floor(Math.random() * availableSounds.length);
  currentSound = availableSounds.splice(index, 1)[0];

  audio = new Audio(currentSound.file);
  audio.load(); // Preload the audio
  startTime = Date.now();
  audio.play().catch((error) => console.error("Audio play failed:", error)); // Catch potential play errors

  startCountdown();

  // Ensures unique and random choices
  const choices = buildChoices(currentSound.name, difficulty.choices);
  choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.textContent = choice;
    btn.onclick = () => checkAnswer(choice);
    choicesDiv.appendChild(btn);
  });
}

// ✅ COUNTDOWN TIMER
function startCountdown() {
  secondsLeft = difficulty.time;
  timerText.textContent = ` ${secondsLeft}s`;

  timerInterval = setInterval(() => {
    secondsLeft--;
    timerText.textContent = ` ${secondsLeft}s`;

    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timeout();
    }
  }, 1000);
}

// ✅ TIMEOUT (Completed)
function timeout() {
  audio.pause();
  feedback.textContent = ` Time's up! +${difficulty.penalty}s`;
  totalTime += difficulty.penalty;
  setTimeout(nextRound, 900); // Move to next round after a short delay
}

// ✅ REPLAY
function replaySound() {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch((error) => console.error("Audio replay failed:", error));
}

// ✅ ANSWER CHECK
function checkAnswer(choice) {
  clearInterval(timerInterval);
  audio.pause();
  audio.currentTime = 0;

  const elapsed = (Date.now() - startTime) / 1000;

  if (choice === currentSound.name) {
    feedback.textContent = "✅ Correct!";
    totalTime += elapsed;
    timeText.textContent = `+${elapsed.toFixed(2)}s`;
  } else {
    feedback.textContent = `❌ Wrong! +${difficulty.penalty}s`;
    totalTime += difficulty.penalty;
  }

  setTimeout(nextRound, 900); // Move to next round after a short delay
}

// ✅ END GAME (Firebase Integration)
function endGame() {
  // Disable gameplay button colors
  document.body.classList.remove('playing');

  choicesDiv.innerHTML = "";
  roundInfo.textContent = "GAME OVER";
  timerText.textContent = "";
  timeText.textContent = `Total Time: ${totalTime.toFixed(2)}s`;

  const name = prompt("Enter your name:", lastPlayerName || ""); // Pre-fill with last name if available
  if (!name || name.trim() === "") {
      feedback.textContent = "Score not saved: Name is required.";
      return;
  }
  lastPlayerName = name.trim().slice(0, 12); // Store cleaned name for next game

  const newScore = {
  name: lastPlayerName,
  time: parseFloat(totalTime.toFixed(2)),
  difficulty: getDifficultyName(),
  timestamp: Date.now() 
};

  // Push the new score to Firebase Realtime Database
  const newScoreRef = leaderboardRef.push();
  newScoreRef.set(newScore)
    .then(() => {
      // Once the score is saved, the 'value' listener will automatically update globalLeaderboard
      // We can then call renderLeaderboard with the key of the new score to highlight it
      renderLeaderboard(newScoreRef.key);
      feedback.textContent = "Score saved to global leaderboard!";
    })
    .catch((error) => {
      console.error("Error saving score to Firebase:", error);
      feedback.textContent = "Error saving score to global leaderboard.";
    });
}

// ✅ HELPERS
function buildChoices(correct, amount) {
  const names = soundLibrary.map(s => s.name).filter(n => n !== correct);
  shuffle(names); // Shuffle the available wrong choices
  const wrong = names.slice(0, amount - 1); // Select 'amount - 1' wrong choices
  const all = [correct, ...wrong]; // Combine correct and wrong choices
  shuffle(all); // Shuffle all choices to randomize their display order
  return all;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]; // ES6 swap
  }
}

// Removed clearLeaderboard function as it's for local storage

function getDifficultyName() {
  if (difficulty === difficulties.easy) return "Easy";
  if (difficulty === difficulties.hard) return "Hard";
  return "Normal";
}

/****************************************
   PIXEL CURSOR
****************************************/

const cursor = document.createElement('div');
cursor.classList.add('pixel-cursor');
document.body.appendChild(cursor);

document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
});

// The Firebase listener will automatically call renderLeaderboard on initial load and updates.
// So, no explicit call to renderLeaderboard() is needed here.
