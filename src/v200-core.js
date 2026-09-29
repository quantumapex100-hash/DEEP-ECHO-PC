(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DeepEchoCore=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
function compareVersions(a,b){const parse=v=>{if(!/^\d+\.\d+\.\d+$/.test(String(v)))throw Error('Expected stable major.minor.patch version');return v.split('.').map(Number)};const x=parse(a),y=parse(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0;}
function validateManifest(m){if(!m||typeof m!=='object')throw Error('Invalid update manifest');compareVersions(m.version,'0.0.0');const u=new URL(m.url);if(u.protocol!=='https:'||u.username||u.password||!u.pathname.toLowerCase().endsWith('.exe'))throw Error('Installer must be an HTTPS .exe URL');if(!/^[a-f0-9]{64}$/i.test(m.sha256||''))throw Error('Installer SHA-256 missing');return {version:m.version,url:u.href,sha256:m.sha256.toLowerCase(),notes:String(m.notes||'').slice(0,4000)};}
function normalizedGain(samples,previous=1){let sum=0,peak=0;for(const value of samples){const v=(value-128)/128;sum+=v*v;peak=Math.max(peak,Math.abs(v))}const rms=Math.sqrt(sum/Math.max(1,samples.length));if(rms<.015)return previous;const desired=clamp(.16/rms,.35,1);return clamp(previous+(desired-previous)*(desired<previous?.16:.025),.35,1);}
function safeSession(s){if(!s||typeof s!=='object'||!s.song?.id)return null;return {song:{...s.song,streamUrl:undefined},position:clamp(s.position,0,86400),volume:clamp(s.volume,0,100),savedAt:Number(s.savedAt)||0,clean:!!s.clean};}
function downloadFormat(quality){return quality==='small'?'bestaudio[abr<=96]/worstaudio':quality==='balanced'?'bestaudio[abr<=160]/bestaudio':'bestaudio';}
return {clamp,compareVersions,validateManifest,normalizedGain,safeSession,downloadFormat};
});
