"use strict";

/* ======================
   Audio
====================== */
const bgm = document.getElementById("bgm");
const sfxScore = document.getElementById("sfxScore");

if (bgm) bgm.volume = 0.25;
if (sfxScore) sfxScore.volume = 0.8;

/* ======================
   Constants
====================== */
const IMAGE_BASE =
  "https://yongearn-dev.github.io/guess-word-game/images/";

const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

const DIFFICULTY_SCORE = {
  easy: 1,
  normal: 2,
  hard: 3,
  extreme: 5
};

const AUTO_DISTRIBUTION = {
  5:  { easy: 1, normal: 3, hard: 1, extreme: 0 },
  10: { easy: 2, normal: 5, hard: 2, extreme: 1 },
  15: { easy: 3, normal: 7, hard: 3, extreme: 2 }
};

/* ======================
   State
====================== */
let allQuestions = [];
let questionQueue = [];
let currentIndex = 0;

let teamScores = [];
let activeTeam = 0;

let timerInterval = null;
let remainingTime = 0;

let dataReady = false;

/* ======================
   Config
====================== */
const gameConfig = {
  mode: "standard",
  questionsPerRound: 10,
  timer: {
    enabled: false,
    perQuestion: 30,
    total: 180
  },
  extremeOnly: false,
  teams: 2
};

/* ======================
   DOM
====================== */
const setup = document.getElementById("setup");
const summary = document.getElementById("summary");
const game = document.getElementById("game");

const standardOptions = document.getElementById("standardOptions");
const timeAttackOptions = document.getElementById("timeAttackOptions");

const enablePerQuestionTimer = document.getElementById("enablePerQuestionTimer");
const perQuestionTimerOptions = document.getElementById("perQuestionTimerOptions");

const extremeOnly = document.getElementById("extremeOnly");
const teamSelect = document.getElementById("teamSelect");

const toSummaryBtn = document.getElementById("toSummaryBtn");
const startBtn = document.getElementById("startBtn");

const summaryList = document.getElementById("summaryList");

const questionTitle = document.getElementById("questionTitle");
const imageRow = document.getElementById("imageRow");
const answerBox = document.getElementById("answer");
const teamButtons = document.getElementById("teamButtons");
const toggleAnswerBtn = document.getElementById("toggleAnswerBtn");
const nextBtn = document.getElementById("nextBtn");
const timerBox = document.getElementById("timerBox");

/* ======================
   Load Data
====================== */
fetch(SHEET_URL)
  .then(r => r.json())
  .then(data => {
    allQuestions = data;
    dataReady = true;
    console.log("Questions loaded:", data.length);
  });

/* ======================
   Mode
====================== */
document.querySelectorAll("input[name=gameMode]").forEach(r => {
  r.onchange = () => {
    gameConfig.mode = r.value;
    standardOptions.classList.toggle("hidden", r.value !== "standard");
    timeAttackOptions.classList.toggle("hidden", r.value !== "timeAttack");
  };
});

/* ======================
   Timer Options
====================== */
enablePerQuestionTimer.onchange = () => {
  gameConfig.timer.enabled = enablePerQuestionTimer.checked;
  perQuestionTimerOptions.classList.toggle("hidden", !enablePerQuestionTimer.checked);
};

document.querySelectorAll("input[name=perQuestionTime]").forEach(r => {
  r.onchange = () => gameConfig.timer.perQuestion = Number(r.value);
});

document.querySelectorAll("input[name=totalTime]").forEach(r => {
  r.onchange = () => gameConfig.timer.total = Number(r.value);
});

/* ======================
   Summary
====================== */
toSummaryBtn.onclick = () => {
  gameConfig.questionsPerRound =
    Number(document.querySelector("input[name=qPerRound]:checked").value);
  gameConfig.teams = Number(teamSelect.value);
  gameConfig.extremeOnly = extremeOnly.checked;

  summaryList.innerHTML = `
    <li>🎮 Image Guess</li>
    <li>❓ Questions: ${gameConfig.mode === "standard" ? gameConfig.questionsPerRound : "Unlimited"}</li>
    <li>⚖️ Difficulty: ${gameConfig.extremeOnly ? "Extreme Only ⚠️" : "Mixed"}</li>
    <li>👥 Teams: ${gameConfig.teams}</li>
  `;

  setup.classList.add("hidden");
  summary.classList.remove("hidden");
};

/* ======================
   Start Game
====================== */
startBtn.onclick = () => {
  if (!dataReady) {
    alert("Loading questions, please wait...");
    return;
  }

  teamScores = new Array(gameConfig.teams).fill(0);
  activeTeam = 0;
  startTeam();
};

/* ======================
   Team Flow
====================== */
function startTeam() {
  currentIndex = 0;
  buildQuestionQueue();

  summary.classList.add("hidden");
  game.classList.remove("hidden");

  questionTitle.textContent =
    gameConfig.mode === "timeAttack"
      ? `Team ${activeTeam + 1}`
      : "Question";

  if (gameConfig.mode === "timeAttack") {
    startTotalTimer();
  } else {
    timerBox.classList.add("hidden");
  }

  loadQuestion();
}

function nextTeam() {
  clearInterval(timerInterval);
  activeTeam++;

  if (activeTeam < gameConfig.teams) {
    startTeam();
  } else {
    showEndScreen();
  }
}

/* ======================
   Queue
====================== */
function buildQuestionQueue() {
  let pool = gameConfig.extremeOnly
    ? allQuestions.filter(q => q.difficulty === "extreme")
    : [...allQuestions];

  shuffle(pool);

  if (gameConfig.mode === "timeAttack") {
    questionQueue = pool;
    return;
  }

  const dist = AUTO_DISTRIBUTION[gameConfig.questionsPerRound];
  questionQueue = [];

  Object.keys(dist).forEach(d => {
    questionQueue.push(...pool.filter(q => q.difficulty === d).slice(0, dist[d]));
  });

  shuffle(questionQueue);
}

/* ======================
   Question
====================== */
function loadQuestion() {
  const q = questionQueue[currentIndex];
  if (!q) {
    nextTeam();
    return;
  }

  imageRow.innerHTML = "";
  ["img1","img2","img3","img4"]
    .map(k => q[k])
    .filter(Boolean)
    .forEach(n => {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + n;
      imageRow.appendChild(img);
    });

  answerBox.textContent = q.answer;
  answerBox.classList.add("hidden");

  renderScoreButton(q.difficulty);

  if (gameConfig.mode === "standard" && gameConfig.timer.enabled) {
    startPerQuestionTimer();
  }
}

/* ======================
   Scoring
====================== */
function renderScoreButton(diff) {
  teamButtons.innerHTML = "";
  const pts = DIFFICULTY_SCORE[diff];
  const btn = document.createElement("button");
  btn.textContent = `+${pts} pts`;
  btn.onclick = () => {
    teamScores[activeTeam] += pts;
    sfxScore && sfxScore.play();
  };
  teamButtons.appendChild(btn);
}

/* ======================
   Timers
====================== */
function startPerQuestionTimer() {
  clearInterval(timerInterval);
  remainingTime = gameConfig.timer.perQuestion;
  timerBox.classList.remove("hidden", "warning");

  timerInterval = setInterval(() => {
    remainingTime--;
    timerBox.textContent = `⏱ ${remainingTime}`;
    if (remainingTime <= 5) timerBox.classList.add("warning");
    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      answerBox.classList.remove("hidden");
    }
  }, 1000);
}

function startTotalTimer() {
  clearInterval(timerInterval);
  remainingTime = gameConfig.timer.total;
  timerBox.classList.remove("hidden", "warning");

  timerInterval = setInterval(() => {
    remainingTime--;
    timerBox.textContent =
      `⏱ ${Math.floor(remainingTime / 60)}:${String(remainingTime % 60).padStart(2, "0")}`;
    if (remainingTime <= 10) timerBox.classList.add("warning");
    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      nextTeam();
    }
  }, 1000);
}

/* ======================
   Controls
====================== */
nextBtn.onclick = () => {
  currentIndex++;
  loadQuestion();
};

toggleAnswerBtn.onclick = () => {
  answerBox.classList.remove("hidden");
};

/* ======================
   End Screen
====================== */
function showEndScreen() {
  game.classList.add("hidden");
  summary.classList.remove("hidden");

  const ranked = teamScores
    .map((s, i) => ({ team: i + 1, score: s }))
    .sort((a, b) => b.score - a.score);

  summaryList.innerHTML = ranked.map((r, i) =>
    `<li>${["🥇","🥈","🥉"][i] || "🎮"} Team ${r.team} — ${r.score} pts</li>`
  ).join("");

  startBtn.textContent = "⬅ Back to Home";
  startBtn.onclick = () => location.reload();
}

/* ======================
   Utils
====================== */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
