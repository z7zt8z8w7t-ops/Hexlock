
(() => {
  "use strict";

  const SQ3 = Math.sqrt(3);
  const BOARD_COLS = 16, BOARD_ROWS = 5;
  const VIEW_W = 1160, VIEW_H = 420;
  const R = 34;
  const X0 = 52, Y0 = 70;

  const playerColors = ["#BFE3FF","#FFD84D","#F6B7C5","#BFE6C4"];
  const typeOrder = ["B","C","D","E"];
  const startCounts = {B:8,C:3,D:1,E:4};

  // Edge order: UR, TOP, UL, LL, BOTTOM, LR.
  const edgeAngles = [30,90,150,210,270,330];
  const edgeVec = edgeAngles.map(a => [Math.cos(a*Math.PI/180), -Math.sin(a*Math.PI/180)]);
  const tileSpokes = {
    A: [[1,4]],              // direct edge-to-edge
    B: [[1,"c"],["c",3]],
    C: [[1,"c"],["c",3],["c",5]],
    D: [[0,"c"],[1,"c"],[2,"c"],[3,"c"],[4,"c"],[5,"c"]],
    E: [[2,"c"],["c",5],[3,"c"],["c",0]],
    F: [[1,"c"],["c",4],["c",3],["c",5]]
  };

  let state = null;
  let selectedType = null;
  let rotation = 0;
  let chosenPlayers = 2;
  let scoredCycles = new Set();
  let scoredCycleNodes = new Set();
  let replaceMode = false;
  let replaceTarget = null;

  const $ = s => document.querySelector(s);
  const boardSvg = $("#board");

  document.querySelectorAll(".playerCount").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".playerCount").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      chosenPlayers = Number(btn.dataset.n);
    });
  });

  $("#startBtn").addEventListener("click", startGame);
  $("#newGameBtn").addEventListener("click", () => {
    $("#game").classList.add("hidden");
    $("#setup").classList.remove("hidden");
  });
  $("#rulesBtn").addEventListener("click", () => $("#rulesModal").classList.remove("hidden"));
  $("#closeRules").addEventListener("click", () => $("#rulesModal").classList.add("hidden"));
  $("#replaceBtn").addEventListener("click", () => toggleReplaceMode());
  $("#rotateBtn").addEventListener("click", () => {
    if (!selectedType) return;
    rotation = (rotation + 1) % 6;
    renderTray();
    renderBoard();
  });
  $("#cancelBtn").addEventListener("click", clearSelection);
  $("#passReadyBtn").addEventListener("click", () => $("#passModal").classList.add("hidden"));
  $("#playAgainBtn").addEventListener("click", () => {
    $("#gameOverModal").classList.add("hidden");
    startGame();
  });

  function startGame(){
    state = {
      n: chosenPlayers,
      current: 0,
      moveNo: 0,
      placed: {},
      scores: Array(chosenPlayers).fill(0),
      personalTurns: Array(chosenPlayers).fill(0),
      remaining: Array.from({length: chosenPlayers}, () => ({...startCounts}))
    };
    selectedType = null; rotation = 0; scoredCycles = new Set(); scoredCycleNodes = new Set(); replaceMode = false; replaceTarget = null;
    $("#setup").classList.add("hidden");
    $("#game").classList.remove("hidden");
    $("#eventText").textContent = "Player 1: choose a tile.";
    renderAll();
  }

  function key(c,r){ return `${c},${r}`; }

  function center(c,r){
    return [X0 + c * 1.5 * R, Y0 + r * SQ3 * R + (c%2 ? SQ3*R/2 : 0)];
  }

  function hexPoints(cx,cy,rad=R){
    return [0,60,120,180,240,300].map(a => {
      const t=a*Math.PI/180;
      return `${cx+rad*Math.cos(t)},${cy+rad*Math.sin(t)}`;
    }).join(" ");
  }

  function svgEl(name, attrs={}){
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
    return el;
  }

  function clearSelection(){
    selectedType = null; rotation = 0; replaceMode = false; replaceTarget = null;
    $("#rotateBtn").disabled = true;
    $("#cancelBtn").disabled = true;
    $("#replaceBtn").classList.remove("selected");
    $("#turnHint").textContent = "Choose a tile below.";
    renderTray(); renderBoard();
  }

  function toggleReplaceMode(){
    const p = state.current;
    if(state.personalTurns[p] < 2){
      $("#eventText").textContent = "Replacement unlocks on your third personal turn.";
      return;
    }
    replaceMode = !replaceMode;
    replaceTarget = null;
    selectedType = null;
    rotation = 0;
    $("#rotateBtn").disabled = true;
    $("#cancelBtn").disabled = !replaceMode;
    $("#replaceBtn").classList.toggle("selected", replaceMode);
    $("#turnHint").textContent = replaceMode ? "Tap one of your own unlocked tiles on the board." : "Choose a tile below.";
    renderTray(); renderBoard();
  }

  function selectTile(type){
    const p = state.current;
    if (state.remaining[p][type] <= 0) return;
    if (type === "D" && state.personalTurns[p] < 2) return;
    selectedType = type; rotation = 0;
    $("#rotateBtn").disabled = false;
    $("#cancelBtn").disabled = false;
    if(replaceMode && replaceTarget){
      $("#turnHint").textContent = "Rotate if needed, then tap the selected tile again to replace it.";
    }else{
      replaceMode = false; replaceTarget = null; $("#replaceBtn").classList.remove("selected");
      $("#turnHint").textContent = "Rotate if needed, then tap a highlighted board space.";
    }
    renderTray(); renderBoard();
  }

  function legalCell(c,r){
    if (state.placed[key(c,r)]) return false;
    if (state.moveNo === 0) return true;
    const [cx,cy] = center(c,r);
    for (const pos of Object.values(state.placed)){
      const [px,py] = center(pos.c,pos.r);
      const d = Math.hypot(cx-px,cy-py);
      if (Math.abs(d - SQ3*R) < 1) return true;
    }
    return false;
  }

  function renderAll(){
    renderScores(); renderTurn(); renderTray(); renderBoard();
  }

  function renderScores(){
    const bar = $("#scorebar"); bar.innerHTML = "";
    for(let i=0;i<state.n;i++){
      const d = document.createElement("div");
      d.className = "score" + (i===state.current ? " current":"");
      d.style.background = playerColors[i];
      d.innerHTML = `<span>P${i+1}</span><span>${state.scores[i]} pt${state.scores[i]===1?"":"s"}</span>`;
      bar.appendChild(d);
    }
    // hide empty grid columns naturally
    bar.style.gridTemplateColumns = `repeat(${Math.min(state.n,4)},1fr)`;
  }

  function renderTurn(){
    const p = state.current;
    $("#turnName").textContent = `Player ${p+1}`;
    $("#turnName").style.color = playerColors[p];
    const locked = state.personalTurns[p] < 2 && state.remaining[p].D > 0;
    $("#dLockText").textContent = locked ? `Six-way tile unlocks on personal turn 3 (${2-state.personalTurns[p]} turn${2-state.personalTurns[p]===1?"":"s"} to go)` : "Six-way tile available";
    $("#replaceBtn").disabled = state.personalTurns[p] < 2;
    const total = Object.values(state.remaining[p]).reduce((a,b)=>a+b,0);
    $("#remainingText").textContent = `${total} remaining`;
  }

  function renderTray(){
    const tray = $("#tileTray"); tray.innerHTML="";
    const p = state.current;
    typeOrder.forEach(type => {
      const count = state.remaining[p][type];
      const btn = document.createElement("button");
      btn.className = "tileButton";
      if(selectedType===type) btn.classList.add("selected");
      const locked = type==="D" && state.personalTurns[p] < 2;
      if(locked || count===0) btn.classList.add("locked");
      btn.disabled = locked || count===0;
      btn.innerHTML = tileIcon(type, selectedType===type ? rotation : 0, playerColors[p]) + `<div class="tileCount">×${count}</div>`;
      btn.addEventListener("click",()=>selectTile(type));
      tray.appendChild(btn);
    });
  }

  function tileIcon(type, rot, color){
    const rad=26, cx=32, cy=32;
    let s=`<svg viewBox="0 0 64 64"><polygon points="${hexPoints(cx,cy,rad)}" fill="${color}" stroke="#111" stroke-width="2"/>`;
    s += routeSvg(type,rot,cx,cy,rad,6);
    s += `</svg>`;
    return s;
  }

  function routeSvg(type,rot,cx,cy,rad,lineW){
    let out="";
    const segs = tileSpokes[type];
    for(const [a0,b0] of segs){
      const a = a0==="c" ? "c" : (a0+rot)%6;
      const b = b0==="c" ? "c" : (b0+rot)%6;
      const pa = a==="c" ? [cx,cy] : [cx+edgeVec[a][0]*rad*0.866, cy+edgeVec[a][1]*rad*0.866];
      const pb = b==="c" ? [cx,cy] : [cx+edgeVec[b][0]*rad*0.866, cy+edgeVec[b][1]*rad*0.866];
      out += `<line x1="${pa[0]}" y1="${pa[1]}" x2="${pb[0]}" y2="${pb[1]}" stroke="#1B4F9A" stroke-width="${lineW}" stroke-linecap="butt" stroke-linejoin="round"/>`;
    }
    if(segs.some(([a,b])=>a==="c"||b==="c")){
      out += `<circle cx="${cx}" cy="${cy}" r="${lineW/2}" fill="#1B4F9A"/>`;
    }
    return out;
  }

  function renderBoard(){
    boardSvg.innerHTML="";
    // board background hexes
    for(let c=0;c<BOARD_COLS;c++){
      for(let r=0;r<BOARD_ROWS;r++){
        const [cx,cy]=center(c,r);
        const poly=svgEl("polygon",{points:hexPoints(cx,cy,R-1),class:"boardHex"});
        if(selectedType && legalCell(c,r)) poly.classList.add("legal");
        if(selectedType && legalCell(c,r)){
          poly.addEventListener("click",()=>placeSelected(c,r));
        }
        boardSvg.appendChild(poly);
      }
    }
    // placed tiles
    for(const pos of Object.values(state.placed)){
      drawPlacedTile(pos);
    }
  }

  function drawPlacedTile(pos){
    const [cx,cy]=center(pos.c,pos.r);
    const g=svgEl("g");
    g.appendChild(svgEl("polygon",{points:hexPoints(cx,cy,R-2),fill:playerColors[pos.player],class:"tileHex"}));
    const segs=tileSpokes[pos.type];
    for(const [a0,b0] of segs){
      const a = a0==="c" ? "c" : (a0+pos.rot)%6;
      const b = b0==="c" ? "c" : (b0+pos.rot)%6;
      const pa = a==="c" ? [cx,cy] : [cx+edgeVec[a][0]*R*0.866, cy+edgeVec[a][1]*R*0.866];
      const pb = b==="c" ? [cx,cy] : [cx+edgeVec[b][0]*R*0.866, cy+edgeVec[b][1]*R*0.866];
      g.appendChild(svgEl("line",{x1:pa[0],y1:pa[1],x2:pb[0],y2:pb[1],class:"route routeEdge"}));
    }
    if(segs.some(([a,b])=>a==="c"||b==="c")){
      g.appendChild(svgEl("circle",{cx,cy,r:5,fill:"#1B4F9A",class:"routeCenter"}));
    }
    if(replaceMode && pos.player===state.current){
      const tileNodeKeys = tileGraphNodeKeys(pos);
      const lockedByScore = tileNodeKeys.some(k => scoredCycleNodes.has(k));
      if(!lockedByScore){
        const hit=svgEl("polygon",{points:hexPoints(cx,cy,R-2),fill:"transparent",stroke:"#ffffff","stroke-width":"3","stroke-dasharray":"8 6"});
        hit.style.cursor="pointer";
        hit.addEventListener("click",()=>chooseReplaceTarget(pos));
        g.appendChild(hit);
      }
    }
    boardSvg.appendChild(g);
  }

  function chooseReplaceTarget(pos){
    if(!replaceMode) return;
    const tileNodeKeys = tileGraphNodeKeys(pos);
    if(tileNodeKeys.some(k => scoredCycleNodes.has(k))){
      $("#eventText").textContent = "That tile is part of a scored loop and cannot be replaced.";
      return;
    }
    replaceTarget = pos;
    selectedType = null;
    rotation = 0;
    $("#turnHint").textContent = "Now choose an unused replacement tile from your tray.";
    renderTray(); renderBoard();
  }

  function tileGraphNodeKeys(pos){
    const [cx,cy]=center(pos.c,pos.r);
    const keys=new Set([graphNodeKey(cx,cy)]);
    const segs=tileSpokes[pos.type];
    for(const [a0,b0] of segs){
      for(const t of [a0,b0]){
        if(t==="c") continue;
        const a=(t+pos.rot)%6;
        const x=cx+edgeVec[a][0]*R*0.866, y=cy+edgeVec[a][1]*R*0.866;
        keys.add(graphNodeKey(x,y));
      }
    }
    return [...keys];
  }

  function placeSelected(c,r){
    if(replaceMode && replaceTarget){
      if(!selectedType) return;
      return executeReplacement();
    }
    if(!selectedType || !legalCell(c,r)) return;
    const p=state.current;
    state.placed[key(c,r)]={c,r,type:selectedType,rot:rotation,player:p};
    state.remaining[p][selectedType]--;
    state.personalTurns[p]++;
    state.moveNo++;

    const newly = detectNewSixTurnLoops();
    if(newly.length){
      state.scores[p] += newly.length;
      $("#eventText").textContent = `Player ${p+1} completed ${newly.length} new loop${newly.length===1?"":"s"} and scores ${newly.length} point${newly.length===1?"":"s"}!`;
    }else{
      $("#eventText").textContent = `Player ${p+1} placed a tile.`;
    }

    selectedType=null; rotation=0;
    $("#rotateBtn").disabled=true; $("#cancelBtn").disabled=true;

    if(gameFinished()){
      renderAll();
      showGameOver();
      return;
    }

    state.current=(state.current+1)%state.n;
    renderAll();
    $("#passTitle").textContent=`Player ${state.current+1}`;
    $("#passModal").classList.remove("hidden");
  }

  function executeReplacement(){
    const p=state.current;
    if(!replaceTarget || !selectedType) return;

    const oldType = replaceTarget.type;
    state.remaining[p][oldType] += 1;
    state.remaining[p][selectedType] -= 1;

    state.placed[key(replaceTarget.c,replaceTarget.r)] = {
      c: replaceTarget.c,
      r: replaceTarget.r,
      type: selectedType,
      rot: rotation,
      player: p
    };

    state.personalTurns[p]++;
    state.moveNo++;

    const newly = detectNewSixTurnLoops();
    if(newly.length){
      state.scores[p] += newly.length;
      $("#eventText").textContent = `Player ${p+1} replaced a tile and completed ${newly.length} new loop${newly.length===1?"":"s"}, scoring ${newly.length} point${newly.length===1?"":"s"}!`;
    }else{
      $("#eventText").textContent = `Player ${p+1} replaced one of their own tiles.`;
    }

    selectedType=null; rotation=0; replaceMode=false; replaceTarget=null;
    $("#replaceBtn").classList.remove("selected");
    $("#rotateBtn").disabled=true; $("#cancelBtn").disabled=true;

    if(gameFinished()){
      renderAll(); showGameOver(); return;
    }

    state.current=(state.current+1)%state.n;
    renderAll();
    $("#passTitle").textContent=`Player ${state.current+1}`;
    $("#passModal").classList.remove("hidden");
  }

  function gameFinished(){
    const allUsed=state.remaining.every(rem=>Object.values(rem).every(v=>v===0));
    if(allUsed) return true;
    // no legal spaces only if board completely blocked/full; adjacency rule means any empty neighbor of placed is legal
    let any=false;
    for(let c=0;c<BOARD_COLS&&!any;c++)for(let r=0;r<BOARD_ROWS;r++)if(legalCell(c,r)){any=true;break;}
    return !any;
  }

  function showGameOver(){
    const max=Math.max(...state.scores);
    const winners=state.scores.map((s,i)=>s===max?i:null).filter(i=>i!==null);
    $("#gameOverTitle").textContent = winners.length===1 ? `Player ${winners[0]+1} wins!` : `Draw`;
    $("#gameOverText").textContent = winners.length===1 ? `Final score: ${max} point${max===1?"":"s"}.` : `Players ${winners.map(i=>i+1).join(", ")} tied on ${max} points.`;
    $("#gameOverModal").classList.remove("hidden");
  }

  // ---------- Route graph + six-turn cycle detection ----------
  // Nodes are world coordinates rounded to 3 dp. Adjacent tile edge-midpoints therefore merge.
  function graphNodeKey(x,y){ return `${x.toFixed(3)},${y.toFixed(3)}`; }

  function buildGraph(){
    const adj=new Map();
    const coords=new Map();
    const addNode=(k,x,y)=>{ if(!adj.has(k)) adj.set(k,new Set()); if(!coords.has(k)) coords.set(k,[x,y]); };
    const addEdge=(a,b)=>{ adj.get(a).add(b); adj.get(b).add(a); };

    for(const pos of Object.values(state.placed)){
      const [cx,cy]=center(pos.c,pos.r);
      const centerKey=graphNodeKey(cx,cy);
      const segs=tileSpokes[pos.type];
      for(const [a0,b0] of segs){
        const a=a0==="c"?"c":(a0+pos.rot)%6;
        const b=b0==="c"?"c":(b0+pos.rot)%6;
        let pa,pb;
        if(a==="c") pa=[centerKey,cx,cy]; else{
          const x=cx+edgeVec[a][0]*R*0.866, y=cy+edgeVec[a][1]*R*0.866;
          pa=[graphNodeKey(x,y),x,y];
        }
        if(b==="c") pb=[centerKey,cx,cy]; else{
          const x=cx+edgeVec[b][0]*R*0.866, y=cy+edgeVec[b][1]*R*0.866;
          pb=[graphNodeKey(x,y),x,y];
        }
        addNode(pa[0],pa[1],pa[2]); addNode(pb[0],pb[1],pb[2]); addEdge(pa[0],pb[0]);
      }
    }
    return {adj,coords};
  }

  function canonicalCycle(nodes){
    // nodes without repeated start
    const n=nodes.length;
    const seqs=[];
    for(let rev=0;rev<2;rev++){
      const arr=rev ? [...nodes].reverse() : [...nodes];
      for(let i=0;i<n;i++) seqs.push(arr.slice(i).concat(arr.slice(0,i)).join("|"));
    }
    seqs.sort();
    return seqs[0];
  }

  function directionAngle(a,b,coords){
    const [x1,y1]=coords.get(a), [x2,y2]=coords.get(b);
    let ang=Math.atan2(y2-y1,x2-x1);
    // undirected line orientation in [0,pi)
    ang=((ang%Math.PI)+Math.PI)%Math.PI;
    return ang;
  }

  function countTurns(cycle,coords){
    const n=cycle.length;
    let turns=0;
    for(let i=0;i<n;i++){
      const prev=cycle[(i-1+n)%n], cur=cycle[i], next=cycle[(i+1)%n];
      const [px,py]=coords.get(prev), [cx,cy]=coords.get(cur), [nx,ny]=coords.get(next);
      const v1=[px-cx,py-cy], v2=[nx-cx,ny-cy];
      const cross=Math.abs(v1[0]*v2[1]-v1[1]*v2[0]);
      const dot=v1[0]*v2[0]+v1[1]*v2[1];
      // straight continuation has cross ~0 and vectors opposite (dot < 0)
      const denom=Math.hypot(...v1)*Math.hypot(...v2);
      const sinv=denom?cross/denom:0;
      if(!(sinv<1e-5 && dot<0)) turns++;
    }
    return turns;
  }

  function enumerateCyclesSixTurns(adj,coords){
    const nodes=[...adj.keys()].sort();
    const found=new Map();
    // DFS each start, only walk nodes >= start lexically to reduce duplicates.
    for(const start of nodes){
      const visited=new Set([start]);
      const path=[start];
      const dfs=(cur)=>{
        if(path.length>80) return; // practical guard; board is much smaller in normal play
        for(const nxt of adj.get(cur)||[]){
          if(nxt===start && path.length>=3){
            const cyc=[...path];
            if(countTurns(cyc,coords)===6){
              found.set(canonicalCycle(cyc),cyc);
            }
            continue;
          }
          if(visited.has(nxt)) continue;
          if(nxt<start) continue;
          visited.add(nxt); path.push(nxt); dfs(nxt); path.pop(); visited.delete(nxt);
          if(found.size>2500) return;
        }
      };
      dfs(start);
      if(found.size>2500) break;
    }
    return found;
  }

  function detectNewSixTurnLoops(){
    const {adj,coords}=buildGraph();
    const all=enumerateCyclesSixTurns(adj,coords);
    const newOnes=[];
    for(const [canon,cyc] of all){
      if(!scoredCycles.has(canon)){
        scoredCycles.add(canon);
        cyc.forEach(n => scoredCycleNodes.add(n));
        newOnes.push(cyc);
      }
    }
    return newOnes;
  }

  // Service worker
  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
})();
