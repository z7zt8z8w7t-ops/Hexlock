/* Optional local computer opponent. Internal W is the yellow player. */
(function(root,factory){
  const api=factory(root.HexFlip || (typeof require==='function' && require('./engine.js')));
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  root.HexFlipAI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
  'use strict';
  const corners=new Set(['4,0','4,-4','0,-4','-4,0','-4,4','0,4']);
  function edge(q,r){return Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))===4}
  function moveValue(m){return (corners.has(E.KEY(m.q,m.r))?90:edge(m.q,m.r)?8:0)+m.flips.length}
  function evaluate(s){
    const counts=E.count(s.board),diff=counts.W-counts.B;
    if(s.finished)return diff===0?0:diff>0?10000+diff:-10000+diff;
    let position=0;
    for(const [q,r] of E.CELLS){
      const v=s.board[E.KEY(q,r)];if(!v)continue;
      const weight=corners.has(E.KEY(q,r))?50:edge(q,r)?5:0;
      position+=(v==='W'?1:-1)*weight;
    }
    const mobility=E.legalMoves(s.board,'W').length-E.legalMoves(s.board,'B').length;
    return position+mobility*4+diff*(Object.keys(s.board).length>47?3:0.5);
  }
  function ordered(s){return E.legalMoves(s.board,s.turn).sort((a,b)=>moveValue(b)-moveValue(a))}
  function search(s,depth,alpha,beta){
    if(!depth||s.finished)return evaluate(s);
    const moves=ordered(s),max=s.turn==='W';
    if(!moves.length)return evaluate(s);
    let best=max?-Infinity:Infinity;
    for(const m of moves){
      const next=E.play(s,m.q,m.r).state;
      const value=search(next,depth-1,alpha,beta);
      best=max?Math.max(best,value):Math.min(best,value);
      if(max)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);
      if(beta<=alpha)break;
    }
    return best;
  }
  function choose(state,level='medium',random=Math.random){
    const options=E.legalMoves(state.board,state.turn);
    if(!options.length)return null;
    if(level==='easy')return options[Math.floor(random()*options.length)];
    if(level==='medium'){
      const scored=options.map(m=>({m,score:moveValue(m)}));
      scored.sort((a,b)=>b.score-a.score);
      return scored[0].m;
    }
    let best=null,bestValue=-Infinity;
    for(const m of options.sort((a,b)=>moveValue(b)-moveValue(a))){
      const value=search(E.play(state,m.q,m.r).state,2,-Infinity,Infinity);
      if(value>bestValue){bestValue=value;best=m}
    }
    return best;
  }
  return {choose,evaluate};
});
