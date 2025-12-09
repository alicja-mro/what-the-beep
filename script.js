/****************************************
  WHAT THE BEEP?! — FULL FEATURE BUILD
****************************************/

// ✅ ALL SOUNDS (EDIT HERE ONLY)
const soundLibrary = [
  { name: "Microwave (Done)", file: "sounds/microwavedone.mp3" },
  { name: "Microwave (Input Time)", file: "sounds/microwaveinputtime.mp3" },
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
let lastPlayerName = "";

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
const database = firebase.database();
const leaderboardRef = database.ref('leaderboard/scores');

let globalLeaderboard = [];

// Listen for leaderboard updates from Firebase
leaderboardRef.orderByChild('time').limitToFirst(10).on('value', (snapshot) => {
  const scores = [];
  snapshot.forEach((childSnapshot) => {
    const score = childSnapshot.val();
    scores.push({
      key: childSnapshot.key,
      name: score.name,
      time: score.time,
      difficulty: score.difficulty,
      timestamp: score.timestamp
    });
  });
  scores.sort((a, b) => a.time - b.time);
  globalLeaderboard = scores;
  renderLeaderboard();
});

// ✅ LEADERBOARD RENDER
function renderLeaderboard(highlightedKey = null) {
  leaderboardEl.innerHTML = "";
  if (globalLeaderboard.length === 0) {
    leaderboardEl.innerHTML = "<li>No scores yet</li>";
    return;
  }
  globalLeaderboard.forEach((e, i) => {
    const li = document.createElement("li");
    li.textContent = `#${i + 1} ${e.name} — ${e.time}s (${e.difficulty})`;
    if (e.key === highlightedKey) {
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

  // Pick & remove sound (no repeats)
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
  timerText.textContent = `⏳ ${secondsLeft}s`;
  timerInterval = setInterval(() => {
    secondsLeft--;
    timerText.textContent = `⏳ ${secondsLeft}s`;
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timeout();
    }
  }, 1000);
}

function timeout() {
