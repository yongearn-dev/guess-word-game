"use strict";

/* ======================
   Audio
====================== */
const bgm = document.getElementById("bgm");
const sfxScore = document.getElementById("sfxScore");
const sfxNext = document.getElementById("sfxNext");

bgm.volume = 0.25;
sfxScore.volume = 0.8;
sfxNext.volume = 0.6;

/* ======================
   Constants
====================== */
const IMAGE_BASE =
  "https://yongearn-dev.github.io/guess-word-game/images/";

const SHEET_URL =
  "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

const DIFFICULTY_SCORE = {
  easy: 1,
  normal: 2,
  hard: 3,
  extreme: 5
};

const AUTO_DISTRIBUTION = {
  5:  { easy: 1, normal: 3, hard: 1, extreme: 0 },
  10: { easy: 2, normal: 5, hard: 2, extreme: 1 },
  15: { easy: 3, normal: 7, hard: 3, extreme: 2 }
};

/* ======================
   State
====================== */
let allQuestions = [];
let questionQueue = [];
let currentIndex = 0;

let teamScores = [];
let scoredThisQuestion = new Set();

let timerInterval = null;
let remainingTime = 0;

let activeTeam = 0; // for time attack

/* ======================
   Config
====================== */
const gameConfig = {
  language: "",
  group: "",
  categories: [],

  mode: "standard",

  questionsPerRound: 10,
  rounds: 1,

  timer: {
    enabled: false,
    perQuestion: 30,
    total: 300
  },

  advanced: false,
  extremeOnly: false,

  teams: 3
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
   Data Load
====================== */
fetch(SHEET_URL)
  .then(r => r.json())
  .then(d => allQuestions = d);

/* ======================
   Language / Group
====================== */
languageSelect.onchange = () => {
  gameConfig.language = languageSelect.value;
  groupSelect.disabled = !gameConfig.language;
  groupSelect.innerHTML = `<option value="">Select group</option>`;
  categorySelect.innerHTML = "";
  gameConfig.categories = [];

  if (!gameConfig.language) return;

  const map = {
    zh: [{value:"bible",label:"聖經"},{value:"other",label:"其他"}],
    th: [{value:"bible",label:"พระคัมภีร์"},{value:"other",label:"อื่นๆ"}]
  };

  map[gameConfig.language].forEach(g=>{
    const o=document.createElement("option");
    o.value=g.value; o.textContent=g.label;
    groupSelect.appendChild(o);
  });
};

groupSelect.onchange = () => {
  gameConfig.group = groupSelect.value;
  categorySelect.innerHTML = "";
  gameConfig.categories = [];

  const cats = {
    bible:["person","place","vocab"],
    other:["travel","life","food","knowledge"]
  };

  cats[gameConfig.group]?.forEach(c=>{
    const l=document.createElement("label");
    const cb=document.createElement("input");
    cb.type="checkbox"; cb.value=c;
    cb.onchange=()=>cb.checked
      ? gameConfig.categories.push(c)
      : gameConfig.categories=gameConfig.categories.filter(v=>v!==c);
    l.append(cb," "+c);
    categorySelect.appendChild(l);
  });
};

/* ======================
   Mode
====================== */
document.querySelectorAll("input[name=gameMode]").forEach(r=>{
  r.onchange=()=>{
    gameConfig.mode=r.value;
    standardOptions.classList.toggle("hidden",r.value!=="standard");
    timeAttackOptions.classList.toggle("hidden",r.value!=="timeAttack");
  };
});

/* ======================
   Difficulty / Timer
====================== */
advancedDifficulty.onchange=()=>{
  gameConfig.advanced=advancedDifficulty.checked;
  difficultyOptions.classList.toggle("hidden",!advancedDifficulty.checked);
};
extremeOnly.onchange=()=>gameConfig.extremeOnly=extremeOnly.checked;

enablePerQuestionTimer.onchange=()=>{
  gameConfig.timer.enabled=enablePerQuestionTimer.checked;
  perQuestionTimerOptions.classList.toggle("hidden",!enablePerQuestionTimer.checked);
};

document.querySelectorAll("input[name=perQuestionTime]").forEach(r=>{
  r.onchange=()=>gameConfig.timer.perQuestion=+r.value;
});
document.querySelectorAll("input[name=totalTime]").forEach(r=>{
  r.onchange=()=>gameConfig.timer.total=+r.value;
});

/* ======================
   Summary → Start
====================== */
toSummaryBtn.onclick=()=>{
  gameConfig.questionsPerRound=+document.querySelector("input[name=qPerRound]:checked").value;
  gameConfig.rounds=+document.querySelector("input[name=roundCount]:checked").value;
  gameConfig.teams=+teamSelect.value;

  summaryList.innerHTML=`
    <li>🎮 Image Guess</li>
    <li>Mode: ${gameConfig.mode}</li>
    <li>Teams: ${gameConfig.teams}</li>
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
  teamScores=new Array(gameConfig.teams).fill(0);
  activeTeam=0;
  setup.classList.add("hidden");
  summary.classList.add("hidden");
  game.classList.remove("hidden");
  startTeamTurn();
};

/* ======================
   Team Turn (Time Attack)
====================== */
function startTeamTurn(){
  currentIndex=0;
  buildQueue();
  loadQuestion();

  if(gameConfig.mode==="timeAttack"){
    startTotalTimer();
    questionTitle.textContent=`Team ${activeTeam+1}`;
  }
}

/* ======================
   Queue
====================== */
function buildQueue(){
  let pool=allQuestions.filter(q=>{
    if(q.language!==gameConfig.language) return false;
    if(q.group!==gameConfig.group) return false;
    if(gameConfig.categories.length&&!gameConfig.categories.includes(q.category)) return false;
    if(gameConfig.extremeOnly&&q.difficulty!=="extreme") return false;
    return true;
  });

  shuffle(pool);

  if(gameConfig.mode==="timeAttack"){
    questionQueue=pool;
    return;
  }

  questionQueue=[];
  const dist=AUTO_DISTRIBUTION[gameConfig.questionsPerRound];
  Object.keys(dist).forEach(d=>{
    questionQueue.push(...pool.filter(q=>q.difficulty===d).slice(0,dist[d]));
  });
  shuffle(questionQueue);
}

/* ======================
   Question
====================== */
function loadQuestion(){
  const q=questionQueue[currentIndex];
  if(!q){ nextTeam(); return; }

  scoredThisQuestion.clear();
  imageRow.innerHTML="";
  ["img1","img2","img3","img4"].map(k=>q[k]).filter(Boolean).forEach(n=>{
    const i=document.createElement("img"); i.src=IMAGE_BASE+n;
    imageRow.appendChild(i);
  });
  answerBox.textContent=q.answer;
  answerBox.classList.add("hidden");
  renderTeams(q.difficulty);

  if(gameConfig.mode==="standard"&&gameConfig.timer.enabled){
    startPerQuestionTimer();
  }else{
    timerBox.classList.add("hidden");
  }
}

/* ======================
   Scoring
====================== */
function renderTeams(diff){
  teamButtons.innerHTML="";
  const pts=DIFFICULTY_SCORE[diff];
  const btn=document.createElement("button");
  btn.textContent=`+${pts} pts`;
  btn.onclick=()=>{
    teamScores[activeTeam]+=pts;
    sfxScore.play();
  };
  teamButtons.appendChild(btn);
}

/* ======================
   Timers
====================== */
function startPerQuestionTimer(){
  clearInterval(timerInterval);
  remainingTime=gameConfig.timer.perQuestion;
  timerBox.classList.remove("hidden","warning");

  timerInterval=setInterval(()=>{
    remainingTime--;
    timerBox.textContent=`⏱ ${remainingTime}`;
    if(remainingTime<=5) timerBox.classList.add("warning");
    if(remainingTime<=0){
      clearInterval(timerInterval);
      answerBox.classList.remove("hidden");
    }
  },1000);
}

function startTotalTimer(){
  clearInterval(timerInterval);
  remainingTime=gameConfig.timer.total;
  timerBox.classList.remove("hidden","warning");

  timerInterval=setInterval(()=>{
    remainingTime--;
    timerBox.textContent=`⏱ ${Math.floor(remainingTime/60)}:${String(remainingTime%60).padStart(2,"0")}`;
    if(remainingTime<=10) timerBox.classList.add("warning");
    if(remainingTime<=0){
      clearInterval(timerInterval);
      nextTeam();
    }
  },1000);
}

/* ======================
   Flow
====================== */
nextBtn.onclick=()=>{
  currentIndex++;
  loadQuestion();
};

toggleAnswerBtn.onclick=()=>{
  answerBox.classList.remove("hidden");
};

function nextTeam(){
  clearInterval(timerInterval);
  activeTeam++;

  if(activeTeam<gameConfig.teams){
    startTeamTurn();
  }else{
    showEndScreen();
  }
}

/* ======================
   End Screen
====================== */
function showEndScreen(){
  game.classList.add("hidden");
  summary.classList.remove("hidden");

  const ranked=teamScores
    .map((s,i)=>({team:i+1,score:s}))
    .sort((a,b)=>b.score-a.score);

  summaryList.innerHTML=ranked.map((r,i)=>
    `<li>${["🥇","🥈","🥉"][i]||"🎮"} Team ${r.team} — ${r.score} pts</li>`
  ).join("");

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
