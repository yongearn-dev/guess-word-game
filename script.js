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

/* ======================
   State
====================== */
let allQuestions = [];
let availableQuestions = [];
let usedQuestionIds = new Set();
let roundQuestions = [];
let currentQuestionIndex = 0;
let currentRound = 1;

let currentIndex = 0;
let activeTeam = 0;
let teamScores = [];
let scoredTeamsThisQuestion = new Set();
let timerInterval = null;
let remainingTime = 0;

/* ======================
   Config
====================== */
const gameConfig = {
  gameType: "imageGuess",
  language: "",
  group: "",
  categories: [],
  questionsPerRound: 10,
  advancedDifficulty: false,
  extremeOnly: false,
  teamCount: 1,
  roundCount: 1,
  timerEnabled: false
};

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
   Load Data
====================== */
fetch(SHEET_URL)
  .then(r => r.json())
  .then(data => {
    allQuestions = data;
    resetQuestionPool();
  });

function resetQuestionPool() {
  availableQuestions = [...allQuestions];
  shuffle(availableQuestions);
}

/* ======================
   Mode / Settings
====================== */
document.querySelectorAll("input[name=gameMode]").forEach(r => {
  r.onchange = () => gameConfig.mode = r.value;
});

document.querySelectorAll("input[name=qPerRound]").forEach(r => {
  r.onchange = () => gameConfig.questionsPerRound = Number(r.value);
});

document.getElementById("enablePerQuestionTimer").onchange = e => {
  gameConfig.timer.enabled = e.target.checked;
};

document.querySelectorAll("input[name=perQuestionTime]").forEach(r => {
  r.onchange = () => gameConfig.timer.perQuestion = Number(r.value);
});

document.querySelectorAll("input[name=totalTime]").forEach(r => {
  r.onchange = () => gameConfig.timer.total = Number(r.value);
});

document.getElementById("teamSelect").onchange = e => {
  gameConfig.teams = Number(e.target.value);
};

/* ======================
   Mode UI Toggle
====================== */
const standardOptions = document.getElementById("standardOptions");
const timeAttackOptions = document.getElementById("timeAttackOptions");

function updateModeUI() {
  if (gameConfig.mode === "standard") {
    standardOptions.classList.remove("hidden");
    timeAttackOptions.classList.add("hidden");
  } else {
    standardOptions.classList.add("hidden");
    timeAttackOptions.classList.remove("hidden");

    // Time Attack 強制有時間（保險）
    gameConfig.timer.enabled = false;
  }
}

// 綁定 mode 切換
document.querySelectorAll("input[name=gameMode]").forEach(radio => {
  radio.addEventListener("change", () => {
    gameConfig.mode = radio.value;
    updateModeUI();
  });
});

// 初始化（避免一入畫面就錯）
updateModeUI();


/* ======================
   Summary
====================== */
toSummaryBtn.onclick = () => {
  summaryList.innerHTML = `
    <li>Mode: ${gameConfig.mode}</li>
    <li>Teams: ${gameConfig.teams}</li>
    <li>Timer: ${
      gameConfig.mode === "standard"
        ? (gameConfig.timer.enabled ? `Per Question ${gameConfig.timer.perQuestion}s` : "Off")
        : `${gameConfig.timer.total / 60} min per team`
    }</li>
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
  bgm?.play().catch(()=>{});

  teamScores = new Array(gameConfig.teams).fill(0);
  activeTeam = 0;
  currentIndex = 0;
  usedQuestionIds.clear();
  resetQuestionPool();

  summary.classList.add("hidden");
  game.classList.remove("hidden");

function startTeamTurn(){
  currentIndex=0;
  buildQueue();
  loadQuestion();

  if(gameConfig.mode==="timeAttack"){
    startTotalTimer();
    questionTitle.textContent=`Team ${activeTeam+1}`;
  }
}

/* ======================
   Question Logic
====================== */
function getNextQuestion() {
  if (!availableQuestions.length) {
    resetQuestionPool(); // allow repeat only if exhausted
  }
  const q = availableQuestions.shift();
  usedQuestionIds.add(q.id);
  return q;
}

let currentQuestion = null;

function loadQuestion() {
  clearInterval(timerInterval);

  if (
    gameConfig.mode === "standard" &&
    currentIndex >= gameConfig.questionsPerRound
  ) {
    return showEndScreen();
  }

  currentQuestion = getNextQuestion();
  currentIndex++;

  imageRow.innerHTML = "";
  ["img1","img2","img3","img4"]
    .map(k => currentQuestion[k])
    .filter(Boolean)
    .forEach(n => {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + n;
      imageRow.appendChild(img);
    });

  answerBox.textContent = currentQuestion.answer;
  answerBox.classList.add("hidden");

  renderScoreButtons(currentQuestion.difficulty);

  if (gameConfig.mode === "standard" && gameConfig.timer.enabled) {
    startPerQuestionTimer();
  }
}

/* ======================
   Timers
====================== */
function startPerQuestionTimer() {
  remainingTime = gameConfig.timer.perQuestion;
  timerBox.classList.remove("hidden","warning");

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

function startTimeAttackTeam() {
  questionTitle.textContent = `Team ${activeTeam + 1}`;
  currentIndex = 0;
  startTotalTimer();
  loadQuestion();
}

function startTotalTimer() {
  clearInterval(timerInterval);
  remainingTime = gameConfig.timer.total;
  timerBox.classList.remove("hidden","warning");

  timerInterval = setInterval(() => {
    remainingTime--;
    timerBox.textContent =
      `⏱ ${Math.floor(remainingTime / 60)}:${String(remainingTime % 60).padStart(2,"0")}`;

    if (remainingTime <= 10) timerBox.classList.add("warning");

    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      activeTeam++;
      if (activeTeam >= gameConfig.teams) {
        showEndScreen();
      } else {
        startTimeAttackTeam();
      }
    }
  }, 1000);
}

/* ======================
   Scoring
====================== */
function renderScoreButtons(diff) {
  teamButtons.innerHTML = "";
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
   End Screen
====================== */
function showEndScreen() {
  clearInterval(timerInterval);
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
