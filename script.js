"use strict";

/* ======================
   Audio
====================== */
const bgm = document.getElementById("bgm");
const sfxScore = document.getElementById("sfxScore");
const sfxNext = document.getElementById("sfxNext");
const enableAudio = document.getElementById("enableAudio");

bgm.volume = 0.25;
sfxScore.volume = 0.8;
sfxNext.volume = 0.6;

let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;

  [bgm, sfxScore, sfxNext].forEach(a => {
    if (!a) return;
    a.muted = false;
    a.play()
      .then(() => {
        a.pause();
        a.currentTime = 0;
      })
      .catch(() => {});
  });

  audioUnlocked = true;
}

function playScoreSound() {
  if (!enableAudio.checked) return;
  sfxScore.currentTime = 0;
  sfxScore.play().catch(() => {});
}

function playNextSound() {
  if (!enableAudio.checked) return;
  sfxNext.currentTime = 0;
  sfxNext.play().catch(() => {});
}

/* ======================
   基本設定
====================== */
const IMAGE_BASE =
  "https://yongearn-dev.github.io/guess-word-game/images/";

const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

/* ======================
   狀態
====================== */
let allQuestions = [];
let usedQuestionIds = new Set();

let roundQuestions = [];
let currentQuestionIndex = 0;

let teamCount = 1;
let teamScores = [];
let scoredTeamsThisQuestion = new Set();

let roundCount = 1;
let questionsPerRound = 5;
let currentRound = 1;

/* ======================
   分類設定
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
    { value: "all", label: "全部" },
    { value: "person", label: "人物" },
    { value: "place", label: "地方" },
    { value: "vocab", label: "詞彙" }
  ],
  other: [
    { value: "all", label: "全部" },
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
const game = document.getElementById("game");

const languageSelect = document.getElementById("languageSelect");
const groupSelect = document.getElementById("groupSelect");
const categorySelect = document.getElementById("categorySelect");

const teamSelect = document.getElementById("teamSelect");
const roundSelect = document.getElementById("roundCount");
const qPerRoundSelect = document.getElementById("questionPerRound");

const startBtn = document.getElementById("startBtn");

const questionTitle = document.getElementById("questionTitle");
const imageRow = document.getElementById("imageRow");
const answerBox = document.getElementById("answer");

const teamButtons = document.getElementById("teamButtons");

const toggleAnswerBtn = document.getElementById("toggleAnswerBtn");
const nextBtn = document.getElementById("nextBtn");

/* ======================
   初始化 Select
====================== */
function initSelectors() {
  groupSelect.innerHTML = `<option value="">請先選語言</option>`;
  groupSelect.disabled = true;

  categorySelect.innerHTML = `<option value="">請先選分類</option>`;
  categorySelect.disabled = true;
}

initSelectors();

/* ======================
   語言 → 群組
====================== */
languageSelect.addEventListener("change", () => {
  const lang = languageSelect.value;

  groupSelect.innerHTML = "";
  categorySelect.innerHTML = `<option value="">請先選分類</option>`;
  categorySelect.disabled = true;

  if (!lang) {
    groupSelect.innerHTML = `<option value="">請先選語言</option>`;
    groupSelect.disabled = true;
    return;
  }

  groupSelect.disabled = false;
  groupSelect.innerHTML = `<option value="">選擇內容群組</option>`;

  GROUP_MAP[lang].forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.value;
    opt.textContent = g.label;
    groupSelect.appendChild(opt);
  });
});

/* ======================
   群組 → 題目分類
====================== */
groupSelect.addEventListener("change", () => {
  const group = groupSelect.value;
  categorySelect.innerHTML = "";

  if (!group) {
    categorySelect.innerHTML = `<option value="">請先選分類</option>`;
    categorySelect.disabled = true;
    return;
  }

  categorySelect.disabled = false;
  categorySelect.innerHTML = `<option value="">選擇題目類型</option>`;

  CATEGORY_MAP[group].forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    categorySelect.appendChild(opt);
  });
});

/* ======================
   載入 Google Sheet
====================== */
fetch(SHEET_URL)
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
    startBtn.disabled = false;
    console.log("✅ 題目載入完成：", data.length);
  })
  .catch(err => {
    alert("❌ 無法載入題目");
    console.error(err);
  });

/* ======================
   載入 Google Sheet
====================== */
fetch(SHEET_URL)
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
    startBtn.disabled = false;
    console.log("✅ 題目載入完成：", data.length);
  })
  .catch(err => {
    alert("❌ 無法載入題目");
    console.error(err);
  });

/* ======================
   開始遊戲
====================== */
startBtn.onclick = () => {
  if (enableAudio.checked) {
    unlockAudio();
    bgm.play().catch(() => {});
  }

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

/* ======================
   開始一輪
====================== */
function startRound() {
  currentQuestionIndex = 0;
  scoredTeamsThisQuestion.clear();

  const lang = languageSelect.value;
  const group = groupSelect.value;
  const category = categorySelect.value;

  const pool = allQuestions.filter(q => {
    if (usedQuestionIds.has(q.id)) return false;
    if (q.language !== lang) return false;
    if (q.group !== group) return false;
    if (category !== "all" && q.category !== category) return false;
    return true;
  });

  shuffle(pool);

  roundQuestions = pool.slice(0, questionsPerRound);
  roundQuestions.forEach(q => usedQuestionIds.add(q.id));

  loadQuestion();
}

/* ======================
   載入題目
====================== */
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
    imageRow.appendChild(img);

    if (i < imgs.length - 1) {
      imageRow.appendChild(document.createTextNode(" ＋ "));
    }
  });

  imageRow.appendChild(document.createTextNode(" ＝？"));

  answerBox.innerText = q.answer || "";
  answerBox.classList.add("hidden");

  renderTeams();
  nextBtn.classList.remove("hidden");
}

/* ======================
   隊伍加分（每題每組一次）
====================== */
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
      teamScores[i]++;
      scoredTeamsThisQuestion.add(i);
      playScoreSound();
      renderTeams();
    };

    teamButtons.appendChild(btn);
  }
}

/* ======================
   顯示答案
====================== */
toggleAnswerBtn.onclick = () => {
  answerBox.classList.remove("hidden");
};

/* ======================
   下一題
====================== */
nextBtn.onclick = () => {
  playNextSound();

  currentQuestionIndex++;

  if (currentQuestionIndex >= roundQuestions.length) {
    currentRound++;

    if (currentRound > roundCount) {
      alert("🎉 遊戲完成");
      setup.classList.remove("hidden");
      game.classList.add("hidden");
    } else {
      startRound();
    }
  } else {
    loadQuestion();
  }
};

/* ======================
   工具
====================== */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
