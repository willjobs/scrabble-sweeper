import { generateLayout, quality } from '../src/engine/generator';
const count=Number(process.argv[2]??20);const start=performance.now();let sum=0;
for(let i=0;i<count;i++){const board=generateLayout(`review-${i}`);const score=quality(board);sum+=score;console.log(`\nSeed review-${i}; quality penalty ${score}`);for(let r=0;r<15;r++)console.log(board.slice(r*15,r*15+15).map(b=>b==='NONE'?' .':b).join(' '));}
console.log(`\n${count} boards; mean penalty ${(sum/count).toFixed(2)}; ${(performance.now()-start).toFixed(0)} ms`);
