/****************************************
  WHAT THE BEEP?! — FULL FEATURE BUILD
****************************************/

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  get,
  remove,
  query,
  orderByChild,
  limitToFirst
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-database.js";

// ✅ Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB__tnPafOuGaYCcRnh4RLnkqxddDqfRBI",
  authDomain: "what-the-beep-scores.firebaseapp.com",
  databaseURL: "https://what-the-beep-scores-default-rtdb.firebaseio.com",
  projectId: "what-the-beep-scores",
  storageBucket: "what-the-beep-scores.firebasestorage.app",
  messagingSenderId: "771090658342",
  appId: "1:771090658342:web:65e0001be569d6821a22e7",
  measurementId: "G-H6NLN7X2B4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const scoresRef = ref(database, 'leaderboard/scores'); // Reference to the 'leaderboard/scores' path in RTDB

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
  { name: "Scanner (Stuck)", file: "sounds/scannerstuck.mp3" },
  { name: "Chemicals Needed", file: "sounds/chemicals.mp3" },
{ name: "Crumpet Cooking", file: "sounds/crumpetcooking.mp3" },
{ name: "Developer Ready", file: "sounds/devready.mp3" },
{ name: "Egg", file: "sounds/egg.mp3" },
{ name: "Christmas Lights Switch On", file: "sounds/lightson.mp3" },
{ name: "Loud Scanner Hum", file: "sounds/loudscanner.mp3" },
{ name: "One Crumpet One Bread", file: "sounds/onecrumpetonebread.mp3" },
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

// ✅ ELEMENTS
const startBtn = document.getElementById("startBtn");
const replayBtn = document.getElementById("replayBtn");
const choicesDiv = document.getElementById("choices");
const feedback = document.getElementById("feedback");
const timeText = document.getElementById("time");
const roundInfo = document.getElementById("roundInfo");
const timerText = document.getElementById("timer");
const leaderboardEl = document.getElementById("leaderboard");

// ✅ LEADERBOARD (no longer uses localStorage directly for main data)
let leaderboard = []; // This will hold the fetched scores for rendering

function renderLeaderboard(highlightedName = null, highlightedTime = null) {
  leaderboardEl.innerHTML = "";

  // Query the top 10 scores ordered by 'time' (ascending for fastest times)
  const topScoresQuery = query(scoresRef, orderByChild('time'), limitToFirst(10));

  onValue(topScoresQuery, (snapshot) => {
    leaderboard = []; // Clear previous leaderboard data
    snapshot.forEach((childSnapshot) => {
      leaderboard.push({
        id: childSnapshot.key, // Firebase unique key
        ...childSnapshot.val() // Get the score data
      });
    });

    if (leaderboard.length === 0) {
      leaderboardEl.innerHTML = "<li>No scores yet</li>";
      return;
    }

    // Sort again on client-side if needed for tie-breaking or consistent display,
    // though orderByChild should largely handle the primary sort.
    leaderboard.sort((a, b) => a.time - b.time);

    leaderboard.forEach((e, i) => {
      const li = document.createElement("li");
      li.textContent = `#${i + 1} ${e.name} — ${e.time}s (${e.difficulty})`;

      // Highlight the newly added score
      if (highlightedName && highlightedTime && e.name === highlightedName && e.time === highlightedTime) {
        li.style.fontWeight = "bold";
        li.style.color = "green";
      }

      leaderboardEl.appendChild(li);
    });
  }, (error) => {
    console.error("Error fetching leaderboard:", error);
    leaderboardEl.innerHTML = "<li>Error loading leaderboard.</li>";
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
  availableSounds = [...soundLibrary]; // ✅ NO REPEATS
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
  audio.load();

  startTime = Date.now();
  audio.play().catch(() => {});

  startCountdown();

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

// ✅ TIMEOUT
function timeout() {
  audio.pause();
  feedback.textContent = ` Time's up! +${difficulty.penalty}s`;
  totalTime += difficulty.penalty;
  setTimeout(nextRound, 900);
}

// ✅ REPLAY
function replaySound() {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
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

  setTimeout(nextRound, 900);
}

// ✅ END GAME
function endGame() {
  // Disable gameplay button colors
  document.body.classList.remove('playing');

  choicesDiv.innerHTML = "";
  roundInfo.textContent = "GAME OVER";
  timerText.textContent = "";
  timeText.textContent = `Total Time: ${totalTime.toFixed(2)}s`;

  const name = prompt("Enter your name:");
  if (!name) return;

  // This is the correct, single declaration and assignment for newScore
  const newScore = {
    name: name.slice(0, 12),
    time: parseFloat(totalTime.toFixed(2)),
    difficulty: getDifficultyName(),
    timestamp: Date.now() // Client-side timestamp. For true server-side timestamp, you'd import `ServerValue` from 'firebase/database'.
  };

  console.log("Attempting to push score:", newScore); 

  // Push the new score to Firebase Realtime Database
  push(scoresRef, newScore)
  .then(async () => {
    console.log("Score added to Firebase successfully!");

    await trimLeaderboardToTop10();

    renderLeaderboard(newScore.name, newScore.time);
  })
  .catch((error) => {
    console.error("Error adding score to Firebase:", error);
  });


// ✅ HELPERS
async function trimLeaderboardToTop10() {
  const snapshot = await get(scoresRef);
  if (!snapshot.exists()) return;

  const scores = [];

  snapshot.forEach(child => {
    scores.push({
      id: child.key,
      ...child.val()
    });
  });

  // If 10 or fewer scores, do nothing
  if (scores.length <= 10) return;

  // Sort fastest first
  scores.sort((a, b) => a.time - b.time);

  // Delete everything after the top 10
  const toDelete = scores.slice(10);

  await Promise.all(
    toDelete.map(score =>
      remove(ref(database, `leaderboard/scores/${score.id}`))
    )
  );
}

function buildChoices(correct, amount) {
  const names = soundLibrary.map(s => s.name).filter(n => n !== correct);
  shuffle(names);
  const wrong = names.slice(0, amount - 1);
  const all = [correct, ...wrong];
  shuffle(all);
  return all;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function clearLeaderboard() {
  if (!confirm("Clear all scores? This will also clear the global leaderboard.")) return;

  remove(scoresRef)
    .then(() => {
      console.log("Leaderboard cleared from Firebase successfully!");
      renderLeaderboard(); // Re-render to show empty leaderboard
    })
    .catch((error) => {
      console.error("Error clearing leaderboard from Firebase:", error);
    });
}

function getDifficultyName() {
  if (difficulty === difficulties.easy) return "Easy";
  if (difficulty === difficulties.hard) return "Hard";
  return "Normal";
}
  // Only add pixel cursor on non-touch devices
if (!('ontouchstart' in window)) {
  const cursor = document.createElement('div');
  cursor.classList.add('pixel-cursor');
  document.body.appendChild(cursor);

  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
}


// Add these lines at the end of script.js to make functions globally accessible
window.setDifficulty = setDifficulty;
window.startGame = startGame;
window.replaySound = replaySound;
window.clearLeaderboard = clearLeaderboard;

// Initial render of the leaderboard when the page loads
renderLeaderboard();

// Removed duplicate renderLeaderboard() call
// renderLeaderboard();

