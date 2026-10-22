const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../src/renderer.js'),'utf8');
const helper=source.slice(source.indexOf('  let particleGlowSprite ='),source.indexOf('  repopulate();\n  let lastTheme'));
app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,webPreferences:{contextIsolation:true}});try{
 await win.loadURL('data:text/html,<html><body>Particle glow pixel check</body></html>');
 const result=await win.webContents.executeJavaScript('(()=>{'+helper+`
 const cases=[];for(const rgb of [[232,181,89],[153,100,255],[83,255,128],[196,160,98],[139,154,174]])for(const spread of [3.2,5,9])for(const alpha of [.08,.25,.7]){
 const canvases=[document.createElement('canvas'),document.createElement('canvas')];for(const c of canvases)c.width=c.height=96;
 const a=canvases[0].getContext('2d'),b=canvases[1].getContext('2d'),x=40.3,y=40.7,g=a.createRadialGradient(x,y,0,x,y,spread);g.addColorStop(0,'rgba('+rgb.join(',')+','+alpha+')');g.addColorStop(1,'rgba('+rgb.join(',')+',0)');a.fillStyle=g;a.beginPath();a.arc(x,y,spread,0,Math.PI*2);a.fill();
 b.globalAlpha=alpha;b.drawImage(cachedParticleGlow({glow:rgb}),x-spread,y-spread,spread*2,spread*2);
 const old=a.getImageData(0,0,96,96).data,now=b.getImageData(0,0,96,96).data;let oldEnergy=0,newEnergy=0,delta=0;
 for(let i=0;i<old.length;i+=4)for(let j=0;j<3;j++){const v=old[i+j]*old[i+3]/255,w=now[i+j]*now[i+3]/255;oldEnergy+=v;newEnergy+=w;delta+=Math.abs(v-w)}
 cases.push({rgb,spread,alpha,brightnessRatio:newEnergy/oldEnergy,pixelError:delta/oldEnergy});}
 return {cases:cases.length,minBrightnessRatio:Math.min(...cases.map(c=>c.brightnessRatio)),maxBrightnessRatio:Math.max(...cases.map(c=>c.brightnessRatio)),maxPixelError:Math.max(...cases.map(c=>c.pixelError))};})()`);
 fs.writeFileSync(path.join(__dirname,'../.startup-diagnostic/particle-glow-visual-check.json'),JSON.stringify(result,null,2));console.log(result);
 }catch(e){console.log({error:e.message});process.exitCode=1}finally{app.quit()}});
