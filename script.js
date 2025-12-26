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

// -------------------- Firebase Config --------------------
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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const scoresRef = ref(database, 'leaderboard/scores');

// -------------------- Sounds --------------------
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

// -------------------- Difficulty --------------------
const difficulties = {
  easy:   { choices: 2, penalty: 0, rounds: 5, time: 8 },
  normal: { choices: 3, penalty: 2, rounds: 5, time: 6 },
  hard:   { choices: 4, penalty: 4, rounds: 5, time: 4 }
};

let difficulty = difficulties.normal;

// -------------------- Game State --------------------
let availableSounds = [];
let currentSound;
let roundCount = 0;
let totalTime = 0;
let startTime;
let audio;
let timerInterval;
let secondsLeft;

// -------------------- DOM Elements --------------------
const startBtn = document.getElementById("startBtn");
const replayBtn = document.getElementById("replayBtn");
const choicesDiv = document.getElementById("choices");
const feedback = document.getElementById("feedback");
const timeText = document.getElementById("time");
const roundInfo = document.getElementById("roundInfo");
const timerText = document.getElementById("timer");
const leaderboardEl = document.getElementById("leaderboard");

// -------------------- Audio unlock for mobile --------------------
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  const temp = new Audio();
  temp.play().catch(() => {});
  audioUnlocked = true;
}

// -------------------- Leaderboard --------------------
let leaderboard = [];

async function renderLeaderboard(highlightedName = null, highlightedTime = null) {
  leaderboardEl.innerHTML = "";
  const topScoresQuery = query(scoresRef, orderByChild('time'), limitToFirst(10));

  try {
    const snapshot = await get(topScoresQuery);
    leaderboard = [];
    snapshot.forEach(childSnapshot => {
      leaderboard.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });

    if (leaderboard.length === 0) {
      leaderboardEl.innerHTML = "<li>No scores yet</li>";
      return;
    }

    leaderboard.sort((a, b) => a.time - b.time);

    leaderboard.forEach((e, i) => {
      const li = document.createElement("li");
      li.textContent = `#${i + 1} ${e.name} — ${e.time}s (${e.difficulty})`;
      if (highlightedName && highlightedTime && e.name === highlightedName && e.time === highlightedTime) {
        li.style.fontWeight = "bold";
        li.style.color = "green";
      }
      leaderboardEl.appendChild(li);
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    leaderboardEl.innerHTML = "<li>Error loading leaderboard.</li>";
  }
}

async function trimLeaderboardToTop10() {
  const snapshot = await get(scoresRef);
  if (!snapshot.exists()) return;

  const scores = [];
  snapshot.forEach(child => {
    scores.push({ id: child.key, ...child.val() });
  });

  if (scores.length <= 10) return;

  scores.sort((a, b) => a.time - b.time);
  const toDelete = scores.slice(10);

  await Promise.all(toDelete.map(score =>
    remove(ref(database, `leaderboard/scores/${score.id}`))
  ));
}

// -------------------- Buttons --------------------
startBtn.onclick = () => { unlockAudio(); startGame(); };
replayBtn.onclick = replaySound;

// -------------------- Difficulty --------------------
function setDifficulty(level) {
  difficulty = difficulties[level];
  feedback.textContent = `Difficulty: ${level.toUpperCase()}`;
}

// -------------------- Game Flow --------------------
function startGame() {
  document.body.classList.add('playing');
  roundCount = 0;
  totalTime = 0;
  availableSounds = [...soundLibrary];
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
    btn.onclick = () => { unlockAudio(); checkAnswer(choice); };
    choicesDiv.appendChild(btn);
  });
}

// -------------------- Timer --------------------
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

function timeout() {
  audio.pause();
  feedback.textContent = ` Time's up! +${difficulty.penalty}s`;
  totalTime += difficulty.penalty;
  setTimeout(nextRound, 900);
}

function replaySound() {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// -------------------- Answer Check --------------------
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

// -------------------- End Game --------------------
function endGame() {
  document.body.classList.remove('playing');
  choicesDiv.innerHTML = "";
  roundInfo.textContent = "GAME OVER";
  timerText.textContent = "";
  timeText.textContent = `Total Time: ${totalTime.toFixed(2)}s`;

  const name = prompt("Enter your name:");
  if (!name) return;

  const newScore = {
    name: name.slice(0, 12),
    time: parseFloat(totalTime.toFixed(2)),
    difficulty: getDifficultyName(),
    timestamp: Date.now()
  };

  push(scoresRef, newScore)
    .then(async () => {
      console.log("Score added successfully");
      await trimLeaderboardToTop10();
      renderLeaderboard(newScore.name, newScore.time);
    })
    .catch(err => console.error("Error adding score:", err));
}

// -------------------- Helpers --------------------
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

function getDifficultyName() {
  if (difficulty === difficulties.easy) return "Easy";
  if (difficulty === difficulties.hard) return "Hard";
  return "Normal";
}

// -------------------- Make functions global --------------------
window.setDifficulty = setDifficulty;
window.startGame = startGame;
window.replaySound = replaySound;

// -------------------- Initial leaderboard render --------------------
renderLeaderboard();

/****************************************
  DESKTOP-ONLY PIXEL CURSOR
****************************************/
if (!('ontouchstart' in window)) { // desktop only
  const cursor = document.createElement('div');
  cursor.classList.add('pixel-cursor');
  document.body.appendChild(cursor);

  // Make sure it doesn't block clicks
  cursor.style.position = 'absolute';
  cursor.style.width = '10px';
  cursor.style.height = '10px';
  cursor.style.background = 'red'; // change color if you like
  cursor.style.borderRadius = '50%';
  cursor.style.pointerEvents = 'none';
  cursor.style.zIndex = 1000;

  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
}

