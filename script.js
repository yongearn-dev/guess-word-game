// ======================
// 音效
// ======================
const bgm = document.getElementById("bgm");
const sfxScore = document.getElementById("sfxScore");
const sfxNext = document.getElementById("sfxNext");

bgm.volume = 0.25;
sfxScore.volume = 0.8;
sfxNext.volume = 0.6;

// ======================
// 設定
// ======================
const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

const QUESTIONS_PER_ROUND = 10;

// ======================
// 狀態
// ======================
let allQuestions = [];
let questions = [];
let current = 0;

let teamCount = 1;
let teamScores = [];
let scoredThisQuestion = false;

// 🔑 每個分類的「已用題目記錄」（只存在記憶體）
const usedQuestionIds = {
  all: new Set(),
  place: new Set(),
  people: new Set(),
  book: new Set()
};

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
const scoreboard = document.getElementById("scoreboard");

// ======================
// 載入 Google Sheet
// ======================
fetch(SHEET_URL)
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
    startBtn.disabled = false;
  });

// ======================
// 工具：洗牌
// ======================
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ======================
// 工具：抽一輪題目（盡量避免重複）
// ======================
function getRoundQuestions(source, category) {
  const usedSet = usedQuestionIds[category] || usedQuestionIds.all;

  const indexed = source.map((q, i) => ({ ...q, __id: i }));
  let unused = indexed.filter(q => !usedSet.has(q.__id));

  // 如果未用題目不足 10 題 → reset 該分類
  if (unused.length < QUESTIONS_PER_ROUND) {
    usedSet.clear();
    unused = indexed;
  }

  const selected = shuffle(unused).slice(
    0,
    Math.min(QUESTIONS_PER_ROUND, unused.length)
  );

  selected.forEach(q => usedSet.add(q.__id));

  return selected.map(({ __id, ...rest }) => rest);
}

// ======================
// 問號 icon
// ======================
function createQuestionIcon() {
  const wrap = document.createElement("div");
  wrap.className = "question-icon";

  const top = document.createElement("div");
  top.className = "q-mark-top";
  top.innerText = "=?";

  const dot = document.createElement("div");

  wrap.appendChild(top);

  return wrap;
}

// ======================
// 開始遊戲
// ======================
startBtn.addEventListener("click", () => {
  const category = categorySelect.value;
  teamCount = Number(teamSelect.value);

  const filtered =
    category === "all"
      ? allQuestions
      : allQuestions.filter(q => q.category === category);

  if (!filtered.length) {
    alert("此分類沒有題目");
    return;
  }

  questions = getRoundQuestions(filtered, category);

  current = 0;
  teamScores = new Array(teamCount).fill(0);

  // 第一次用戶互動 → 播 BGM（符合瀏覽器限制）
  bgm.currentTime = 0;
  bgm.play().быз

  home.classList.add("hidden");
  game.classList.remove("hidden");

  loadQuestion();
});

// ======================
// 載入題目
// ======================
function loadQuestion() {
  const q = questions[current];
  if (!q) return;

  scoredThisQuestion = false;

  questionTitle.innerText = `第 ${current + 1} 題`;
  imageRow.innerHTML = "";

  const images = ["img1", "img2", "img3", "img4"]
    .map(k => q[k])
    .filter(Boolean);

  images.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
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
// 顯示答案
// ======================
toggleAnswerBtn.addEventListener("click", () => {
  answerBox.classList.remove("hidden");
  toggleAnswerBtn.innerText = "答案已顯示";
  nextBtn.classList.remove("hidden");
});

// ======================
// 下一題
// ======================
nextBtn.addEventListener("click", () => {
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
});

// ======================
// 隊伍加分（每題只可一次）
// ======================
function renderTeams() {
  teamButtons.innerHTML = "";

  for (let i = 0; i < teamCount; i++) {
    const btn = document.createElement("button");
    btn.innerText = `第 ${i + 1} 組 +1（${teamScores[i]}）`;

    btn.onclick = () => {
      if (scoredThisQuestion) return;

      sfxScore.currentTime = 0;
      sfxScore.play();

      teamScores[i]++;
      scoredThisQuestion = true;

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
