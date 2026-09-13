// Same move vocabulary as CUBO.html, including the three middle slices.
export function randomMoves(count=20,random=Math.random){
  const axes=['x','y','z'],layers=[-1,0,1];
  const moves=[];
  let lastAxis=null;
  for(let i=0;i<count;i++){
    const available=axes.filter(axis=>axis!==lastAxis);
    const axis=available[Math.floor(random()*available.length)];
    moves.push({axis,layer:layers[Math.floor(random()*3)],dir:random()<.5?1:-1});
    lastAxis=axis;
  }
  return moves;
}

export const inverseOf=moves=>moves.slice().reverse().map(move=>({...move,dir:-move.dir}));

// A reproducible opening composition; subsequent interactions use fresh mixes.
let seed=23;
export const initialMoves=randomMoves(20,()=>{
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/4294967296;
});
