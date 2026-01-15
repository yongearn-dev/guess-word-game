/***********************
 * 基本設定
 ***********************/
const IMAGE_BASE =
  "https://yongearn-dev.github.io/guess-word-game/images/";

const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

/***********************
 * 遊戲狀態
 ***********************/
let allQuestions = [];
let questions = [];
let currentIndex = 0;

let teamScores = [];
let answeredTeams = new Set();

let timerInterval = null;
let timeLeft = 0;
let teamTotalTime = [];

/***********************
 * DOM
 ***********************/
const setupPage = document.getElementById("setup");
const gamePage = document.getElementById("game");

const questionTitle = document.getElementById("questionTitle");
const imageRow = document.getElementById("imageRow");
const answerBox = document.getElementById("answer");
const timerDisplay = document.getElementById("timerDisplay");
const teamButtons = document.getElementById("teamButtons");
const nextBtn = document.getElementById("nextBtn");

/***********************
 * 設定頁元素
 ***********************/
const enableTimer = document.getElementById("enableTimer");
const timerOptions = document.getElementById("timerOptions");
const timerMode = document.getElementById("timerMode");

const perQuestionOptions = document.getElementById("perQuestionOptions");
const perTeamOptions = document.getElementById("perTeamOptions");

/***********************
 * 載入題庫
 ***********************/
fetch(SHEET_URL)
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
  });

/***********************
 * 設定頁互動
 ***********************/
enableTimer.onchange = () => {
  timerOptions.classList.toggle("hidden", !enableTimer.checked);
};

timerMode.onchange = () => {
  perQuestionOptions.classList.toggle(
    "hidden",
    timerMode.value !== "perQuestion"
  );
  perTeamOptions.classList.toggle(
    "hidden",
    timerMode.value !== "perTeam"
  );
};

/***********************
 * 開始遊戲
 ***********************/
document.getElementById("startBtn").onclick = () => {
  const category = document.getElementById("categorySelect").value;
  const teamCount = Number(document.getElementById("teamSelect").value);

  questions = allQuestions.filter(q => q.category === category);
  currentIndex = 0;

  teamScores = new Array(teamCount).fill(0);
  teamTotalTime = new Array(teamCount).fill(0);

  setupPage.classList.add("hidden");
  gamePage.classList.remove("hidden");

  loadQuestion();
};

/***********************
 * 載入題目
 ***********************/
function loadQuestion() {
  clearTimer();
  answeredTeams.clear();
  nextBtn.classList.add("hidden");

  const q = questions[currentIndex];
  questionTitle.innerText = `第 ${currentIndex + 1} 題`;
  imageRow.innerHTML = "";

  ["img1", "img2", "img3", "img4"]
    .map(k => q[k])
    .filter(Boolean)
    .forEach((name, i, arr) => {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + name;
      imageRow.appendChild(img);
      if (i < arr.length - 1) {
        imageRow.append("＋");
      }
    });

  answerBox.innerText = q.answer;
  answerBox.classList.add("hidden");

  renderTeams();
  startTimerIfNeeded();
}

/***********************
 * 顯示組別按鈕
 ***********************/
function renderTeams() {
  teamButtons.innerHTML = "";

  teamScores.forEach((score, index) => {
    const btn = document.createElement("button");
    btn.innerText = `第 ${index + 1} 組（${score} 分）`;
    btn.disabled = answeredTeams.has(index);

    btn.onclick = () => {
      if (answeredTeams.has(index)) return;

      answeredTeams.add(index);
      teamScores[index] += scoreByDifficulty(
        questions[currentIndex].difficulty
      );

      renderTeams();

      if (answeredTeams.size === teamScores.length) {
        nextBtn.classList.remove("hidden");
      }
    };

    teamButtons.appendChild(btn);
  });
}

/***********************
 * 分數（依難度）
 ***********************/
function scoreByDifficulty(level) {
  return {
    easy: 1,
    normal: 2,
    hard: 3,
    extreme: 5
  }[level] || 2;
}

/***********************
 * 計時邏輯
 ***********************/
function startTimerIfNeeded() {
  if (!enableTimer.checked) {
    timerDisplay.innerText = "";
    return;
  }

  if (timerMode.value === "perQuestion") {
    timeLeft = Number(
      document.getElementById("questionSeconds").value
    );
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      if (timeLeft <= 0) {
        clearTimer();
        nextBtn.classList.remove("hidden");
      }
    }, 1000);
  }

  if (timerMode.value === "perTeam") {
    // 顯示剩餘時間（只顯示，不強制完結）
    timerDisplay.innerText = "⏱ 每組總時間制";
  }
}

function updateTimerDisplay() {
  timerDisplay.innerText = `⏱ ${timeLeft} 秒`;
}

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/***********************
 * 下一題
 ***********************/
nextBtn.onclick = () => {
  currentIndex++;
  if (currentIndex >= questions.length) {
    alert("遊戲結束！");
    location.reload();
    return;
  }
  loadQuestion();
};

/***********************
 * 顯示 / 隱藏答案
 ***********************/
document.getElementById("toggleAnswerBtn").onclick = () => {
  answerBox.classList.toggle("hidden");
};
