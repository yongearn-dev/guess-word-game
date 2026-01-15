// ======================
// Audio
// ======================
const bgm = document.getElementById("bgm");
const sfxScore = document.getElementById("sfxScore");
const sfxNext = document.getElementById("sfxNext");

bgm.volume = 0.25;
sfxScore.volume = 0.8;
sfxNext.volume = 0.6;

// ======================
// Sheet
// ======================
const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

// ======================
// DOM
// ======================
const setup = document.getElementById("setup");
const game = document.getElementById("game");

const gameSelect = document.getElementById("gameSelect");
const groupSelect = document.getElementById("groupSelect");
const languageSelect = document.getElementById("languageSelect");
const categorySelect = document.getElementById("categorySelect");

const teamSelect = document.getElementById("teamSelect");
const roundCountSelect = document.getElementById("roundCount");
const questionPerRoundSelect = document.getElementById("questionPerRound");

const enableTimer = document.getElementById("enableTimer");
const timerMode = document.getElementById("timerMode");
const teamMinutes = document.getElementById("teamMinutes");

const startBtn = document.getElementById("startBtn");

const questionTitle = document.getElementById("questionTitle");
const imageRow = document.getElementById("imageRow");
const toggleAnswerBtn = document.getElementById("toggleAnswerBtn");
const answerBox = document.getElementById("answer");
const nextBtn = document.getElementById("nextBtn");

const teamButtons = document.getElementById("teamButtons");
const teamTimerBox = document.getElementById("teamTimer");

// ======================
// State
// ======================
let allQuestions = [];
let usedQuestionIds = new Set();

let questions = [];
let current = 0;

let teamCount = 1;
let teamScores = [];

let roundCount = 1;
let questionsPerRound = 10;
let currentRound = 1;

let scoredTeamsThisQuestion = new Set();

// Timer
let teamTimeLeft = [];
let timerInterval = null;
let activeTeamIndex = 0;

// ======================
// Load Sheet
// ======================
fetch(SHEET_URL)
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
    updateCategoryOptions();
  });

// ======================
// Category Dynamic
// ======================
function updateCategoryOptions() {
  const group = groupSelect.value;
  const lang = languageSelect.value;

  const categories = new Set(
    allQuestions
      .filter(q => q.group === group && q.language === lang)
      .map(q => q.category)
  );

  categorySelect.innerHTML = "";
  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.innerText = c;
    categorySelect.appendChild(opt);
  });
}

groupSelect.onchange = updateCategoryOptions;
languageSelect.onchange = updateCategoryOptions;

// ======================
// Start Game
// ======================
startBtn.onclick = () => {
  if (document.getElementById("enableAudio").checked) {
    bgm.play();
  }

  teamCount = Number(teamSelect.value);
  roundCount = Number(roundCountSelect.value);
  questionsPerRound = Number(questionPerRoundSelect.value);

  teamScores = new Array(teamCount).fill(0);
  currentRound = 1;

  setup.classList.add("hidden");
  game.classList.remove("hidden");

  startRound();
};

// ======================
// Start Round
// ======================
function startRound() {
  current = 0;

  const pool = allQuestions.filter(q =>
    q.game === gameSelect.value &&
    q.group === groupSelect.value &&
    q.language === languageSelect.value &&
    q.category === categorySelect.value &&
    !usedQuestionIds.has(q.id)
  );

  shuffle(pool);
  questions = pool.slice(0, questionsPerRound);
  questions.forEach(q => usedQuestionIds.add(q.id));

  initTeamTimers();
  loadQuestion();
}

// ======================
// Load Question
// ======================
function loadQuestion() {
  const q = questions[current];
  if (!q) return;

  scoredTeamsThisQuestion.clear();

  questionTitle.innerText =
    `第 ${currentRound} 輪 · 第 ${current + 1} 題`;

  imageRow.innerHTML = "";

  ["img1", "img2", "img3", "img4"]
    .map(k => q[k])
    .filter(Boolean)
    .forEach((src, i, arr) => {
      const img = document.createElement("img");
      img.src =
        "https://yongearn-dev.github.io/guess-word-game/images/" + src;
      imageRow.appendChild(img);
      if (i < arr.length - 1) {
        imageRow.appendChild(document.createTextNode(" ＋ "));
      }
    });

  const eq = document.createElement("span");
  eq.innerText = " = ?";
  imageRow.appendChild(eq);

  answerBox.innerText = q.answer;
  answerBox.classList.add("hidden");
  nextBtn.classList.add("hidden");

  renderTeams();
}

// ======================
// Teams
// ======================
function renderTeams() {
  teamButtons.innerHTML = "";

  for (let i = 0; i < teamCount; i++) {
    const btn = document.createElement("button");
    btn.innerText = `第 ${i + 1} 組 +${getScoreValue()} 分（${teamScores[i]}）`;

    btn.onclick = () => {
      if (scoredTeamsThisQuestion.has(i)) return;

      teamScores[i] += getScoreValue();
      scoredTeamsThisQuestion.add(i);

      sfxScore.currentTime = 0;
      sfxScore.play();

      renderTeams();
    };

    teamButtons.appendChild(btn);
  }
}

function getScoreValue() {
  return 2; // 之後再接 difficulty
}

// ======================
// Answer / Next
// ======================
toggleAnswerBtn.onclick = () => {
  answerBox.classList.remove("hidden");
  nextBtn.classList.remove("hidden");
};

nextBtn.onclick = () => {
  sfxNext.currentTime = 0;
  sfxNext.play();

  current++;

  if (current >= questions.length) {
    currentRound++;

    if (currentRound > roundCount) {
      alert("🎉 遊戲完成！");
      location.reload();
    } else {
      startRound();
    }
  } else {
    loadQuestion();
  }
};

// ======================
// Timer (per team)
// ======================
function initTeamTimers() {
  clearInterval(timerInterval);

  if (!enableTimer.checked || timerMode.value !== "perTeam") {
    teamTimerBox.classList.add("hidden");
    return;
  }

  teamTimerBox.classList.remove("hidden");

  teamTimeLeft = new Array(teamCount).fill(
    Number(teamMinutes.value) * 60
  );

  activeTeamIndex = 0;
  updateTeamTimerUI();

  timerInterval = setInterval(() => {
    teamTimeLeft[activeTeamIndex]--;
    updateTeamTimerUI();

    if (teamTimeLeft[activeTeamIndex] <= 0) {
      activeTeamIndex++;
      if (activeTeamIndex >= teamCount) {
        clearInterval(timerInterval);
      }
    }
  }, 1000);
}

function updateTeamTimerUI() {
  const t = teamTimeLeft[activeTeamIndex];
  const m = String(Math.floor(t / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");

  teamTimerBox.innerText =
    `⏱ 第 ${activeTeamIndex + 1} 組：${m}:${s}`;
}

// ======================
// Utils
// ======================
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
