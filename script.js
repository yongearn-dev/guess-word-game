"use strict";

/* ======================
   Audio
====================== */
const bgm = document.getElementById("bgm");
const sfxScore = document.getElementById("sfxScore");
const sfxNext = document.getElementById("sfxNext");

if (bgm) bgm.volume = 0.25;
if (sfxScore) sfxScore.volume = 0.8;
if (sfxNext) sfxNext.volume = 0.6;

/* ======================
   Constants
====================== */
const IMAGE_BASE = "https://yongearn-dev.github.io/guess-word-game/images/";
const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

const DIFFICULTY_SCORE = {
  easy: 1,
  normal: 2,
  hard: 3,
  extreme: 5
};

/* ======================
   State
====================== */
let allQuestions = [];
let availableQuestions = [];

let currentIndex = 0;
let activeTeam = 0;
let teamScores = [];
let timerInterval = null;
let remainingTime = 0;
let currentQuestion = null;

/* ======================
   Config
====================== */
const gameConfig = {
  mode: "standard",
  language: "",
  group: "",
  categories: [],
  questionsPerRound: 10,
  teams: 3,
  timer: {
    enabled: false,
    perQuestion: 30,
    total: 300
  }
};

/* ======================
   DOM
====================== */
const setup = document.getElementById("setup");
const summary = document.getElementById("summary");
const game = document.getElementById("game");

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

const languageSelect = document.getElementById("languageSelect");
const groupSelect = document.getElementById("groupSelect");
const categorySelect = document.getElementById("categorySelect");

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
   Load Data
====================== */
fetch(SHEET_URL)
  .then(r => r.json())
  .then(data => {
    allQuestions = data;
  });

/* ======================
   Language / Group / Category
====================== */
languageSelect.onchange = () => {
  gameConfig.language = languageSelect.value;
  groupSelect.disabled = !gameConfig.language;
  groupSelect.innerHTML = `<option value="">Select group</option>`;
  categorySelect.innerHTML = "";

  (GROUP_MAP[gameConfig.language] || []).forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.value;
    opt.textContent = g.label;
    groupSelect.appendChild(opt);
  });
};

groupSelect.onchange = () => {
  gameConfig.group = groupSelect.value;
  categorySelect.innerHTML = "";

  (CATEGORY_MAP[gameConfig.group] || []).forEach(c => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${c.value}"> ${c.label}`;
    label.querySelector("input").onchange = updateCategories;
    categorySelect.appendChild(label);
  });
};

function updateCategories() {
  gameConfig.categories = Array.from(
    categorySelect.querySelectorAll("input:checked")
  ).map(i => i.value);
}

/* ======================
   Question Pool
====================== */
function resetQuestionPool() {
  availableQuestions = allQuestions.filter(q => {
    if (gameConfig.language && q.language !== gameConfig.language) return false;
    if (gameConfig.group && q.group !== gameConfig.group) return false;
    if (
      gameConfig.categories.length &&
      !gameConfig.categories.includes(q.category)
    )
      return false;
    return true;
  });

  if (!availableQuestions.length) {
    availableQuestions = [...allQuestions];
  }
  shuffle(availableQuestions);
}

/* ======================
   Mode / Settings
====================== */
document.querySelectorAll("input[name=gameMode]").forEach(r => {
  r.onchange = () => {
    gameConfig.mode = r.value;
    updateModeUI();
  };
});

document.querySelectorAll("input[name=qPerRound]").forEach(r => {
  r.onchange = () => (gameConfig.questionsPerRound = Number(r.value));
});

document.getElementById("enablePerQuestionTimer").onchange = e => {
  gameConfig.timer.enabled = e.target.checked;
};

document.querySelectorAll("input[name=perQuestionTime]").forEach(r => {
  r.onchange = () => (gameConfig.timer.perQuestion = Number(r.value));
});

document.querySelectorAll("input[name=totalTime]").forEach(r => {
  r.onchange = () => (gameConfig.timer.total = Number(r.value));
});

document.getElementById("teamSelect").onchange = e => {
  gameConfig.teams = Number(e.target.value);
};

const standardOptions = document.getElementById("standardOptions");
const timeAttackOptions = document.getElementById("timeAttackOptions");

function updateModeUI() {
  if (gameConfig.mode === "standard") {
    standardOptions.classList.remove("hidden");
    timeAttackOptions.classList.add("hidden");
  } else {
    standardOptions.classList.add("hidden");
    timeAttackOptions.classList.remove("hidden");
    gameConfig.timer.enabled = false;
  }
}
updateModeUI();

/* ======================
   Summary
====================== */
toSummaryBtn.onclick = () => {
  summaryList.innerHTML = `
    <li>Mode: ${gameConfig.mode}</li>
    <li>Teams: ${gameConfig.teams}</li>
  `;
  setup.classList.add("hidden");
  summary.classList.remove("hidden");
};

/* ======================
   Start Game
====================== */
startBtn.onclick = () => {
  bgm?.play().catch(() => {});
  teamScores = new Array(gameConfig.teams).fill(0);
  activeTeam = 0;
  currentIndex = 0;
  resetQuestionPool();

  summary.classList.add("hidden");
  game.classList.remove("hidden");

  gameConfig.mode === "timeAttack"
    ? waitForNextTeam()
    : loadQuestion();
};

/* ======================
   Questions
====================== */
function getNextQuestion() {
  if (!availableQuestions.length) resetQuestionPool();
  return availableQuestions.shift();
}

function loadQuestion() { 
   if (gameConfig.mode === "standard") 
      clearInterval(timerInterval); 
   if ( gameConfig.mode === "standard" && currentIndex >= gameConfig.questionsPerRound ) 
   { return showEndScreen(); } currentQuestion = getNextQuestion(); currentIndex++;

imageRow.innerHTML = "";

const images = ["img1", "img2", "img3", "img4"]
  .map(k => currentQuestion[k])
  .filter(Boolean);

images.forEach((filename, index) => {
  // 圖片
  const img = document.createElement("img");
  img.src = IMAGE_BASE + filename;
  imageRow.appendChild(img);

  // 圖片之間加 "+"
  if (index < images.length - 1) {
    const plus = document.createElement("span");
    plus.className = "operator";
    plus.textContent = "＋";
    imageRow.appendChild(plus);
  }
});

// 最後加 "= ?"
const equal = document.createElement("span");
equal.className = "operator result";
equal.textContent = "＝ ?";
imageRow.appendChild(equal);


  answerBox.textContent = currentQuestion.answer;
  answerBox.classList.add("hidden");

  renderScoreButtons(currentQuestion.difficulty);

  if (gameConfig.mode === "standard" && gameConfig.timer.enabled) {
    startPerQuestionTimer();
  }
}

/* ======================
   Time Attack Flow
====================== */
function waitForNextTeam() {
  clearInterval(timerInterval);

  questionTitle.textContent = `Team ${activeTeam + 1} 準備`;
  imageRow.innerHTML = "";
  answerBox.classList.add("hidden");
  teamButtons.innerHTML = "";
  timerBox.classList.add("hidden");

  nextBtn.textContent = `▶ Start Team ${activeTeam + 1}`;
  nextBtn.onclick = () => {
    nextBtn.textContent = "Next ▶";
    nextBtn.onclick = () => loadQuestion();
    startTimeAttackTeam();
  };
}

function startTimeAttackTeam() {
  questionTitle.textContent = `Team ${activeTeam + 1}`;
  currentIndex = 0;
  startTotalTimer();
  loadQuestion();
}

function startTotalTimer() {
  clearInterval(timerInterval);
  remainingTime = gameConfig.timer.total;
  timerBox.classList.remove("hidden", "warning");

  timerInterval = setInterval(() => {
    remainingTime--;
    timerBox.textContent = `⏱ ${Math.floor(remainingTime / 60)}:${String(
      remainingTime % 60
    ).padStart(2, "0")}`;

    if (remainingTime <= 10) timerBox.classList.add("warning");

    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      activeTeam++;
      activeTeam >= gameConfig.teams
        ? showEndScreen()
        : waitForNextTeam();
    }
  }, 1000);
}

/* ======================
   Scoring
====================== */
function renderScoreButtons(diff) {
  teamButtons.innerHTML = "";

  if (gameConfig.mode === "timeAttack") {
    const i = activeTeam;
    const btn = document.createElement("button");
    btn.textContent = `Team ${i + 1} +${DIFFICULTY_SCORE[diff]}`;
    btn.onclick = () => {
      teamScores[i] += DIFFICULTY_SCORE[diff];
      sfxScore?.play();
    };
    teamButtons.appendChild(btn);
    return;
  }

  for (let i = 0; i < gameConfig.teams; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Team ${i + 1} +${DIFFICULTY_SCORE[diff]}`;
    btn.onclick = () => {
      teamScores[i] += DIFFICULTY_SCORE[diff];
      sfxScore?.play();
    };
    teamButtons.appendChild(btn);
  }
}

/* ======================
   Controls
====================== */
nextBtn.onclick = () => loadQuestion();
toggleAnswerBtn.onclick = () => answerBox.classList.remove("hidden");

/* ======================
   End
====================== */
function showEndScreen() {
  clearInterval(timerInterval);
  game.classList.add("hidden");
  summary.classList.remove("hidden");

  summaryList.innerHTML = teamScores
    .map((s, i) => ({ team: i + 1, score: s }))
    .sort((a, b) => b.score - a.score)
    .map(
      (r, i) =>
        `<li>${["🥇", "🥈", "🥉"][i] || "🎮"} Team ${r.team} — ${r.score}</li>`
    )
    .join("");

  startBtn.textContent = "⬅ Back to Home";
  startBtn.onclick = () => location.reload();
}

/* ======================
   Utils
====================== */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
