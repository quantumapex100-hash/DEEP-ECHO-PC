const {app,net}=require('electron'),path=require('path'),fs=require('fs');
const profile=path.resolve(__dirname,'../.startup-diagnostic/transport-profile');fs.mkdirSync(profile,{recursive:true});app.setPath('userData',profile);
app.whenReady().then(async()=>{global.fetch=net.fetch.bind(net);try{await require('./probe-playback-formats.cjs')}finally{app.quit()}});
setTimeout(()=>app.quit(),90000);
