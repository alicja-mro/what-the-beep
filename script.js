// ✅ END GAME (Firebase Integration)
function endGame() {
  // Disable gameplay button colors
  document.body.classList.remove('playing');

  // Clear UI elements
  choicesDiv.innerHTML = "";
  roundInfo.textContent = "GAME OVER";
  timerText.textContent = "";
  timeText.textContent = `Total Time: ${totalTime.toFixed(2)}s`;

  // Prompt for player name
  const name = prompt("Enter your name:", lastPlayerName || "");
  if (!name || name.trim() === "") {
      feedback.textContent = "Score not saved: Name is required.";
      return;
  }

  // Save cleaned name for next game
  lastPlayerName = name.trim().slice(0, 12);

  // Build score object using server timestamp
  const newScore = {
    name: lastPlayerName,
    time: parseFloat(totalTime.toFixed(2)), // number
    difficulty: getDifficultyName(),        // string
    timestamp: firebase.database.ServerValue.TIMESTAMP // server timestamp
  };

  // Debug log to check data before sending
  console.log("Saving score to Firebase:", newScore);

  // Push to Firebase Realtime Database
  const newScoreRef = leaderboardRef.push();
  newScoreRef.set(newScore)
    .then(() => {
      // Highlight new score in leaderboard
      renderLeaderboard(newScoreRef.key);
      feedback.textContent = "Score saved to global leaderboard!";
    })
    .catch((error) => {
      console.error("Error saving score to Firebase:", error);
      feedback.textContent = "Error saving score to global leaderboard.";
    });
}
