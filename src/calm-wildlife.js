/* Self-contained scene decoration: no audio, lyrics, storage or network access. */
(() => {
  'use strict';
  function createCalmWildlife(random=Math.random){
    const species=['horse','deer','panda','elephant','zebra'];
    let animals=[],clock=10,index=0;
    function reset(){animals=[];clock=10;}
    function update(dt,width,height,hill,phase,reduced=false){
      if(reduced || phase>.65){animals=[];clock=10;return;}
      clock-=dt;
      if(clock<=0 && animals.length<2){
        const direction=random()<.5?1:-1;
        animals.push({kind:species[index++%species.length],x:direction>0?-.09:1.09,depth:.08+random()*.22,direction,pace:0,speed:0,touches:0,angry:0,flee:false});
        clock=22+random()*18;
      }
      for(const animal of animals){
        animal.angry=Math.max(0,animal.angry-dt);
        const wanted=animal.flee?.16:animal.angry>0?0:.022;
        animal.speed+=(wanted-animal.speed)*(1-Math.exp(-dt*(animal.flee?5:2)));
        animal.x+=animal.direction*animal.speed*dt;
        animal.pace+=dt*(animal.flee?12:3.2);
      }
      animals=animals.filter(a=>a.x>-.16&&a.x<1.16);
    }
    function placement(a,width,height,hill){
      const x=a.x*width,ground=hill(x),y=ground+a.depth*(height-ground);
      const scale=Math.max(.35,Math.min(width/1100,height/650))*(.65+a.depth*1.4)*(a.kind==='elephant'?1.18:1);
      return {x,y,scale};
    }
    function touch(x,y,width,height,hill){
      for(let i=animals.length-1;i>=0;i--){
        const a=animals[i],p=placement(a,width,height,hill);
        if(Math.abs(x-p.x)>62*p.scale || y<p.y-90*p.scale || y>p.y+8*p.scale)continue;
        a.touches++;
        if(a.kind==='elephant'&&a.touches<3&&!a.flee){a.angry=2.5;return 'angry';}
        a.flee=true;a.direction=x<p.x?1:-1;return 'flee';
      }
      return null;
    }
    function draw(ctx,width,height,hill,phase){
      if(phase>.65)return;
      const oval=(x,y,rx,ry,fill,angle=0)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);ctx.fill();};
      const line=(points,color,size)=>{ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...points[0]);for(const point of points.slice(1))ctx.lineTo(...point);ctx.stroke();};
      for(const a of [...animals].sort((x,y)=>x.depth-y.depth)){
        const p=placement(a,width,height,hill),elephant=a.kind==='elephant',panda=a.kind==='panda',deer=a.kind==='deer',zebra=a.kind==='zebra';
        const coat=elephant?'#788184':panda?'#e0dfd2':deer?'#a37c50':zebra?'#d9d8c8':'#805438';
        const dark=elephant?'#505b60':panda||zebra?'#24282a':deer?'#694d32':'#493326';
        ctx.save();ctx.globalAlpha=Math.min(1,(.65-phase)*5);ctx.translate(p.x,p.y);ctx.scale(p.scale*a.direction,p.scale);
        oval(0,2,49,5,'rgba(19,37,21,.27)');
        const bob=Math.sin(a.pace*2)*(a.flee?3:1);
        ctx.translate(0,bob);
        // Jointed legs have a separate stance and swing phase, including bent knees.
        for(let leg=0;leg<4;leg++){
          const root=leg<2?-23:22,walk=Math.sin(a.pace+leg*Math.PI*.7),stride=a.flee?17:6;
          const knee=root+walk*stride*.55,foot=root+walk*stride;
          line([[root,-36],[knee,-18],[foot,-bob-Math.max(0,walk)*(a.flee?8:3)]],leg%2?coat:dark,elephant?11:panda?9:4.5);
          oval(foot,-bob,elephant?7:4,2.5,dark);
        }
        const shading=ctx.createLinearGradient(-20,-62,12,-25);shading.addColorStop(0,coat);shading.addColorStop(.6,coat);shading.addColorStop(1,dark);
        oval(0,elephant?-48:-43,elephant?40:panda?31:35,elephant?26:panda?22:17,shading);
        if(zebra){
          ctx.save();ctx.beginPath();ctx.ellipse(0,-43,35,17,0,0,Math.PI*2);ctx.clip();
          for(let k=-30;k<=30;k+=9)line([[k-4,-64],[k+3,-48],[k-1,-24]],dark,3.5);ctx.restore();
        }
        if(panda){oval(-22,-43,11,21,dark,.2);oval(24,-44,11,19,dark,-.3);}
        line([[-31,-44],[-45,-36+Math.sin(a.pace)*4],[-49,-29+Math.sin(a.pace)*5]],dark,elephant?3:2);
        if(!elephant&&!panda){
          oval(29,-58,8,deer?20:22,coat,.4);
          oval(40,-75,12,7,coat,.25);oval(50,-72,6,5,dark);
          oval(33,-85,3,7,coat,-.4);oval(41,-86,3,7,coat,.3);
          line([[25,-50],[27,-64],[31,-77]],dark,zebra?4:3);
          if(deer){
            for(const off of [0,6]){line([[35+off,-82],[31+off,-97],[34+off,-106]],'#5c4b35',1.5);line([[31+off,-97],[24+off,-100],[22+off,-105]],'#5c4b35',1.2);}
            for(let dot=0;dot<7;dot++)oval(-20+dot*7,-47+(dot%2)*5,1.3,.8,'#ddd2a7');
          }
        }else if(panda){
          oval(33,-60,17,16,coat);oval(23,-74,6,6,dark);oval(42,-73,6,6,dark);
          oval(36,-63,5,6,dark,.35);oval(47,-57,4,3,dark);oval(37,-64,1,1,'#f7f4dc');
        }else{
          oval(34,-62,20,23,shading);
          // Flared ears, raised trunk and stamping show annoyance before the third touch.
          const angry=a.angry>0;
          oval(23,-60,angry?20:14,22,'#657276',angry?Math.sin(a.pace*3)*.15:0);
          oval(24,-62,9,16,'rgba(169,173,166,.2)');
          line([[47,-60],[54,-42],[56,-22],[angry?68:61,angry?-38:-20]],coat,9);
          line([[48,-51],[57,-45],[62,-47]],'#e0d8b7',2.5);
          if(angry){line([[37,-70],[43,-68]],'#263c41',2);for(let dust=0;dust<4;dust++)oval(-25+dust*13,3,3+Math.sin(a.pace+dust)*1.5,1.5,'rgba(173,157,119,.35)');}
        }
        oval(elephant?41:panda?37:43,elephant?-65:panda?-64:-77,1.2,1.2,'#152323');
        // Small foreground stems blend feet into the meadow rather than floating above it.
        for(let tuft=0;tuft<12;tuft++){const x=-40+tuft*7;line([[x,4],[x+Math.sin(tuft)*3,-2-tuft%4*1.5]],'#466239',.8);}
        ctx.restore();
      }
    }
    return {update,draw,touch,reset};
  }
  if(typeof window!=='undefined')window.createCalmWildlife=createCalmWildlife;
  if(typeof module!=='undefined')module.exports=createCalmWildlife;
})();
