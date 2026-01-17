"use strict";

/* ======================
   Audio
====================== */
const bgm = document.getElementById("bgm");
const sfxScore = document.getElementById("sfxScore");
if (bgm) bgm.volume = 0.25;
if (sfxScore) sfxScore.volume = 0.8;

/* ======================
   Constants
====================== */
const IMAGE_BASE = "https://yongearn-dev.github.io/guess-word-game/images/";
const SHEET_URL = "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

const DIFFICULTY_SCORE = { easy:1, normal:2, hard:3, extreme:5 };

const AUTO_DISTRIBUTION = {
  5:{easy:1,normal:3,hard:1,extreme:0},
  10:{easy:2,normal:5,hard:2,extreme:1},
  15:{easy:3,normal:7,hard:3,extreme:2}
};

/* ======================
   State
====================== */
let allQuestions = [];
let questionQueue = [];
let currentIndex = 0;

let teamScores = [];
let activeTeam = 0;

let timerInterval = null;
let remainingTime = 0;

let usedQuestionIds = new Set();

/* ======================
   Config
====================== */
const gameConfig = {
  language:"",
  group:"",
  categories:[],

  mode:"standard",
  questionsPerRound:10,

  timer:{
    enabled:false,
    perQuestion:30,
    total:300
  },

  extremeOnly:false,
  teams:3
};

/* ======================
   DOM
====================== */
const setup = document.getElementById("setup");
const summary = document.getElementById("summary");
const game = document.getElementById("game");

const languageSelect = document.getElementById("languageSelect");
const groupSelect = document.getElementById("groupSelect");
const categorySelect = document.getElementById("categorySelect");

const standardOptions = document.getElementById("standardOptions");
const timeAttackOptions = document.getElementById("timeAttackOptions");

const enablePerQuestionTimer = document.getElementById("enablePerQuestionTimer");
const perQuestionTimerOptions = document.getElementById("perQuestionTimerOptions");

const advancedDifficulty = document.getElementById("advancedDifficulty");
const difficultyOptions = document.getElementById("difficultyOptions");
const extremeOnly = document.getElementById("extremeOnly");

const teamSelect = document.getElementById("teamSelect");

const toSummaryBtn = document.getElementById("toSummaryBtn");
const backToSetupBtn = document.getElementById("backToSetupBtn");
const startBtn = document.getElementById("startBtn");

const summaryList = document.getElementById("summaryList");

const questionTitle = document.getElementById("questionTitle");
const imageRow = document.getElementById("imageRow");
const answerBox = document.getElementById("answer");
const teamButtons = document.getElementById("teamButtons");
const toggleAnswerBtn = document.getElementById("toggleAnswerBtn");
const nextBtn = document.getElementById("nextBtn");
const timerBox = document.getElementById("timerBox");

/* ======================
   Load Data
====================== */
fetch(SHEET_URL)
  .then(r=>r.json())
  .then(d=>allQuestions=d);

/* ======================
   Mode Switch
====================== */
document.querySelectorAll("input[name=gameMode]").forEach(r=>{
  r.onchange=()=>{
    gameConfig.mode=r.value;
    standardOptions.classList.toggle("hidden",r.value!=="standard");
    timeAttackOptions.classList.toggle("hidden",r.value!=="timeAttack");

    if(r.value==="timeAttack"){
      gameConfig.timer.enabled=true;
    }
  };
});

/* ======================
   Timer Settings
====================== */
enablePerQuestionTimer.onchange=()=>{
  gameConfig.timer.enabled=enablePerQuestionTimer.checked;
  perQuestionTimerOptions.classList.toggle("hidden",!enablePerQuestionTimer.checked);
};

document.querySelectorAll("input[name=perQuestionTime]").forEach(r=>{
  r.onchange=()=>gameConfig.timer.perQuestion=Number(r.value);
});

document.querySelectorAll("input[name=totalTime]").forEach(r=>{
  r.onchange=()=>gameConfig.timer.total=Number(r.value);
});

/* ======================
   Summary
====================== */
toSummaryBtn.onclick=()=>{
  gameConfig.questionsPerRound=Number(document.querySelector("input[name=qPerRound]:checked").value);
  gameConfig.teams=Number(teamSelect.value);

  summaryList.innerHTML=`
    <li>Mode: ${gameConfig.mode}</li>
    <li>Teams: ${gameConfig.teams}</li>
    <li>Timer: ${
      gameConfig.mode==="standard"
        ? (gameConfig.timer.enabled?`Per Question ${gameConfig.timer.perQuestion}s`:"Off")
        : `${gameConfig.timer.total/60} min`
    }</li>
  `;

  setup.classList.add("hidden");
  summary.classList.remove("hidden");
};

backToSetupBtn.onclick=()=>{
  summary.classList.add("hidden");
  setup.classList.remove("hidden");
};

/* ======================
   Start Game
====================== */
startBtn.onclick=()=>{
  bgm.play().catch(()=>{});

  teamScores=new Array(gameConfig.teams).fill(0);
  activeTeam=0;
  currentIndex=0;
  usedQuestionIds.clear();

  buildQuestionQueue();

  summary.classList.add("hidden");
  game.classList.remove("hidden");

  gameConfig.mode==="timeAttack"
    ? startTimeAttackTeam()
    : loadQuestion();
};

/* ======================
   Queue
====================== */
function buildQuestionQueue(){
  let pool=allQuestions.filter(q=>{
    if(gameConfig.language&&q.language!==gameConfig.language)return false;
    if(gameConfig.group&&q.group!==gameConfig.group)return false;
    if(gameConfig.categories.length&&!gameConfig.categories.includes(q.category))return false;
    if(gameConfig.extremeOnly&&q.difficulty!=="extreme")return false;
    return true;
  });

  if(!pool.length)pool=[...allQuestions];
  shuffle(pool);
  questionQueue=pool;
}

/* ======================
   Question
====================== */
function loadQuestion(){
  clearInterval(timerInterval);

  if(gameConfig.mode==="standard" && currentIndex>=gameConfig.questionsPerRound){
    return showEndScreen();
  }

  let q=questionQueue.find(x=>!usedQuestionIds.has(x.id))||questionQueue[currentIndex%questionQueue.length];
  usedQuestionIds.add(q.id);

  imageRow.innerHTML="";
  ["img1","img2","img3","img4"].map(k=>q[k]).filter(Boolean).forEach(n=>{
    const img=document.createElement("img");
    img.src=IMAGE_BASE+n;
    imageRow.appendChild(img);
  });

  answerBox.textContent=q.answer;
  answerBox.classList.add("hidden");

  renderScoreButtons(q.difficulty);

  if(gameConfig.timer.enabled && gameConfig.mode==="standard"){
    startPerQuestionTimer();
  }
}

/* ======================
   Per Question Timer
====================== */
function startPerQuestionTimer(){
  remainingTime=gameConfig.timer.perQuestion;
  timerBox.classList.remove("hidden","warning");

  timerInterval=setInterval(()=>{
    remainingTime--;
    timerBox.textContent=`⏱ ${remainingTime}`;
    if(remainingTime<=5)timerBox.classList.add("warning");
    if(remainingTime<=0){
      clearInterval(timerInterval);
      answerBox.classList.remove("hidden");
    }
  },1000);
}

/* ======================
   Time Attack
====================== */
function startTimeAttackTeam(){
  currentIndex=0;
  questionTitle.textContent=`Team ${activeTeam+1}`;
  startTotalTimer();
  loadQuestion();
}

function startTotalTimer(){
  remainingTime=gameConfig.timer.total;
  timerBox.classList.remove("hidden","warning");

  timerInterval=setInterval(()=>{
    remainingTime--;
    timerBox.textContent=`⏱ ${Math.floor(remainingTime/60)}:${String(remainingTime%60).padStart(2,"0")}`;
    if(remainingTime<=10)timerBox.classList.add("warning");
    if(remainingTime<=0){
      clearInterval(timerInterval);
      activeTeam++;
      activeTeam>=gameConfig.teams?showEndScreen():startTimeAttackTeam();
    }
  },1000);
}

/* ======================
   Scoring
====================== */
function renderScoreButtons(diff){
  teamButtons.innerHTML="";
  for(let i=0;i<gameConfig.teams;i++){
    const b=document.createElement("button");
    b.textContent=`Team ${i+1} +${DIFFICULTY_SCORE[diff]}`;
    b.onclick=()=>{teamScores[i]+=DIFFICULTY_SCORE[diff];sfxScore?.play();};
    teamButtons.appendChild(b);
  }
}

/* ======================
   Controls
====================== */
nextBtn.onclick=()=>{currentIndex++;loadQuestion();};
toggleAnswerBtn.onclick=()=>answerBox.classList.remove("hidden");

/* ======================
   End
====================== */
function showEndScreen(){
  clearInterval(timerInterval);
  game.classList.add("hidden");
  summary.classList.remove("hidden");

  summaryList.innerHTML=teamScores
    .map((s,i)=>({t:i+1,s}))
    .sort((a,b)=>b.s-a.s)
    .map((r,i)=>`<li>${["🥇","🥈","🥉"][i]||"🎮"} Team ${r.t} — ${r.s}</li>`)
    .join("");

  startBtn.textContent="⬅ Back to Home";
  startBtn.onclick=()=>location.reload();
}

/* ======================
   Utils
====================== */
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
