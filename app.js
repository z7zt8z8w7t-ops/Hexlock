(() => {
  'use strict';
  const E=HexFlip, AI=HexFlipAI;
  const STORAGE='hex-flip-game-v1';
  const NS='http://www.w3.org/2000/svg';
  const $=id=>document.getElementById(id);
  const boardEl=$('board'), statusEl=$('status'), comboEl=$('comboBanner');
  const name=c=>c==='B'?'Blue':'Yellow';
  function validState(s) {
    return s && typeof s==='object' && s.board && typeof s.board==='object' &&
      ['B','W'].includes(s.turn) && Number.isInteger(s.moves) && s.moves>=0 &&
      typeof s.finished==='boolean' && Object.entries(s.board).every(([key,v])=>E.ON_BOARD.has(key)&&['B','W'].includes(v));
  }
  function load() {
    try {
      const saved=JSON.parse(localStorage.getItem(STORAGE));
      return validState(saved?.state)?saved:null;
    } catch { return null; }
  }
  const saved=load();
  let state=saved?.state||E.initial();
  let previous=validState(saved?.previous)?saved.previous:null;
  let mode=saved?.mode==='ai'?'ai':'human';
  let difficulty=['easy','medium','hard'].includes(saved?.difficulty)?saved.difficulty:'medium';
  let message=(saved?.message||'Blue moves first. Tap a highlighted hex to capture.').replaceAll('Black','Blue').replaceAll('White','Yellow');
  let recent=[], lastMove=null, aiTimer=null, comboTimer=null;
  $('modeSelect').value=mode;
  $('difficultySelect').value=difficulty;
  $('difficultyLabel').classList.toggle('hidden',mode!=='ai');
  $('hintsToggle').checked=saved?.hints!==false;
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify({state,previous,message,mode,difficulty,hints:$('hintsToggle').checked}))}catch{}}
  function svg(tag,attrs={}) {
    const el=document.createElementNS(NS,tag);
    for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v));
    return el;
  }
  const R=29.5;
  function centre(q,r){return [Math.sqrt(3)*R*(q+r/2),1.5*R*r]}
  function hexPointsAt(x,y,radius){return Array.from({length:6},(_,i)=>{const a=(90+60*i)*Math.PI/180;return `${(x+radius*Math.cos(a)).toFixed(2)},${(y+radius*Math.sin(a)).toFixed(2)}`}).join(' ')}
  function winnerText(){
    const {B,W}=E.count(state.board);
    if(B===W)return `It's a tie: ${B} each.`;
    return `${B>W?'Blue':'Yellow'} wins ${Math.max(B,W)} to ${Math.min(B,W)}.`;
  }
  function computerTurn(){return mode==='ai' && state.turn==='W' && !state.finished}
  function cancelAI(){if(aiTimer!==null){clearTimeout(aiTimer);aiTimer=null}}
  function clearCombo(){if(comboTimer!==null)clearTimeout(comboTimer);comboTimer=null;comboEl.classList.remove('show');comboEl.textContent=''}
  function showCombo(lines,flips){
    clearCombo();
    if(lines<2)return;
    comboEl.textContent=`${lines} directions · ${flips} flips!`;
    void comboEl.offsetWidth;
    comboEl.classList.add('show');
    comboTimer=setTimeout(clearCombo,2200);
  }
  function scheduleAI(){
    if(!computerTurn()||aiTimer!==null)return;
    aiTimer=setTimeout(()=>{
      aiTimer=null;
      if(!computerTurn())return;
      const choice=AI.choose(state,difficulty);
      if(choice)applyMove(choice.q,choice.r,true);
    },850);
  }
  function render(){
    const legal=state.finished?[]:E.legalMoves(state.board,state.turn);
    const canTap=!computerTurn();
    const legalKeys=new Set(canTap?legal.map(m=>E.KEY(m.q,m.r)):[]);
    const scores=E.count(state.board);
    $('blueCount').textContent=scores.B;
    $('yellowCount').textContent=scores.W;
    $('blueScore').classList.toggle('active',!state.finished&&state.turn==='B');
    $('yellowScore').classList.toggle('active',!state.finished&&state.turn==='W');
    $('turnName').textContent=state.finished?'Game over':computerTurn()?'Computer':name(state.turn);
    $('turnDetail').textContent=state.finished?'Final score':computerTurn()?'Yellow is thinking…':`${legal.length} legal ${legal.length===1?'move':'moves'}`;
    statusEl.textContent=state.finished?`${winnerText()} ${message}`:message;
    $('undoBtn').disabled=!previous;
    boardEl.replaceChildren();
    for(const [q,r] of E.CELLS){
      const key=E.KEY(q,r),[x,y]=centre(q,r),value=state.board[key];
      const isLegal=legalKeys.has(key);
      const g=svg('g',{class:`cell${(q+r)%2?' alt':''}${isLegal?' legal':''}${recent.includes(key)?' recent':''}${lastMove===key?' new':''}`,'data-q':q,'data-r':r,role:'gridcell','aria-label':value?`${name(value)} counter`:(isLegal?`Legal move: flip ${E.flipsFor(state.board,state.turn,q,r).length}`:'Empty hex')});
      const delay=recent.indexOf(key);
      if(delay>=0)g.style.setProperty('--flip-delay',`${Math.min(delay*75,525)}ms`);
      g.appendChild(svg('polygon',{points:hexPointsAt(x,y,R)}));
      if(value){
        g.appendChild(svg('polygon',{points:hexPointsAt(x,y,22),class:`piece ${value==='B'?'blue':'yellow'}`}));
        g.appendChild(svg('polygon',{points:hexPointsAt(x,y,18),class:`piece-inner ${value==='B'?'blue':'yellow'}`}));
      }else if(isLegal&&$('hintsToggle').checked){
        g.appendChild(svg('polygon',{points:hexPointsAt(x,y,10),class:'hint'}));
        const plus=svg('text',{x,y:y+1,class:'hint-plus'});plus.textContent='+';g.appendChild(plus);
      }
      if(isLegal){
        g.setAttribute('tabindex','0');
        g.addEventListener('click',()=>applyMove(q,r,false));
        g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();applyMove(q,r,false)}});
      }
      boardEl.appendChild(g);
    }
    save();
    scheduleAI();
  }
  function applyMove(q,r,fromAI){
    if(fromAI!==computerTurn() && mode==='ai')return;
    const result=E.play(state,q,r);
    if(!result)return;
    if(!fromAI)previous=structuredClone(state);
    const moved=name(state.turn);
    state=result.state;
    recent=result.flips;lastMove=E.KEY(q,r);
    const n=result.flips.length;
    message=`${moved} flipped ${n} ${n===1?'counter':'counters'}.`;
    if(result.passed&&!state.finished)message+=` ${name(result.passed)} has no legal move and passes.`;
    if(state.finished)message='No more legal moves.';
    render();
    showCombo(result.lines,n);
  }
  $('undoBtn').addEventListener('click',()=>{
    if(!previous)return;
    cancelAI();clearCombo();
    state=previous;previous=null;recent=[];lastMove=null;
    message=`Move undone. ${name(state.turn)} to play.`;render();
  });
  function reset(){
    cancelAI();clearCombo();
    state=E.initial();previous=null;recent=[];lastMove=null;
    message='Blue moves first. Tap a highlighted hex to capture.';render();
  }
  $('newGameBtn').addEventListener('click',()=>{
    if(state.moves>0&&!confirm('Start a new game? Your current game will be replaced.'))return;
    reset();
  });
  $('modeSelect').addEventListener('change',event=>{
    const choice=event.target.value;
    if(state.moves>0&&!confirm('Changing mode starts a new game. Continue?')){
      event.target.value=mode;return;
    }
    mode=choice;
    $('difficultyLabel').classList.toggle('hidden',mode!=='ai');
    reset();
  });
  $('difficultySelect').addEventListener('change',event=>{
    difficulty=event.target.value;
    cancelAI();save();scheduleAI();
  });
  $('hintsToggle').addEventListener('change',render);
  const dialog=$('rulesDialog');
  $('rulesBtn').addEventListener('click',()=>dialog.showModal());
  $('closeRules').addEventListener('click',()=>dialog.close());
  $('gotItBtn').addEventListener('click',()=>dialog.close());
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
  render();
})();
