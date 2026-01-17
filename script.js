"use strict";

/* ======================
   Audio
====================== */
const bgm = document.getElementById("bgm");
const sfxScore = document.getElementById("sfxScore");
const sfxNext = document.getElementById("sfxNext");

bgm.volume = 0.25;
sfxScore.volume = 0.8;
sfxNext.volume = 0.6;

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
  5:   { easy: 1, normal: 3, hard: 1, extreme: 0 },
  10:  { easy: 2, normal: 5, hard: 2, extreme: 1 },
  15:  { easy: 3, normal: 7, hard: 3, extreme: 2 }
};

/* ======================
   State
====================== */
let allQuestions = [];
let usedIds = new Set();
let questionQueue = [];
let currentIndex = 0;

let teamScores = [];
let scoredThisQuestion = new Set();

let timerInterval = null;
let remainingTime = 0;

/* ======================
   Config (single source)
====================== */
const gameConfig = {
  language: "",
  group: "",
  categories: [],

  mode: "standard", // standard | timeAttack

  questionsPerRound: 10,
  rounds: 1,

  timer: {
    enabled: false,
    perQuestion: 30,
    total: 300
  },

  advanced: false,
  extremeOnly: false,

  teams: 3
};

/* ======================
   DOM
====================== */
const setup = document.getElementById("setup");
const summary = document.getElementById("summary");
const game = document.getElementById("game");

const languageSelect = document.getElementById("languageSelect");
const groupSelect = document.getElementById("groupSelect");
const categorySelect = document.getElementById("categorySelect");

const standardOptions = document.getElementById("standardOptions");
const timeAttackOptions = document.getElementById("timeAttackOptions");

const enablePerQuestionTimer = document.getElementById("enablePerQuestionTimer");
const perQuestionTimerOptions = document.getElementById("perQuestionTimerOptions");

const advancedDifficulty = document.getElementById("advancedDifficulty");
const difficultyOptions = document.getElementById("difficultyOptions");
const extremeOnly = document.getElementById("extremeOnly");

const teamSelect = document.getElementById("teamSelect");

const toSummaryBtn = document.getElementById("toSummaryBtn");
const backToSetupBtn = document.getElementById("backToSetupBtn");
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
   Maps
====================== */
const GROUP_MAP = {
  zh: [
    { value: "bible", label: "聖經" },
    { value: "other", label: "其他" }
  ],
  th: [
    { value: "bible", label: "พระคัมภีร์" },
    { value: "other", label: "อื่นๆ" }
  ]
};

const CATEGORY_MAP = {
  bible: [
    { value: "person", label: "人物" },
    { value: "place", label: "地方" },
    { value: "vocab", label: "詞彙" }
  ],
  other: [
    { value: "travel", label: "旅行" },
    { value: "life", label: "生活" },
    { value: "food", label: "美食" },
    { value: "knowledge", label: "知識" }
  ]
};

/* ======================
   Init
====================== */
fetch(SHEET_URL)
  .then(r => r.json())
  .then(data => {
    allQuestions = data;
    console.log("Questions loaded:", data.length);
  });

/* ======================
   Language → Group
====================== */
languageSelect.onchange = () => {
  gameConfig.language = languageSelect.value;
  groupSelect.disabled = !gameConfig.language;
  groupSelect.innerHTML = `<option value="">Select group</option>`;
  categorySelect.innerHTML = "";
  gameConfig.categories = [];

  if (!gameConfig.language) return;

  GROUP_MAP[gameConfig.language].forEach(g => {
    const o = document.createElement("option");
    o.value = g.value;
    o.textContent = g.label;
    groupSelect.appendChild(o);
  });
};

groupSelect.onchange = () => {
  gameConfig.group = groupSelect.value;
  categorySelect.innerHTML = "";
  gameConfig.categories = [];

  if (!gameConfig.group) return;

  CATEGORY_MAP[gameConfig.group].forEach(c => {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = c.value;
    cb.onchange = () => {
      if (cb.checked) gameConfig.categories.push(cb.value);
      else gameConfig.categories =
        gameConfig.categories.filter(v => v !== cb.value);
    };
    label.appendChild(cb);
    label.append(" " + c.label);
    categorySelect.appendChild(label);
  });
};

/* ======================
   Mode Switch
====================== */
document.querySelectorAll("input[name=gameMode]").forEach(r => {
  r.onchange = () => {
    gameConfig.mode = r.value;
    standardOptions.classList.toggle("hidden", r.value !== "standard");
    timeAttackOptions.classList.toggle("hidden", r.value !== "timeAttack");
  };
});

/* ======================
   Timers
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
   Difficulty
====================== */
advancedDifficulty.onchange = () => {
  gameConfig.advanced = advancedDifficulty.checked;
  difficultyOptions.classList.toggle("hidden", !advancedDifficulty.checked);
};

extremeOnly.onchange = () => {
  gameConfig.extremeOnly = extremeOnly.checked;
};

/* ======================
   Summary
====================== */
toSummaryBtn.onclick = () => {
  gameConfig.questionsPerRound =
    Number(document.querySelector("input[name=qPerRound]:checked").value);
  gameConfig.rounds =
    Number(document.querySelector("input[name=roundCount]:checked").value);
  gameConfig.teams = Number(teamSelect.value);

  summaryList.innerHTML = `
    <li>🎮 Image Guess</li>
    <li>🌏 Language: ${gameConfig.language}</li>
    <li>📖 Content: ${gameConfig.group} | ${gameConfig.categories.join(", ")}</li>
    <li>❓ Questions: ${gameConfig.mode === "standard" ? gameConfig.questionsPerRound : "Unlimited"}</li>
    <li>⚖️ Difficulty: ${gameConfig.extremeOnly ? "Extreme Only ⚠️" : "Mixed"}</li>
    <li>👥 Teams: ${gameConfig.teams}</li>
    <li>⏱️ Timer: ${gameConfig.mode === "timeAttack"
      ? `${gameConfig.timer.total / 60} min`
      : gameConfig.timer.enabled ? `${gameConfig.timer.perQuestion}s / question` : "Off"}</li>
  `;

  setup.classList.add("hidden");
  summary.classList.remove("hidden");
};

backToSetupBtn.onclick = () => {
  summary.classList.add("hidden");
  setup.classList.remove("hidden");
};

/* ======================
   Start Game
====================== */
startBtn.onclick = () => {
  bgm.currentTime = 0;
  bgm.play().catch(() => {});

  teamScores = new Array(gameConfig.teams).fill(0);
  usedIds.clear();
  currentIndex = 0;

  buildQuestionQueue();

  summary.classList.add("hidden");
  game.classList.remove("hidden");

  if (gameConfig.mode === "timeAttack") startTotalTimer();
  loadQuestion();
};

/* ======================
   Question Queue
====================== */
function buildQuestionQueue() {
  let pool = allQuestions.filter(q => {
    if (q.language !== gameConfig.language) return false;
    if (q.group !== gameConfig.group) return false;
    if (gameConfig.categories.length &&
        !gameConfig.categories.includes(q.category)) return false;
    if (gameConfig.extremeOnly && q.difficulty !== "extreme") return false;
    return true;
  });

  shuffle(pool);

  if (gameConfig.mode === "timeAttack") {
    questionQueue = pool;
    return;
  }

  const dist = AUTO_DISTRIBUTION[gameConfig.questionsPerRound];
  questionQueue = [];

  Object.keys(dist).forEach(diff => {
    const subset = pool.filter(q => q.difficulty === diff).slice(0, dist[diff]);
    questionQueue.push(...subset);
  });

  shuffle(questionQueue);
}

/* ======================
   Load Question
====================== */
function loadQuestion() {
  const q = questionQueue[currentIndex];
  if (!q) {
    endGame();
    return;
  }

  scoredThisQuestion.clear();
  answerBox.classList.add("hidden");

  questionTitle.textContent = `Question ${currentIndex + 1}`;
  imageRow.innerHTML = "";

  ["img1","img2","img3","img4"]
    .map(k => q[k])
    .filter(Boolean)
    .forEach(name => {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + name;
      imageRow.appendChild(img);
    });

  answerBox.textContent = q.answer;

  renderTeams(q.difficulty);

  if (gameConfig.mode === "standard" && gameConfig.timer.enabled) {
    startPerQuestionTimer();
  }
}

/* ======================
   Teams / Scoring
====================== */
function renderTeams(difficulty) {
  teamButtons.innerHTML = "";
  const score = DIFFICULTY_SCORE[difficulty];

  teamScores.forEach((s, i) => {
    const btn = document.createElement("button");
    btn.textContent = `Team ${i + 1} +${score} (${s})`;
    btn.disabled = scoredThisQuestion.has(i);

    btn.onclick = () => {
      if (scoredThisQuestion.has(i)) return;
      teamScores[i] += score;
      scoredThisQuestion.add(i);
      sfxScore.currentTime = 0;
      sfxScore.play();
      renderTeams(difficulty);
    };

    teamButtons.appendChild(btn);
  });
}

/* ======================
   Timers
====================== */
function startPerQuestionTimer() {
  clearInterval(timerInterval);
  remainingTime = gameConfig.timer.perQuestion;
  timerBox.classList.remove("hidden","warning");
  timerBox.textContent = `⏱ ${remainingTime}`;

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
  timerBox.classList.remove("hidden","warning");

  timerInterval = setInterval(() => {
    remainingTime--;
    timerBox.textContent = `⏱ ${Math.floor(remainingTime / 60)}:${String(remainingTime % 60).padStart(2,"0")}`;
    if (remainingTime <= 10) timerBox.classList.add("warning");
    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

/* ======================
   Controls
====================== */
toggleAnswerBtn.onclick = () => {
  answerBox.classList.remove("hidden");
};

nextBtn.onclick = () => {
  sfxNext.currentTime = 0;
  sfxNext.play();
  currentIndex++;
  loadQuestion();
};

/* ======================
   End Game
====================== */
function endGame() {
  clearInterval(timerInterval);
  alert("Game Over");
  game.classList.add("hidden");
  setup.classList.remove("hidden");
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
