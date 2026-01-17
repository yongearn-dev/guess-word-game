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

/* ======================
   Game Config（Single Source）
====================== */
const gameConfig = {
  gameType: "imageGuess",

  // mode
  gameMode: "standard", // standard | timed

  // content
  language: "",
  group: "",
  categories: [],

  // rounds & questions
  questionsPerRound: 10,
  roundCount: 1,

  // difficulty
  advancedDifficulty: false,
  extremeOnly: false,

  // players
  playMode: "simultaneous", // simultaneous | turn
  teamCount: 1,

  // scoring
  scoreMode: "standard",

  // timer
  timerEnabled: false,
  timerMode: "perQuestion", // perQuestion | perTeam
  perQuestionTime: 30,
  perTeamTime: 300 // seconds
};

/* ======================
   Difficulty Presets
====================== */
const DIFFICULTY_PRESET = {
  5:  { easy: 1, normal: 3, hard: 1, extreme: 0 },
  10: { easy: 2, normal: 5, hard: 2, extreme: 1 },
  15: { easy: 3, normal: 7, hard: 3, extreme: 2 }
};

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
let usedQuestionIds = new Set();
let roundQuestions = [];
let currentQuestionIndex = 0;
let currentRound = 1;

let teamScores = [];
let scoredTeamsThisQuestion = new Set();

let timer = 0;
let timerInterval = null;
let teamTimeLeft = [];

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
   DOM
====================== */
const setup = document.getElementById("setup");
const summary = document.getElementById("summary");
const game = document.getElementById("game");

const languageSelect = document.getElementById("languageSelect");
const groupSelect = document.getElementById("groupSelect");
const categorySelectBox = document.getElementById("categorySelect");

const qPerRoundSelect = document.getElementById("qPerRoundSelect");
const advancedDifficulty = document.getElementById("advancedDifficulty");
const difficultyOptions = document.getElementById("difficultyOptions");
const extremeOnly = document.getElementById("extremeOnly");

const teamSelect = document.getElementById("teamSelect");
const roundSelect = document.getElementById("roundSelect");

const enableTimer = document.getElementById("enableTimer");
const timerOptions = document.getElementById("timerOptions");

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
   Init
====================== */
fetch(SHEET_URL)
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
    console.log("題庫載入完成:", data.length);
  });

/* ======================
   Language → Group
====================== */
languageSelect.addEventListener("change", () => {
  gameConfig.language = languageSelect.value;
  groupSelect.innerHTML = `<option value="">選擇內容大類</option>`;
  categorySelectBox.innerHTML = "";
  groupSelect.disabled = !gameConfig.language;

  if (!gameConfig.language) return;

  GROUP_MAP[gameConfig.language].forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.value;
    opt.textContent = g.label;
    groupSelect.appendChild(opt);
  });
});

/* ======================
   Group → Categories
====================== */
groupSelect.addEventListener("change", () => {
  gameConfig.group = groupSelect.value;
  categorySelectBox.innerHTML = "";
  gameConfig.categories = [];

  if (!gameConfig.group) return;

  CATEGORY_MAP[gameConfig.group].forEach(c => {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = c.value;

    cb.onchange = () => {
      if (cb.checked) {
        gameConfig.categories.push(cb.value);
      } else {
        gameConfig.categories =
          gameConfig.categories.filter(v => v !== cb.value);
      }
    };

    label.appendChild(cb);
    label.append(" " + c.label);
    categorySelectBox.appendChild(label);
  });
});

/* ======================
   Difficulty
====================== */
advancedDifficulty.onchange = () => {
  gameConfig.advancedDifficulty = advancedDifficulty.checked;
  difficultyOptions.classList.toggle("hidden", !advancedDifficulty.checked);
};

extremeOnly.onchange = () => {
  gameConfig.extremeOnly = extremeOnly.checked;
};

/* ======================
   Timer
====================== */
enableTimer.onchange = () => {
  gameConfig.timerEnabled = enableTimer.checked;
  timerOptions.classList.toggle("hidden", !enableTimer.checked);
};

/* ======================
   Summary
====================== */
toSummaryBtn.onclick = () => {
  gameConfig.questionsPerRound = Number(qPerRoundSelect.value);
  gameConfig.teamCount = Number(teamSelect.value);
  gameConfig.roundCount =
    roundSelect.value === "custom" ? 1 : Number(roundSelect.value);

  summaryList.innerHTML = `
    <li>🎮 遊戲類型：看圖估字</li>
    <li>🎯 模式：${gameConfig.gameMode === "timed" ? "限時模式" : "標準模式"}</li>
    <li>🌏 語言：${gameConfig.language}</li>
    <li>📖 內容：${gameConfig.group}｜${gameConfig.categories.join(" + ")}</li>
    <li>❓ 題數：${gameConfig.gameMode === "timed" ? "不限" : gameConfig.questionsPerRound}</li>
    <li>⚖️ 難度：${gameConfig.extremeOnly ? "⚠️ Extreme Only" : "混合"}</li>
    <li>👥 組別：${gameConfig.teamCount} 組</li>
    <li>⏱️ 計時：${gameConfig.timerEnabled ? "開" : "關"}</li>
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

  teamScores = new Array(gameConfig.teamCount).fill(0);
  teamTimeLeft = new Array(gameConfig.teamCount).fill(gameConfig.perTeamTime);

  usedQuestionIds.clear();
  currentRound = 1;

  summary.classList.add("hidden");
  game.classList.remove("hidden");

  startRound();
};

/* ======================
   Game Flow
====================== */
function startRound() {
  currentQuestionIndex = 0;
  scoredTeamsThisQuestion.clear();

  const pool = allQuestions.filter(q => {
    if (usedQuestionIds.has(q.id)) return false;
    if (q.language !== gameConfig.language) return false;
    if (q.group !== gameConfig.group) return false;
    if (
      gameConfig.categories.length &&
      !gameConfig.categories.includes(q.category)
    ) return false;
    if (gameConfig.extremeOnly && q.difficulty !== "extreme") return false;
    return true;
  });

  shuffle(pool);

  if (gameConfig.gameMode === "standard") {
    roundQuestions = pickByDifficulty(pool);
    roundQuestions.forEach(q => usedQuestionIds.add(q.id));
  } else {
    roundQuestions = pool;
  }

  loadQuestion();
}

function pickByDifficulty(pool) {
  if (gameConfig.extremeOnly) {
    return pool.slice(0, gameConfig.questionsPerRound);
  }

  const preset = DIFFICULTY_PRESET[gameConfig.questionsPerRound];
  let result = [];

  Object.keys(preset).forEach(level => {
    const count = preset[level];
    const candidates = pool.filter(q => q.difficulty === level);
    result = result.concat(candidates.slice(0, count));
  });

  shuffle(result);
  return result;
}

function loadQuestion() {
  const q = roundQuestions[currentQuestionIndex];
  if (!q) return;

  startTimer();
  scoredTeamsThisQuestion.clear();

  questionTitle.innerText =
    `第 ${currentRound} 輪 · 第 ${currentQuestionIndex + 1} 題`;

  imageRow.innerHTML = "";
  ["img1", "img2", "img3", "img4"]
    .map(k => q[k])
    .filter(Boolean)
    .forEach((name, i, arr) => {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + name;
      imageRow.appendChild(img);
      if (i < arr.length - 1) {
        imageRow.appendChild(document.createTextNode(" ＋ "));
      }
    });
  imageRow.appendChild(document.createTextNode(" ＝？"));

  answerBox.innerText = q.answer;
  answerBox.classList.add("hidden");

  renderTeams(q);
}

/* ======================
   Timer
====================== */
function startTimer() {
  clearInterval(timerInterval);

  if (!gameConfig.timerEnabled) {
    timerBox.classList.add("hidden");
    return;
  }

  timer = gameConfig.perQuestionTime;
  timerBox.classList.remove("hidden", "warning");
  timerBox.innerText = `⏱ ${timer}`;

  timerInterval = setInterval(() => {
    timer--;
    timerBox.innerText = `⏱ ${timer}`;
    if (timer <= 5) timerBox.classList.add("warning");
    if (timer <= 0) {
      clearInterval(timerInterval);
      answerBox.classList.remove("hidden");
    }
  }, 1000);
}

/* ======================
   Teams
====================== */
function renderTeams(question) {
  teamButtons.innerHTML = "";

  for (let i = 0; i < gameConfig.teamCount; i++) {
    const btn = document.createElement("button");
    const score =
      gameConfig.extremeOnly
        ? 5
        : DIFFICULTY_SCORE[question.difficulty];

    btn.innerText = `第 ${i + 1} 組 +${score}（${teamScores[i]}）`;
    btn.disabled = scoredTeamsThisQuestion.has(i);

    btn.onclick = () => {
      if (scoredTeamsThisQuestion.has(i)) return;
      teamScores[i] += score;
      scoredTeamsThisQuestion.add(i);
      sfxScore.currentTime = 0;
      sfxScore.play();
      renderTeams(question);
    };

    teamButtons.appendChild(btn);
  }
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

  currentQuestionIndex++;

  if (
    gameConfig.gameMode === "standard" &&
    currentQuestionIndex >= roundQuestions.length
  ) {
    currentRound++;
    if (currentRound > gameConfig.roundCount) {
      alert("🎉 遊戲完成");
      game.classList.add("hidden");
      setup.classList.remove("hidden");
    } else {
      startRound();
    }
    return;
  }

  loadQuestion();
};

/* ======================
   Utils
====================== */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
