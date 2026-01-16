"use strict";

const IMAGE_BASE = "https://yongearn-dev.github.io/guess-word-game/images/";
const SHEET_URL = "https://opensheet.elk.sh/1nmgda-PSW0qNpEnT65HozbrbK4SPoOlfq3WlEIQSgf4/Sheet1";

const config = {
  mode: "standard",
  language: "",
  group: "",
  categories: [],
  qPerRound: 10,
  rounds: 1,
  teams: 1,
  extremeOnly: false,
  timer: false,
  timerMode: "question"
};

let allQuestions = [];
let used = new Set();
let questions = [];
let qIndex = 0;
let round = 1;
let scores = [];
let timer = null;
let time = 30;

/* ===== Load ===== */
fetch(SHEET_URL).then(r=>r.json()).then(d=>allQuestions=d);

/* ===== Maps ===== */
const GROUPS = {
  zh: [{v:"bible",l:"聖經"},{v:"other",l:"其他"}],
  th: [{v:"bible",l:"พระคัมภีร์"},{v:"other",l:"อื่นๆ"}]
};
const CATS = {
  bible: ["person","place","vocab"],
  other: ["travel","life","food","knowledge"]
};

/* ===== DOM ===== */
const $ = id=>document.getElementById(id);

/* ===== Language → Group ===== */
$("language").onchange=e=>{
  config.language=e.target.value;
  $("group").innerHTML="";
  $("categories").innerHTML="";
  $("group").disabled=!config.language;
  GROUPS[config.language]?.forEach(g=>{
    let o=document.createElement("option");
    o.value=g.v;o.textContent=g.l;
    $("group").appendChild(o);
  });
};

$("group").onchange=e=>{
  config.group=e.target.value;
  $("categories").innerHTML="";
  config.categories=[];
  CATS[config.group].forEach(c=>{
    let l=document.createElement("label");
    let cb=document.createElement("input");
    cb.type="checkbox";cb.value=c;
    cb.onchange=()=>cb.checked?config.categories.push(c):config.categories=config.categories.filter(x=>x!==c);
    l.append(cb," ",c);
    $("categories").appendChild(l);
  });
};

/* ===== Mode ===== */
document.querySelectorAll("[name=gameMode]").forEach(r=>{
  r.onchange=()=>config.mode=r.value;
});

/* ===== Timer ===== */
$("enableTimer").onchange=e=>{
  config.timer=e.target.checked;
  $("timerOptions").classList.toggle("hidden",!config.timer);
};

/* ===== Summary ===== */
$("toSummary").onclick=()=>{
  config.qPerRound=+$("qPerRound").value;
  config.rounds=+$("roundCount").value;
  config.teams=+$("teamCount").value;
  config.extremeOnly=$("extremeOnly").checked;

  $("summaryList").innerHTML=`
    <li>🎮 模式：${config.mode}</li>
    <li>🌏 語言：${config.language}</li>
    <li>📖 類型：${config.group}｜${config.categories.join("+")}</li>
    <li>❓ 題數：${config.qPerRound}</li>
    <li>⚠️ 難度：${config.extremeOnly?"Extreme only":"混合"}</li>
    <li>👥 組別：${config.teams}</li>
    <li>⏱️ 計時：${config.timer?"開":"關"}</li>
  `;
  $("setup").classList.add("hidden");
  $("summary").classList.remove("hidden");
};

$("back").onclick=()=>{
  $("summary").classList.add("hidden");
  $("setup").classList.remove("hidden");
};

/* ===== Start ===== */
$("start").onclick=()=>{
  scores=new Array(config.teams).fill(0);
  used.clear();round=1;
  $("summary").classList.add("hidden");
  $("game").classList.remove("hidden");
  startRound();
};

function startRound(){
  qIndex=0;
  questions=allQuestions.filter(q=>{
    if(used.has(q.id))return false;
    if(q.language!==config.language)return false;
    if(q.group!==config.group)return false;
    if(config.categories.length&&!config.categories.includes(q.category))return false;
    if(config.extremeOnly&&q.difficulty!=="extreme")return false;
    return true;
  }).sort(()=>Math.random()-0.5).slice(0,config.qPerRound);
  questions.forEach(q=>used.add(q.id));
  load();
}

function load(){
  const q=questions[qIndex];
  if(!q)return;
  $("questionTitle").textContent=`第 ${round} 輪 · 第 ${qIndex+1} 題`;
  $("imageRow").innerHTML="";
  ["img1","img2","img3","img4"].filter(k=>q[k]).forEach(k=>{
    let i=document.createElement("img");
    i.src=IMAGE_BASE+q[k];
    $("imageRow").appendChild(i);
  });
  $("answer").textContent=q.answer;
  $("answer").classList.add("hidden");
  renderTeams();
}

function renderTeams(){
  $("teamButtons").innerHTML="";
  scores.forEach((s,i)=>{
    let b=document.createElement("button");
    b.textContent=`第${i+1}組 +1（${s}）`;
    b.onclick=()=>{scores[i]++;renderTeams();};
    $("teamButtons").appendChild(b);
  });
}

$("showAnswer").onclick=()=>$("answer").classList.remove("hidden");
$("next").onclick=()=>{
  qIndex++;
  if(qIndex>=questions.length){
    round++;
    if(round>config.rounds){
      alert("🎉 完成");
      location.reload();
    } else startRound();
  } else load();
};
