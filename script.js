const IMAGE_BASE =
  "https://yongearn-dev.github.io/guess-word-game/images/";

const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

let allQuestions = [];
let questions = [];
let current = 0;
let teamScores = [];
let answeredTeams = new Set();
let timer = null;
let timeLeft = 0;

// DOM
const setup = document.getElementById("setup");
const game = document.getElementById("game");
const imageRow = document.getElementById("imageRow");
const questionTitle = document.getElementById("questionTitle");
const answerBox = document.getElementById("answer");
const timerDisplay = document.getElementById("timerDisplay");
const teamButtons = document.getElementById("teamButtons");

fetch(SHEET_URL)
  .then(res => res.json())
  .then(data => allQuestions = data);

// 設定頁互動
const enableTimer = document.getElementById("enableTimer");
const timerOptions = document.getElementById("timerOptions");
const timerMode = document.getElementById("timerMode");
const perQuestionOptions = document.getElementById("perQuestionOptions");
const perTeamOptions = document.getElementById("perTeamOptions");

enableTimer.onchange = () => {
  timerOptions.classList.toggle("hidden", !enableTimer.checked);
};

timerMode.onchange = () => {
  perQuestionOptions.classList.toggle("hidden", timerMode.value !== "perQuestion");
  perTeamOptions.classList.toggle("hidden", timerMode.value !== "perTeam");
};

// 開始遊戲
document.getElementById("startBtn").onclick = () => {
  const category = document.getElementById("categorySelect").value;
  const teamCount = Number(document.getElementById("teamSelect").value);

  questions = allQuestions.filter(q => q.category === category);
  teamScores = new Array(teamCount).fill(0);
  current = 0;

  setup.classList.add("hidden");
  game.classList.remove("hidden");

  startTimerIfNeeded();
  loadQuestion();
};

function loadQuestion() {
  const q = questions[current];
  answeredTeams.clear();
  imageRow.innerHTML = "";
  questionTitle.innerText = `第 ${current + 1} 題`;

  ["img1", "img2", "img3", "img4"]
    .map(k => q[k])
    .filter(Boolean)
    .forEach((name, i, arr) => {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + name;
      imageRow.appendChild(img);
      if (i < arr.length - 1) imageRow.append("＋");
    });

  answerBox.innerText = q.answer;
  answerBox.classList.add("hidden");
  renderTeams();
}

function renderTeams() {
  teamButtons.innerHTML = "";
  teamScores.forEach((s, i) => {
    const btn = document.createElement("button");
    btn.innerText = `第 ${i + 1} 組（${s} 分）`;
    btn.disabled = answeredTeams.has(i);
    btn.onclick = () => {
      answeredTeams.add(i);
      teamScores[i] += scoreForDifficulty(questions[current].difficulty);
      renderTeams();
    };
    teamButtons.appendChild(btn);
  });
}

function scoreForDifficulty(d) {
  return { easy: 1, normal: 2, hard: 3, extreme: 5 }[d] || 2;
}

// 計時
function startTimerIfNeeded() {
  clearInterval(timer);
  if (!enableTimer.checked) return;

  if (timerMode.value === "perQuestion") {
    timeLeft = Number(document.getElementById("questionSeconds").value);
    timerDisplay.innerText = `⏱ ${timeLeft}s`;
    timer = setInterval(() => {
      timeLeft--;
      timerDisplay.innerText = `⏱ ${timeLeft}s`;
      if (timeLeft <= 0) clearInterval(timer);
    }, 1000);
  }
}
