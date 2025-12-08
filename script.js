/****************************************
  WHAT THE BEEP?! — FULL FEATURE BUILD
****************************************/

// ✅ ALL SOUNDS (EDIT HERE ONLY)
const soundLibrary = [
  //  Microwave
  { name: "Microwave (Done)", file: "sounds/microwavedone.mp3" },
  { name: "Microwave (Input Time)", file: "sounds/microwavetimein.mp3" },

  //  Cutter
  { name: "Cutter (Cutting)", file: "sounds/cuttercutting.mp3" },
  { name: "Cutter (Error)", file: "sounds/cuttererror.mp3" },
  { name: "Cutter (Joe)", file: "sounds/cutterjoe.mp3" },

  //  Air / Blower
  { name: "Air Blow Gun", file: "sounds/blower.mp3" },

  //  Barcode / Printing / Scanning
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

// ✅ ELEMENTS
const startBtn = document.getElementById("startBtn");
const replayBtn = document.getElementById("replayBtn");
const choicesDiv = document.getElementById("choices");
const feedback = document.getElementById("feedback");
const timeText = document.getElementById("time");
const roundInfo = document.getElementById("roundInfo");
const timerText = document.getElementById("timer");
const leaderboardEl = document.getElementById("leaderboard");

// ✅ LEADERBOARD
let leaderboard = JSON.parse(localStorage.getItem("wtbLeaderboard")) || [];
function renderLeaderboard(highlightIndex = -1) {
  leaderboardEl.innerHTML = "";

  if (leaderboard.length === 0) {
    leaderboardEl.innerHTML = "<li>No scores yet</li>";
    return;
  }

  leaderboard.forEach((e, i) => {
    const li = document.createElement("li");
    li.textContent = `#${i + 1} ${e.name} — ${e.time}s (${e.difficulty})`;

    if (i === highlightIndex) {
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

// ✅ TIMEOUT
function timeout() {
  audio.pause();
  feedback.textContent = `⏰ Time's up! +${difficulty.penalty}s`;
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
  choicesDiv.innerHTML = "";
  roundInfo.textContent = "GAME OVER";
  timerText.textContent = "";
  timeText.textContent = `Total Time: ${totalTime.toFixed(2)}s`;

  const name = prompt("Enter your name:");
  if (!name) return;

  leaderboard.push({
  name: name.slice(0, 12),
  time: parseFloat(totalTime.toFixed(2)),
  difficulty: getDifficultyName()
});
  leaderboard.sort((a, b) => a.time - b.time);
leaderboard = leaderboard.slice(0, 10);

const newIndex = leaderboard.findIndex(
  s => s.name === name.slice(0, 12) &&
       s.time === parseFloat(totalTime.toFixed(2))
);

localStorage.setItem("wtbLeaderboard", JSON.stringify(leaderboard));
renderLeaderboard(newIndex);
}

// ✅ LEADERBOARD RENDER
function renderLeaderboard() {
  leaderboardEl.innerHTML = "";
  if (leaderboard.length === 0) {
    leaderboardEl.innerHTML = "<li>No scores yet</li>";
    return;
  }

  leaderboard.forEach((e, i) => {
    const li = document.createElement("li");
    li.textContent = `#${i + 1} ${e.name} — ${e.time}s`;
    leaderboardEl.appendChild(li);
  });
}

// ✅ HELPERS
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
  if (!confirm("Clear all scores?")) return;

  localStorage.removeItem("wtbLeaderboard");
  leaderboard = [];
  renderLeaderboard();
}

function getDifficultyName() {
  if (difficulty === difficulties.easy) return "Easy";
  if (difficulty === difficulties.hard) return "Hard";
  return "Normal";
}
