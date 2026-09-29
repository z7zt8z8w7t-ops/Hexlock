/* Hex Flip rules engine. Axial coordinates: q, r; board radius 4. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HexFlip = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const RADIUS = 4;
  const DIRECTIONS = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
  const CELLS = [];
  for (let r=-RADIUS; r<=RADIUS; r++) {
    for (let q=-RADIUS; q<=RADIUS; q++) {
      if (Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))<=RADIUS) CELLS.push([q,r]);
    }
  }
  const KEY = (q,r) => `${q},${r}`;
  const ON_BOARD = new Set(CELLS.map(([q,r])=>KEY(q,r)));
  const other = color => color === 'B' ? 'W' : 'B';
  function initial() {
    return {board:{'0,0':'B','1,1':'B','1,0':'W','0,1':'W'},turn:'B',moves:0,finished:false};
  }
  function captureLines(board, color, q, r) {
    if (!ON_BOARD.has(KEY(q,r)) || board[KEY(q,r)]) return [];
    const result=[];
    for (const [dq,dr] of DIRECTIONS) {
      let x=q+dq, y=r+dr, line=[];
      while (board[KEY(x,y)]===other(color)) {
        line.push(KEY(x,y)); x+=dq; y+=dr;
      }
      if (line.length && board[KEY(x,y)]===color) result.push(line);
    }
    return result;
  }
  function flipsFor(board,color,q,r) { return captureLines(board,color,q,r).flat(); }
  function legalMoves(board,color) {
    return CELLS.map(([q,r])=>({q,r,flips:flipsFor(board,color,q,r)})).filter(m=>m.flips.length);
  }
  function count(board) {
    return {B:Object.values(board).filter(v=>v==='B').length,W:Object.values(board).filter(v=>v==='W').length};
  }
  function play(state,q,r) {
    if (state.finished) return null;
    const lines=captureLines(state.board,state.turn,q,r);
    const flips=lines.flat();
    if (!flips.length) return null;
    const board={...state.board,[KEY(q,r)]:state.turn};
    flips.forEach(key=>{board[key]=state.turn});
    let turn=other(state.turn), passed=null, finished=false;
    if (!legalMoves(board,turn).length) {
      passed=turn; turn=state.turn;
      if (!legalMoves(board,turn).length) finished=true;
    }
    if (Object.keys(board).length===CELLS.length) finished=true;
    return {state:{board,turn,moves:state.moves+1,finished},flips,lines:lines.length,passed};
  }
  return {RADIUS,DIRECTIONS,CELLS,KEY,ON_BOARD,initial,captureLines,flipsFor,legalMoves,count,play};
});
