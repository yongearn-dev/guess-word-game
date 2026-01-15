// ==================================================
// 基本設定
// ==================================================
const IMAGE_BASE =
  "https://yongearn-dev.github.io/guess-word-game/images/";

const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

// ==================================================
// 狀態
// ==================================================
let allQuestions = [];
let usedQuestionIds = new Set();

let roundQuestions = [];
let currentQuestionIndex = 0;

let teamCount = 1;
let teamScores = [];

let roundCount = 1;
let questionsPerRound = 5;
let currentRound = 1;

// 每題記錄已加分的組
let scoredTeamsThisQuestion = new Set();

// ==================================================
// DOM
// ==================================================
const setup = document.getElementById("setup");
const game = document.getElementById("game");

const startBtn = document.getElementById("startBtn");

const teamSelect = document.getElementById("teamSelect");
const roundSelect = document.getElementById("roundSelect");
const qPerRoundSelect = document.getElementById("questionPerRound");

const questionTitle = document.getElementById("questionTitle");
const imageRow = document.getElementById("imageRow");
const answerBox = document.getElementById("answer");

const toggleAnswerBtn = document.getElementById("toggleAnswerBtn");
const nextBtn = document.getElementById("nextBtn");

const teamButtons = document.getElementById("teamButtons");

// ==================================================
// 載入 Google Sheet
// ==================================================
fetch(SHEET_URL)
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
    startBtn.disabled = false;
  })
  .catch(err => {
    alert("❌ 無法載入題目");
    console.error(err);
  });

// ==================================================
// 開始遊戲
// ==================================================
startBtn.onclick = () => {
  teamCount = Number(teamSelect.value);
  roundCount = Number(roundSelect.value);
  questionsPerRound = Number(qPerRoundSelect.value);

  teamScores = new Array(teamCount).fill(0);
  usedQuestionIds.clear();

  currentRound = 1;

  setup.classList.add("hidden");
  game.classList.remove("hidden");

  startRound();
};

// ==================================================
// 開始一輪
// ==================================================
function startRound() {
  currentQuestionIndex = 0;
  scoredTeamsThisQuestion.clear();

  // 只抽未用過的題
  const pool = allQuestions.filter(q => !usedQuestionIds.has(q.id));
  shuffle(pool);

  roundQuestions = pool.slice(0, questionsPerRound);

  // 標記已使用
  roundQuestions.forEach(q => usedQuestionIds.add(q.id));

  loadQuestion();
}

// ==================================================
// 載入題目
// ==================================================
function loadQuestion() {
  const q = roundQuestions[currentQuestionIndex];
  if (!q) return;

  scoredTeamsThisQuestion.clear();

  questionTitle.innerText =
    `第 ${currentRound} 輪 · 第 ${currentQuestionIndex + 1} 題`;

  imageRow.innerHTML = "";

  const imgs = ["img1", "img2", "img3", "img4"]
    .map(k => q[k])
    .filter(Boolean);

  imgs.forEach((name, i) => {
    const img = document.createElement("img");
    img.src = IMAGE_BASE + name;
    img.alt = name;
    imageRow.appendChild(img);

    if (i < imgs.length - 1) {
      const plus = document.createElement("span");
      plus.innerText = "＋";
      imageRow.appendChild(plus);
    }
  });

  const eq = document.createElement("span");
  eq.className = "eq";
  eq.innerText = "＝？";
  imageRow.appendChild(eq);

  answerBox.innerText = q.answer;
  answerBox.classList.add("hidden");

  renderTeams();

  // 下一題永遠存在
  nextBtn.classList.remove("hidden");
}

// ==================================================
// 隊伍加分（每題每組最多一次）
// ==================================================
function renderTeams() {
  teamButtons.innerHTML = "";

  for (let i = 0; i < teamCount; i++) {
    const btn = document.createElement("button");

    btn.innerText = `第 ${i + 1} 組 ＋1（${teamScores[i]}）`;

    if (scoredTeamsThisQuestion.has(i)) {
      btn.disabled = true;
    }

    btn.onclick = () => {
      if (scoredTeamsThisQuestion.has(i)) return;

      teamScores[i] += 1;
      scoredTeamsThisQuestion.add(i);

      renderTeams();
    };

    teamButtons.appendChild(btn);
  }
}

// ==================================================
// 顯示答案
// ==================================================
toggleAnswerBtn.onclick = () => {
  answerBox.classList.remove("hidden");
};

// ==================================================
// 下一題
// ==================================================
nextBtn.onclick = () => {
  currentQuestionIndex++;

  if (currentQuestionIndex >= roundQuestions.length) {
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

// ==================================================
// 工具：洗牌
// ==================================================
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
