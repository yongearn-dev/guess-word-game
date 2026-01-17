"use strict";

/* ======================
   基本設定
====================== */
const IMAGE_BASE =
  "https://yongearn-dev.github.io/guess-word-game/images/";
const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

const pastelColors = [
  "#f8b195","#f67280","#c06c84","#6c5b7b","#355c7d",
  "#f3c1c6","#ffd5cd","#c1e1dc","#d4f0f0","#e0bbe4"
];

/* ======================
   狀態
====================== */
let allQuestions = [];
let usedIds = new Set();

let currentQuestions = [];
let qIndex = 0;

let scores = [];
let teamColors = [];
let currentTeam = 0;

let mode = "standard"; // standard | rush | timed
let perQuestionTimer = null;

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
  .then(d => (allQuestions = d));

/* ======================
   開始遊戲
====================== */
document.getElementById("startBtn").onclick = () => {
  const teamCount = Number(document.getElementById("teamCount").value);
  const qPerTeam = Number(document.getElementById("questionCount").value);
  mode = document.querySelector("input[name='mode']:checked").value;

  scores = new Array(teamCount).fill(0);
  teamColors = pastelColors.slice(0, teamCount);
  usedIds.clear();

  if (mode === "standard") {
    currentTeam = 0;
    startTeamRound(qPerTeam);
  } else {
    startSharedGame(qPerTeam);
  }

  setup.classList.add("hidden");
  game.classList.remove("hidden");
};

/* ======================
   標準模式：每組獨立回合
====================== */
function startTeamRound(qCount) {
  qIndex = 0;

  currentQuestions = allQuestions
    .filter(q => !usedIds.has(q.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, qCount);

  currentQuestions.forEach(q => usedIds.add(q.id));
  loadQuestion();
}

/* ======================
   共用模式（搶答 / 限時）
====================== */
function startSharedGame(qCount) {
  qIndex = 0;

  currentQuestions = allQuestions
    .filter(q => !usedIds.has(q.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, qCount);

  currentQuestions.forEach(q => usedIds.add(q.id));
  loadQuestion();
}

/* ======================
   題目顯示
====================== */
function loadQuestion() {
  clearInterval(perQuestionTimer);

  const q = currentQuestions[qIndex];
  if (!q) return;

  questionTitle.innerText =
    mode === "standard"
      ? `組 ${currentTeam + 1}｜第 ${qIndex + 1} 題`
      : `第 ${qIndex + 1} 題`;

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
    btn.style.background = teamColors[i];

    if (mode === "standard") {
      btn.innerText = `組 ${i + 1}：${score}`;
      btn.disabled = i !== currentTeam;
      if (i === currentTeam) {
        btn.onclick = () => {
          scores[i]++;
          renderTeams();
        };
      }
    } else {
      btn.innerText = `組 ${i + 1} +1（${score}）`;
      btn.onclick = () => {
        scores[i]++;
        renderTeams();
      };
    }

    teamButtons.appendChild(btn);
  });
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
document.getElementById("nextBtn").onclick = () => nextQuestion();

function nextQuestion() {
  qIndex++;

  if (qIndex >= currentQuestions.length) {
    if (mode === "standard") {
      currentTeam++;

      if (currentTeam >= scores.length) {
        endGame();
        return;
      }

      const qPerTeam = currentQuestions.length;
      startTeamRound(qPerTeam);
      return;
    } else {
      endGame();
      return;
    }
  }

  loadQuestion();
}

/* ======================
   每題計時
====================== */
function startPerQuestionTimer() {
  const enable = document.getElementById("enableTimer")?.checked;
  if (!enable) return;

  let seconds = Number(
    document.getElementById("perQuestionTime")?.value || 30
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

/* ======================
   遊戲結束 → 回主頁
====================== */
function endGame() {
  clearInterval(perQuestionTimer);

  let result = "🏁 遊戲結束\n\n";
  scores.forEach((s, i) => {
    result += `組 ${i + 1}：${s} 分\n`;
  });

  alert(result);
  location.reload();
}
