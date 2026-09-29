(() => {
  'use strict';
  const E=HexFlip;
  const STORAGE='hex-flip-game-v1';
  const NS='http://www.w3.org/2000/svg';
  const $=id=>document.getElementById(id);
  const boardEl=$('board'), statusEl=$('status');
  const name=c=>c==='B'?'Black':'White';
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
  let message=saved?.message||'Black moves first. Tap a highlighted hex to capture.';
  let recent=[]; let lastMove=null;
  $('hintsToggle').checked=saved?.hints!==false;
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify({state,previous,message,hints:$('hintsToggle').checked}))}catch{}}
  function svg(tag,attrs={}) {
    const el=document.createElementNS(NS,tag);
    for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v));
    return el;
  }
  const R=29.5;
  function centre(q,r){return [Math.sqrt(3)*R*(q+r/2),1.5*R*r]}
  function hexPoints(x,y){return Array.from({length:6},(_,i)=>{const a=(90+60*i)*Math.PI/180;return `${(x+R*Math.cos(a)).toFixed(2)},${(y+R*Math.sin(a)).toFixed(2)}`}).join(' ')}
  function winnerText(){
    const {B,W}=E.count(state.board);
    if(B===W)return `It's a tie: ${B} each.`;
    return `${B>W?'Black':'White'} wins ${Math.max(B,W)} to ${Math.min(B,W)}.`;
  }
  function render(){
    const legal=state.finished?[]:E.legalMoves(state.board,state.turn);
    const legalKeys=new Set(legal.map(m=>E.KEY(m.q,m.r)));
    const scores=E.count(state.board);
    $('blackCount').textContent=scores.B;
    $('whiteCount').textContent=scores.W;
    $('blackScore').classList.toggle('active',!state.finished&&state.turn==='B');
    $('whiteScore').classList.toggle('active',!state.finished&&state.turn==='W');
    $('turnName').textContent=state.finished?'Game over':name(state.turn);
    $('turnDetail').textContent=state.finished?'Final score':`${legal.length} legal ${legal.length===1?'move':'moves'}`;
    statusEl.textContent=state.finished?`${winnerText()} ${message}`:message;
    $('undoBtn').disabled=!previous;
    boardEl.replaceChildren();
    for(const [q,r] of E.CELLS){
      const key=E.KEY(q,r),[x,y]=centre(q,r),value=state.board[key];
      const isLegal=legalKeys.has(key);
      const g=svg('g',{class:`cell${(q+r)%2?' alt':''}${isLegal?' legal':''}${recent.includes(key)?' recent':''}${lastMove===key?' new':''}`,'data-q':q,'data-r':r,role:'gridcell','aria-label':value?`${name(value)} counter`:(isLegal?`Legal move: flip ${E.flipsFor(state.board,state.turn,q,r).length}`:'Empty hex')});
      g.appendChild(svg('polygon',{points:hexPoints(x,y)}));
      if(value){
        g.appendChild(svg('circle',{cx:x,cy:y,r:22,class:`piece ${value==='B'?'black':'white'}`}));
        g.appendChild(svg('circle',{cx:x,cy:y,r:18,class:`piece-inner ${value==='B'?'black':'white'}`}));
      }else if(isLegal&&$('hintsToggle').checked){
        g.appendChild(svg('circle',{cx:x,cy:y,r:9,class:'hint'}));
        const plus=svg('text',{x,y:y+1,class:'hint-plus'});plus.textContent='+';g.appendChild(plus);
      }
      if(isLegal){
        g.setAttribute('tabindex','0');
        g.addEventListener('click',()=>move(q,r));
        g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();move(q,r)}});
      }
      boardEl.appendChild(g);
    }
    save();
  }
  function move(q,r){
    const result=E.play(state,q,r);
    if(!result)return;
    previous=structuredClone(state);
    const moved=name(state.turn);
    state=result.state;
    recent=result.flips;lastMove=E.KEY(q,r);
    const n=result.flips.length;
    message=`${moved} flipped ${n} ${n===1?'counter':'counters'}.`;
    if(result.passed&&!state.finished)message+=` ${name(result.passed)} has no legal move and passes.`;
    if(state.finished)message='No more legal moves.';
    render();
  }
  $('undoBtn').addEventListener('click',()=>{
    if(!previous)return;
    state=previous;previous=null;recent=[];lastMove=null;
    message=`Move undone. ${name(state.turn)} to play.`;render();
  });
  $('newGameBtn').addEventListener('click',()=>{
    if(state.moves>0&&!confirm('Start a new game? Your current game will be replaced.'))return;
    state=E.initial();previous=null;recent=[];lastMove=null;
    message='Black moves first. Tap a highlighted hex to capture.';render();
  });
  $('hintsToggle').addEventListener('change',render);
  const dialog=$('rulesDialog');
  $('rulesBtn').addEventListener('click',()=>dialog.showModal());
  $('closeRules').addEventListener('click',()=>dialog.close());
  $('gotItBtn').addEventListener('click',()=>dialog.close());
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
  render();
})();
