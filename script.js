// ======================
// 音效
// ======================
const bgm = document.getElementById("bgm");
const sfxScore = document.getElementById("sfxScore");
const sfxNext = document.getElementById("sfxNext");

bgm.volume = 0.25;
sfxScore.volume = 0.8;
sfxNext.volume = 0.6;

// 自動播放 BGM（需 user gesture，放喺 start）
function playBGM() {
  bgm.loop = true;
  bgm.play().catch(() => {});
}

// ======================
// 設定
// ======================
const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

const QUESTIONS_PER_ROUND = 10;
const IMAGE_BASE =
  "https://yongearn-dev.github.io/guess-word-game/images/";

// ======================
// 狀態
// ======================
let allQuestions = [];
let questions = [];
let usedQuestionIds = new Set();

let current = 0;
let teamCount = 1;
let teamScores = [];
let answeredTeams = new Set(); // 🔒 每題已得分的組

// ======================
// DOM
// ======================
const home = document.getElementById("home");
const game = document.getElementById("game");

const startBtn = document.getElementById("startBtn");
const categorySelect = document.getElementById("categorySelect");
const teamSelect = document.getElementById("teamSelect");

const questionTitle = document.getElementById("questionTitle");
const imageRow = document.getElementById("imageRow");

const toggleAnswerBtn = document.getElementById("toggleAnswerBtn");
const answerBox = document.getElementById("answer");
const nextBtn = document.getElementById("nextBtn");

const teamButtons = document.getElementById("teamButtons");
const scoreboard = document.getElementBysById?.("scoreboard") || document.getElementById("scoreboard");

// ======================
// 工具
// ======================
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function questionScore(q) {
  return { easy: 1, normal: 2, hard: 3, extreme: 5 }[q.difficulty] || 2;
}

// 問號 icon（＝ 與 ？分開）
function createQuestionIcon() {
  const wrap = document.createElement("div");
  wrap.className = "question-icon";

  const eq = document.createElement("div");
  eq.className = "q-eq";
  eq.innerText = "=";

  const qm = document.createElement("div");
  qm.className = "q-qm";
  qm.innerText = "?";

  wrap.appendChild(eq);
  wrap.appendChild(qm);
  return wrap;
}

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
// 開始遊戲
// ======================
startBtn.onclick = () => {
  playBGM();

  const category = categorySelect.value;
  teamCount = Number(teamSelect.value);

  let pool =
    category === "all"
      ? allQuestions
      : allQuestions.filter(q => q.category === category);

  // 去除已用題目
  pool = pool.filter(q => !usedQuestionIds.has(q.id));

  if (pool.length < QUESTIONS_PER_ROUND) {
    alert("此分類剩餘題目不足 10 題");
    return;
  }

  questions = shuffle(pool).slice(0, QUESTIONS_PER_ROUND);
  questions.forEach(q => usedQuestionIds.add(q.id));

  current = 0;
  teamScores = new Array(teamCount).fill(0);

  home.classList.add("hidden");
  game.classList.remove("hidden");

  loadQuestion();
};

// ======================
// 載入題目
// ======================
function loadQuestion() {
  const q = questions[current];
  if (!q) return;

  answeredTeams.clear();

  questionTitle.innerText = `第 ${current + 1} 題（${questionScore(q)} 分）`;
  imageRow.innerHTML = "";

  const imgs = ["img1", "img2", "img3", "img4"]
    .map(k => q[k])
    .filter(Boolean);

  imgs.forEach((name, i) => {
    const img = document.createElement("img");
    img.src = IMAGE_BASE + name;
    imageRow.appendChild(img);

    if (i < imgs.length - 1) {
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
// 顯示答案
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

  current++;
  if (current >= questions.length) {
    alert("🎉 本輪完成");
    game.classList.add("hidden");
    home.classList.remove("hidden");
  } else {
    loadQuestion();
  }
};

// ======================
// 隊伍按鈕（每題每組只可一次）
// ======================
function renderTeams() {
  teamButtons.innerHTML = "";

  for (let i = 0; i < teamCount; i++) {
    const btn = document.createElement("button");
    btn.innerText = `第 ${i + 1} 組 +${questionScore(questions[current])}（${teamScores[i]}）`;

    if (answeredTeams.has(i)) {
      btn.disabled = true;
      btn.classList.add("disabled");
    }

    btn.onclick = () => {
      if (answeredTeams.has(i)) return;

      teamScores[i] += questionScore(questions[current]);
      answeredTeams.add(i);

      sfxScore.currentTime = 0;
      sfxScore.play();

      renderTeams();
      renderScoreboard();
    };

    teamButtons.appendChild(btn);
  }
}

// ======================
// 排行榜
// ======================
function renderScoreboard() {
  const ranked = teamScores
    .map((s, i) => ({ team: i + 1, score: s }))
    .sort((a, b) => b.score - a.score);

  scoreboard.innerHTML =
    "<strong>🏆 排行榜</strong>" +
    ranked
      .map((r, i) => {
        const medal = ["🥇", "🥈", "🥉"][i] || "";
        return `<div>${medal} 第 ${r.team} 組：${r.score} 分</div>`;
      })
      .join("");
}
