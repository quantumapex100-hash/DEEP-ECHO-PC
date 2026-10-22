const {app}=require('electron'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.startup-diagnostic');
fs.mkdirSync(dir,{recursive:true});
const log=(stage,data)=>fs.appendFileSync(path.join(dir,'startup.log'),JSON.stringify({stage,data,time:new Date().toISOString()})+'\n');
for(const name of ['appData','userData','music','temp']){const target=path.join(dir,name);fs.mkdirSync(target,{recursive:true});app.setPath(name,target);}
app.setAppPath(root);
process.on('uncaughtException',e=>log('exception',e.stack));
process.on('unhandledRejection',e=>log('rejection',e?.stack||String(e)));
app.on('browser-window-created',(_event,win)=>{
  const web=win.webContents;
  log('window-created',win.id);
  win.on('ready-to-show',()=>log('ready-to-show',win.id));
  web.on('console-message',(_event,level,message,line,file)=>log('console',{level,message,line,file}));
  web.on('did-fail-load',(_event,code,description,url)=>log('load-failed',{code,description,url}));
  web.on('render-process-gone',(_event,details)=>log('renderer-gone',details));
  web.on('did-finish-load',async()=>{
    log('loaded',web.getURL());
    try{
      log('dom',await web.executeJavaScript(`({title:document.title,body:document.body.innerText.slice(0,300),api:!!window.echoAPI,width:innerWidth,height:innerHeight,scripts:document.scripts.length})`));
      await web.capturePage().then(image=>fs.writeFileSync(path.join(dir,'window-'+win.id+'.png'),image.toPNG()));
    }catch(e){log('inspection-error',e.message);}
  });
});
log('starting',{electron:process.versions.electron});
require(path.join(root,'main.js'));
setTimeout(()=>{log('timeout');app.quit();},60000);
