// ======================
// 設定
// ======================
const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

const IMAGE_BASE_URL =
  "https://yongearn-dev.github.io/guess-word-game/images/";

const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 30; // 秒

const DIFFICULTY_SCORE = {
  easy: 1,
  normal: 2,
  hard: 3,
  extreme: 5
};

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
// 狀態
// ======================
let allQuestions = [];
let questions = [];
let current = 0;

let teamCount = 1;
let teamScores = [];

let usedQuestionIds = new Set(); // 跨回合記錄
let timer = null;
let timeLeft = TIME_PER_QUESTION;
let timeUp = false;

// ======================
// DOM
// ======================
const home = document.getElementById("home");
const game = document.getElementById("game");

const startBtn = document.getElementById("startBtn");
const groupSelect = document.getElementById("groupSelect");
const categorySelect = document.getElementById("categorySelect");
const teamSelect = document.getElementById("teamSelect");

const questionTitle = document.getElementById("questionTitle");
const imageRow = document.getElementById("imageRow");
const timerEl = document.getElementById("timer");

const toggleAnswerBtn = document.getElementById("toggleAnswerBtn");
const answerBox = document.getElementById("answer");
const nextBtn = document.getElementById("nextBtn");

const teamButtons = document.getElementById("teamButtons");
const scoreboard = document.getElementById("scoreboard");

// ======================
// 載入 Sheet
// ======================
fetch(SHEET_URL)
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
    startBtn.disabled = false;
  });

// ======================
// = ? icon
// ======================
function createQuestionIcon() {
  const wrap = document.createElement("div");
  wrap.className = "question-icon";

  const eq = document.createElement("span");
  eq.className = "q-equal";
  eq.innerText = "=";

  const q = document.createElement("span");
  q.className = "q-question";
  q.innerText = "?";

  wrap.appendChild(eq);
  wrap.appendChild(q);
  return wrap;
}

// ======================
// 開始遊戲（新一輪）
// ======================
startBtn.onclick = () => {
  bgm.currentTime = 0;
  bgm.play();

  teamCount = Number(teamSelect.value);
  teamScores = new Array(teamCount).fill(0);

  // 篩選分類
  let pool = allQuestions.filter(q =>
    q.group === groupSelect.value &&
    (categorySelect.value === "all" ||
     q.category === categorySelect.value)
  );

  // 盡量避開用過的題
  let unused = pool.filter(q => !usedQuestionIds.has(q.id));
  if (unused.length < QUESTIONS_PER_ROUND) {
    unused = pool; // 不夠就容許重覆
  }

  questions = shuffle(unused).slice(0, QUESTIONS_PER_ROUND);
  questions.forEach(q => usedQuestionIds.add(q.id));

  current = 0;
  home.classList.add("hidden");
  game.classList.remove("hidden");

  loadQuestion();
};

// ======================
// 題目
// ======================
function loadQuestion() {
  clearInterval(timer);
  timeLeft = TIME_PER_QUESTION;
  timeUp = false;
  timerEl.innerText = `⏳ ${timeLeft}`;

  timer = setInterval(() => {
    timeLeft--;
    timerEl.innerText = `⏳ ${timeLeft}`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      timeUp = true;
    }
  }, 1000);

  const q = questions[current];

  questionTitle.innerText =
    `第 ${current + 1} 題（${q.difficulty}｜${DIFFICULTY_SCORE[q.difficulty]} 分）`;

  imageRow.innerHTML = "";

  const images = ["img1", "img2", "img3", "img4"]
    .map(k => q[k])
    .filter(Boolean);

  images.forEach((name, i) => {
    const img = document.createElement("img");
    img.src = IMAGE_BASE_URL + name;
    img.onerror = () => {
      img.src = IMAGE_BASE_URL + "image-not-found.png";
    };
    imageRow.appendChild(img);

    if (i < images.length - 1) {
      const plus = document.createElement("span");
      plus.innerText = "＋";
      imageRow.appendChild(plus);
    }
  });

  imageRow.appendChild(createQuestionIcon());

  answerBox.innerText = q.answer;
  answerBox.classList.add("hidden");

  toggleAnswerBtn.innerText = "顯示答案";
  nextBtn.classList.add("hidden");

  renderTeams();
  renderScoreboard();
}

// ======================
// 答案
// ======================
toggleAnswerBtn.onclick = () => {
  answerBox.classList.remove("hidden");
  toggleAnswerBtn.innerText = "答案已顯示";
  nextBtn.classList.remove("hidden");
};

// ======================
// 下一題
// ======================
nextBtn.onclick = () => {
  sfxNext.currentTime = 0;
  sfxNext.play();

  clearInterval(timer);
  current++;

  if (current >= questions.length) {
    alert("🎉 本輪完成！");
    game.classList.add("hidden");
    home.classList.remove("hidden");
  } else {
    loadQuestion();
  }
};

// ======================
// 隊伍加分（可多組）
// ======================
function renderTeams() {
  teamButtons.innerHTML = "";

  teamScores.forEach((score, i) => {
    const btn = document.createElement("button");
    btn.innerText = `第 ${i + 1} 組 +${DIFFICULTY_SCORE[questions[current].difficulty]}（${score}）`;

    btn.onclick = () => {
      if (timeUp) return;

      sfxScore.currentTime = 0;
      sfxScore.play();

      teamScores[i] += DIFFICULTY_SCORE[questions[current].difficulty];
      renderTeams();
      renderScoreboard();
    };

    teamButtons.appendChild(btn);
  });
}

// ======================
// 排行榜
// ======================
function renderScoreboard() {
  scoreboard.innerHTML =
    "<strong>🏆 排行榜</strong><br>" +
    teamScores
      .map((s, i) => `第 ${i + 1} 組：${s} 分`)
      .join("<br>");
}

// ======================
// 工具
// ======================
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
