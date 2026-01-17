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
const IMAGE_BASE = "https://yongearn-dev.github.io/guess-word-game/images/";
const SHEET_URL = "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

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

/* ======================
   Config
====================== */
const gameConfig = {
  language: "",
  group: "",
  categories: [],

  mode: "standard",
  questionsPerRound: 10,

  timer: {
    enabled: false,
    perQuestion: 30,
    total: 300
  },

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
   Load Data
====================== */
fetch(SHEET_URL)
  .then(r => r.json())
  .then(data => allQuestions = data);

/* ======================
   Language / Group / Category
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
      cb.checked
        ? gameConfig.categories.push(cb.value)
        : gameConfig.categories = gameConfig.categories.filter(v => v !== cb.value);
    };
    label.append(cb, " " + c.label);
    categorySelect.appendChild(label);
  });
};

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
   Difficulty
====================== */
advancedDifficulty.onchange = () => {
  difficultyOptions.classList.toggle("hidden", !advancedDifficulty.checked);
  gameConfig.extremeOnly = false;
  extremeOnly.checked = false;
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
  gameConfig.teams = Number(teamSelect.value);

  summaryList.innerHTML = `
    <li>Mode: ${gameConfig.mode}</li>
    <li>Questions: ${gameConfig.mode === "standard" ? gameConfig.questionsPerRound : "Unlimited"}</li>
    <li>Teams: ${gameConfig.teams}</li>
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
  bgm.play().catch(()=>{});

  teamScores = new Array(gameConfig.teams).fill(0);
  activeTeam = 0;
  currentIndex = 0;

  buildQuestionQueue();

  summary.classList.add("hidden");
  game.classList.remove("hidden");

  if (gameConfig.mode === "timeAttack") startTotalTimer();
  loadQuestion();
};

/* ======================
   Queue
====================== */
function buildQuestionQueue() {
  let pool = allQuestions.filter(q => {
    if (gameConfig.language && q.language !== gameConfig.language) return false;
    if (gameConfig.group && q.group !== gameConfig.group) return false;
    if (gameConfig.categories.length && !gameConfig.categories.includes(q.category)) return false;
    if (gameConfig.extremeOnly && q.difficulty !== "extreme") return false;
    return true;
  });

  if (!pool.length) pool = [...allQuestions];
  shuffle(pool);

  if (gameConfig.mode === "standard") {
    const dist = AUTO_DISTRIBUTION[gameConfig.questionsPerRound];
    questionQueue = [];
    Object.keys(dist).forEach(d => {
      questionQueue.push(...pool.filter(q => q.difficulty === d).slice(0, dist[d]));
    });
    shuffle(questionQueue);
  } else {
    questionQueue = pool;
  }
}

/* ======================
   Question
====================== */
function loadQuestion() {
  if (gameConfig.mode === "standard" && currentIndex >= gameConfig.questionsPerRound) {
    return showEndScreen();
  }

  const q = questionQueue[currentIndex % questionQueue.length];
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

  renderScoreButtons(q.difficulty);
}

/* ======================
   Scoring
====================== */
function renderScoreButtons(diff) {
  teamButtons.innerHTML = "";
  for (let i = 0; i < gameConfig.teams; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Team ${i+1} +${DIFFICULTY_SCORE[diff]}`;
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
nextBtn.onclick = () => {
  currentIndex++;
  loadQuestion();
};

toggleAnswerBtn.onclick = () => {
  answerBox.classList.remove("hidden");
};

/* ======================
   Timer (Time Attack)
====================== */
function startTotalTimer() {
  remainingTime = gameConfig.timer.total;
  timerBox.classList.remove("hidden");

  timerInterval = setInterval(() => {
    remainingTime--;
    timerBox.textContent =
      `⏱ ${Math.floor(remainingTime/60)}:${String(remainingTime%60).padStart(2,"0")}`;
    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      activeTeam++;
      if (activeTeam >= gameConfig.teams) showEndScreen();
      else startTotalTimer();
    }
  }, 1000);
}

/* ======================
   End
====================== */
function showEndScreen() {
  game.classList.add("hidden");
  summary.classList.remove("hidden");

  summaryList.innerHTML = teamScores
    .map((s,i)=>({team:i+1,score:s}))
    .sort((a,b)=>b.score-a.score)
    .map((r,i)=>`<li>${["🥇","🥈","🥉"][i]||"🎮"} Team ${r.team} — ${r.score}</li>`)
    .join("");

  startBtn.textContent = "⬅ Back to Home";
  startBtn.onclick = () => location.reload();
}

/* ======================
   Utils
====================== */
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
