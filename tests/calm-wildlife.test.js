const test=require('node:test');
const assert=require('node:assert/strict');
const create=require('../src/calm-wildlife');
// Exercise real arrival/movement and hit-testing without exposing internal scene state.
function arrive(world){for(let i=0;i<300;i++)world.update(.05,1100,650,()=>330,0);}
const hit=(world)=>world.touch(0,352,1100,650,()=>330);
test('all five daytime species arrive; elephant warns twice and other animals flee immediately',()=>{
  const world=create(()=>0);
  for(let species=0;species<5;species++){
    arrive(world);
    if(species===3){assert.equal(hit(world),'angry');assert.equal(hit(world),'angry');assert.equal(hit(world),'flee');}
    else assert.equal(hit(world),'flee');
    world.reset();
  }
});
test('animals leave on night/reduced motion and off-field touches do not affect them',()=>{
  const world=create(()=>0);arrive(world);
  assert.equal(world.touch(600,100,1100,650,()=>330),null);
  world.update(.05,1100,650,()=>330,2);assert.equal(hit(world),null);
  arrive(world);world.update(.05,1100,650,()=>330,0,true);assert.equal(hit(world),null);
});
