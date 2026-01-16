"use strict";

/* ======================
   基本設定
====================== */
const IMAGE_BASE =
  "https://yongearn-dev.github.io/guess-word-game/images/";
const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

/* 馬卡龍色（10 隻） */
const pastelColors = [
  "#f8b195","#f67280","#c06c84","#6c5b7b","#355c7d",
  "#f3c1c6","#ffd5cd","#c1e1dc","#d4f0f0","#e0bbe4"
];

/* ======================
   狀態
====================== */
let allQuestions = [];
let currentQuestions = [];
let usedIds = new Set();

let qIndex = 0;
let scores = [];
let teamColors = [];

let mode = "standard"; // standard | rush | timed
let perQuestionTimer = null;
let teamTimer = null;
let remainingSeconds = 0;

/* ======================
   DOM
====================== */
const setup = document.getElementById("setup");
const game = document.getElementById("game");

const imageRow = document.getElementById("imageRow");
const answerBox = document.getElementById("answer");
const teamButtons = document.getElementById("teamButtons");
const timerBox = document.getElementById("timerBox");
const questionTitle = document.getElementById("questionTitle");

/* ======================
   載入題庫
====================== */
fetch(SHEET_URL)
  .then(r => r.json())
  .then(d => {
    allQuestions = d;
  });

/* ======================
   組別顏色選擇
====================== */
const teamColorBox = document.getElementById("teamColors");
const teamCountSelect = document.getElementById("teamCount");

function renderColorPicker() {
  teamColorBox.innerHTML = "";
  teamColors = [];

  pastelColors.forEach(color => {
    const btn = document.createElement("div");
    btn.className = "color-btn";
    btn.style.background = color;

    btn.onclick = () => {
      if (teamColors.includes(color)) return;
      btn.classList.add("selected");
      teamColors.push(color);
    };

    teamColorBox.appendChild(btn);
  });
}
renderColorPicker();

/* ======================
   開始遊戲
====================== */
document.getElementById("startBtn").onclick = () => {
  const qCount = Number(document.getElementById("questionCount").value);
  const teamCount = Number(teamCountSelect.value);
  mode = document.querySelector("input[name='mode']:checked").value;

  scores = new Array(teamCount).fill(0);
  qIndex = 0;
  usedIds.clear();

  // 抽題（避免重複）
  currentQuestions = allQuestions
    .filter(q => !usedIds.has(q.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, qCount);

  setup.classList.add("hidden");
  game.classList.remove("hidden");

  initTimer();
  loadQuestion();
};

/* ======================
   題目顯示
====================== */
function loadQuestion() {
  clearInterval(perQuestionTimer);

  const q = currentQuestions[qIndex];
  if (!q) return;

  questionTitle.innerText = `第 ${qIndex + 1} 題`;
  imageRow.innerHTML = "";
  answerBox.classList.add("hidden");
  answerBox.innerText = q.answer || "";

  ["img1","img2","img3","img4"]
    .map(k => q[k])
    .filter(Boolean)
    .forEach(src => {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + src;
      imageRow.appendChild(img);
    });

  renderTeams();
  startPerQuestionTimer();
}

/* ======================
   組別按鈕
====================== */
function renderTeams() {
  teamButtons.innerHTML = "";

  scores.forEach((score, i) => {
    const btn = document.createElement("button");
    btn.style.background = teamColors[i] || "#ccc";

    if (mode === "rush") {
      btn.innerText = `組 ${i + 1} (${score})`;
      btn.onclick = () => rushCorrect(i);
    } else {
      btn.innerText = `組 ${i + 1} +1 (${score})`;
      btn.onclick = () => {
        scores[i]++;
        renderTeams();
      };
    }

    teamButtons.appendChild(btn);
  });
}

/* ======================
   搶答模式規則
====================== */
let rushAnswered = false;

function rushCorrect(teamIndex) {
  if (rushAnswered) return;

  scores[teamIndex] += 3;
  rushAnswered = true;
  renderTeams();
  nextQuestion();
}

function rushWrong(teamIndex) {
  scores[teamIndex] = Math.max(0, scores[teamIndex] - 1);
  renderTeams();
}

/* ======================
   顯示答案
====================== */
document.getElementById("toggleAnswerBtn").onclick = () => {
  answerBox.classList.remove("hidden");
};

/* ======================
   下一題
====================== */
document.getElementById("nextBtn").onclick = () => {
  nextQuestion();
};

function nextQuestion() {
  rushAnswered = false;
  qIndex++;

  if (qIndex >= currentQuestions.length) {
    endGame();
  } else {
    loadQuestion();
  }
}

/* ======================
   計時系統
====================== */
function initTimer() {
  timerBox.classList.add("hidden");

  const enableTeamTimer =
    document.getElementById("enableTeamTimer").checked &&
    mode === "timed";

  if (enableTeamTimer) {
    remainingSeconds = Number(
      document.getElementById("teamTotalTime").value
    );
    timerBox.classList.remove("hidden");
    updateTimerUI();

    teamTimer = setInterval(() => {
      remainingSeconds--;
      updateTimerUI();
      if (remainingSeconds <= 0) endGame();
    }, 1000);
  }
}

function startPerQuestionTimer() {
  const enableTimer = document.getElementById("enableTimer").checked;
  if (!enableTimer) return;

  let seconds = Number(
    document.getElementById("perQuestionTime").value
  );

  timerBox.classList.remove("hidden");
  timerBox.innerText = seconds;

  perQuestionTimer = setInterval(() => {
    seconds--;
    timerBox.innerText = seconds;
    if (seconds <= 0) {
      clearInterval(perQuestionTimer);
      nextQuestion();
    }
  }, 1000);
}

function updateTimerUI() {
  timerBox.innerText = `${remainingSeconds}s`;
}

/* ======================
   遊戲結束
====================== */
function endGame() {
  clearInterval(perQuestionTimer);
  clearInterval(teamTimer);

  let result = "🏁 遊戲結束\n\n";
  scores.forEach((s, i) => {
    result += `組 ${i + 1}：${s} 分\n`;
  });

  alert(result);
  location.reload();
}
