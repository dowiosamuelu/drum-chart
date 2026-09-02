// 節奏庫的 headless 測試：不需要瀏覽器，`node test.js`
// 行為測試一律用下面的 FIX 固定樣本，不依賴 library.json 的實際內容
// （內容會被作者換掉，測試不該跟著垮）；真正的 library.json 只做結構檢查。
const fs=require('fs'), path=require('path');
const ROOT=__dirname;
const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const body=src.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
new Function(body); // 語法檢查

const REAL=JSON.parse(fs.readFileSync(path.join(ROOT,'library.json'),'utf8'));

// ---------- 固定樣本 ----------
const LK=['cr','ri','oh','hh','tm','sn','kk'];
const z=()=>Array(16).fill(0);
const P=s=>{const a=z();for(let i=0;i<16;i++)a[i]=(+s[i])||0;return a;};
const pat=(tempo,o)=>{const p={tempo};LK.forEach(k=>p[k]=o[k]?P(o[k]):z());return p;};
const card=(id,name,tags,tempo,lanes,opt={})=>({id,name,kind:opt.kind||'groove',tags,parent:opt.parent||null,
  note:opt.note||'',author:'',pattern:pat(tempo,lanes)});
const FIX={ type:'drumchart-library', version:1, updatedAt:'2026-01-01', note:'測試樣本', patterns:[
  card('g8','基本 8 beat',['中板','主歌','8 beat'],92,
    {hh:'1010101010101010',sn:'0000100000001000',kk:'1000000010000000'},{note:'最素的底'}),
  card('g8g','8 beat ＋ ghost',['中板','主歌','8 beat'],92,
    {hh:'1010101010101010',sn:'0020100200201002',kk:'1000000010000000'},{parent:'g8'}),
  card('ght','Half-time 基本',['慢歌','主歌','half-time'],88,
    {hh:'1010101010101010',sn:'0000000010000000',kk:'1000000000000000'}),
  card('gcr','副歌 跑 ride',['快歌','副歌','跑 ride'],100,
    {ri:'1010101010101010',sn:'0000100000001000',kk:'1000001010000000'}),
  card('gcrcrash','副歌 ＋ 進場 crash',['快歌','副歌','跑 ride'],100,
    {cr:'1000000000000000',ri:'0010101010101010',sn:'0000100000001000',kk:'1000001010000000'},{parent:'gcr'}),
  card('gbalr','抒情 跑 ride',['慢歌','副歌','跑 ride'],68,
    {ri:'1010101010101010',sn:'0000100000001000',kk:'1000000010000000'}),
  card('gbalrim','抒情 rimclick',['慢歌','主歌','rimclick'],68,
    {hh:'1010101010101010',sn:'0000300000003000',kk:'1000000010000000'}),
  card('gspace','留白',['慢歌','橋段','留白'],68,{hh:'1000000010000000',kk:'1000000000000000'}),
  card('f1','一拍 tom 下行',['中板','主歌'],92,{tm:'0000000000001123'},{kind:'fill'}),
  card('f3','整小節 tom 下行',['中板','副歌'],92,
    {sn:'1100000000000000',tm:'0011112222333333',kk:'1000000000000000'},{kind:'fill'}),
]};

// ---------- 假的瀏覽器 ----------
let store={};
function El(){ return new Proxy(function(){}, { get(t,k){
  if(k==='querySelectorAll') return ()=>[];
  if(k==='querySelector') return ()=>El();
  if(k==='classList') return {add(){},remove(){},toggle(){}};
  if(k==='dataset') return {}; if(k==='style') return {};
  if(k==='value'||k==='textContent'||k==='innerHTML') return '';
  if(k==='appendChild'||k==='addEventListener'||k==='showModal'||k==='close'||k==='click') return ()=>{};
  if(k===Symbol.toPrimitive) return ()=>'';
  return El();
}, set(){return true;}, apply(){return El();} }); }
global.document={ createElement:()=>El(), getElementById:()=>El(), querySelectorAll:()=>[], querySelector:()=>null, head:{appendChild(){}} };
global.localStorage={ getItem:k=>store[k]??null, setItem:(k,v)=>store[k]=v };
global.window={}; global.location={hash:'',origin:'http://x',pathname:'/'}; global.history={replaceState(){}};
global.navigator={}; global.alert=()=>{}; global.confirm=()=>true; global.prompt=()=>'';
global.audioLog=[];
global.AudioContext=function(){ return { currentTime:0, state:'running',
  createBufferSource:()=>({ connect(){}, start(t){ audioLog.push(['start',t]); }, stop(t){ audioLog.push(['stop',t]); } }),
  createGain:()=>({ gain:{ value:0,
      setValueAtTime:(v,t)=>audioLog.push(['set',v,t]),
      linearRampToValueAtTime:(v,t)=>audioLog.push(['ramp',v,t]) },
    connect(){} }),
  decodeAudioData:()=>Promise.resolve({}) }; };
global.window.AudioContext=global.AudioContext;
global.window.scrollTo=()=>{};
global.setInterval=()=>1; global.clearInterval=()=>{};
let served=FIX, libFails=false;
global.fetch=(u)=>{ if(String(u).includes('library.json')){
    if(libFails) return Promise.reject(new Error('offline'));
    return Promise.resolve({ ok:true, json:()=>Promise.resolve(served) }); }
  return Promise.reject(new Error('no samples in test')); };

const EXPORTS='{data,filt,play,cardById,childrenOf,matches,encCard,decCard,songPayload,importSong,mergeCards,'+
  'renderGallery,renderBrowse,renderWall,renderSections,renderPicker,miniGridHtml,cardHtml,LANES,LANE_KEYS,'+
  'MAX_PER_SECTION,defaultAxis,filtering,TAG_GROUPS,ALL_TAGS,fromV3,migrate,normCard,defaultData,syncLibrary,'+
  'mergeLibrary,receiveCard,takePastedLink,readOnly,publishSet,cardPayload,picking,mergedBar,phrase,isFav,'+
  'toggleFav,cellGlyph,cycle,SAMPLE_FILES,emptyPattern,trans,playSeq,stopTransport,loopFillCard,fillCtrlHtml,'+
  'displayName,describeDiff,changedLanes,isAutoName,showFamily,childrenOf,fireStep,chokeOpenHats,openHats,buffers,CHOKE,'+
  'METERS,METER_KEYS,meterOf,meterKey,reMeter,stepDur,sameMeter,gridHtml,normPattern,mkPat,moveCard,blocks,publishSet}';
function boot(){ store={}; return new Function('return (function(){ '+body+'\n; return '+EXPORTS+'; })()')(); }
const A=(c,m)=>{ if(!c) throw new Error('FAIL: '+m); console.log('ok -',m); };
const box=()=>({ innerHTML:'', querySelectorAll(){ return []; } });

(async()=>{
// ================= 真正的 library.json：只檢查結構 =================
A(REAL.type==='drumchart-library'&&typeof REAL.version==='number','library.json 有 type 與 version');
A(Array.isArray(REAL.patterns),'library.json 有 patterns 陣列（目前 '+REAL.patterns.length+' 張）');
const STEPS={'4/4':16,'3/4':12,'6/8':12,'shuffle':12};
A(REAL.patterns.every(c=>c.id&&LK.every(k=>Array.isArray(c.pattern[k])&&c.pattern[k].length===(STEPS[c.pattern.meter]||16))),
  '每張卡都有 id、名稱與七軌，格數符合它的拍號');
A(new Set(REAL.patterns.map(c=>c.id)).size===REAL.patterns.length,'沒有重複的 id');
A(REAL.patterns.every(c=>!c.parent||REAL.patterns.some(x=>x.id===c.parent)),'每個變體的父卡都在庫裡');
A(REAL.patterns.every(c=>!c.parent||!REAL.patterns.find(x=>x.id===c.parent).parent),'家族只有一層');
A(REAL.patterns.every(c=>c.tags.every(t=>true)&&c.pattern.tempo>=40&&c.pattern.tempo<=240),'速度都在合理範圍');
A(!/function seedCards/.test(src),'index.html 裡不內嵌官方庫內容');

// ================= 首次載入 =================
let M=boot();
A(M.data.patterns.length===0,'同步前本地是空的（內容不在程式裡）');
A(M.data.songs[0].sections.length>0,'預設有一首範例歌');
await M.syncLibrary();
A(M.data.patterns.length===FIX.patterns.length,'同步後載入 '+M.data.patterns.length+' 張');
A(M.data.patterns.every(c=>c.official),'載入的卡都標成官方');
A(M.data.libVersion===FIX.version,'記下官方庫版本 v'+M.data.libVersion);

// ================= 官方卡唯讀 =================
A(M.readOnly(M.cardById('g8')),'官方卡唯讀');
M.data.admin=true; A(!M.readOnly(M.cardById('g8')),'管理模式下官方卡可編輯'); M.data.admin=false;

// ================= 合併 =================
let before=M.data.patterns.length, r=M.mergeLibrary(FIX);
A(M.data.patterns.length===before&&r.added===0&&r.updated===FIX.patterns.length,'同一版重複合併不會長出東西');
const mine={ id:'mine1', name:'我的私房打法', kind:'groove', tags:['慢歌'], parent:null, note:'', author:'我',
  official:false, archived:false, publish:false, pattern:M.cardById('g8').pattern };
M.data.patterns.push(mine); M.mergeLibrary(FIX);
A(M.cardById('mine1')&&!M.cardById('mine1').official,'個人卡在合併後原封不動');

const v2=JSON.parse(JSON.stringify(FIX)); v2.version=FIX.version+1;
v2.patterns=v2.patterns.filter(c=>c.id!=='gspace');
v2.patterns.push({ id:'gnew', name:'新的官方卡', kind:'groove', tags:['快歌','副歌','8 beat'], parent:null,
  note:'', author:'', pattern:M.cardById('g8').pattern });
r=M.mergeLibrary(v2);
A(r.added===1&&r.archived===1,'新版合併：新增 1 張、封存 1 張');
A(M.cardById('gspace')&&M.cardById('gspace').archived,'被移除的官方卡是封存不是刪除');
const sec=M.data.songs[0].sections.find(x=>x.grooveRef==='gspace');
A(sec===undefined||M.cardById(sec.grooveRef),'引用封存卡的段落仍然指得到它');

// ================= 封存的卡不出現在瀏覽 =================
M.filt.kind='groove'; M.filt.q=''; M.filt.tags=[]; M.filt.fav=false; M.filt.arch=false;
let b=box(); M.renderBrowse(b);
A(!b.innerHTML.includes('data-card="gspace"'),'封存的卡不出現在分類瀏覽');
M.filt.tags=['慢歌']; b=box(); M.renderWall(b);
A(!b.innerHTML.includes('data-card="gspace"'),'封存的卡不出現在篩選結果牆');
M.filt.tags=[]; M.filt.arch=true; b=box(); M.renderBrowse(b);
A(b.innerHTML.includes('data-card="gspace"')&&b.innerHTML.includes('已封存'),'勾「顯示已封存」才看得到，且有標記');
M.filt.arch=false;

// ================= 分區瀏覽 =================
b=box(); const total=M.renderBrowse(b);
A(total===M.data.patterns.filter(c=>c.kind==='groove'&&!c.archived).length,'分區瀏覽涵蓋所有未封存的節奏卡（'+total+' 張）');
const heads=[...b.innerHTML.matchAll(/<h3>([^<]+)<\/h3>/g)].map(m=>m[1]);
A(heads.length&&heads.every(h=>M.TAG_GROUPS.find(g=>g.key==='feel').tags.includes(h)||h==='未分類'),
  '依「打法特徵」分區：'+heads.join('、'));
const sects=b.innerHTML.split('<section class="sect">').slice(1);
A(sects.every(x=>(x.match(/class="dcard/g)||[]).length<=M.MAX_PER_SECTION),'每區最多 '+M.MAX_PER_SECTION+' 張代表卡');
A(sects.every(x=>!/class="dcard variant"/.test(x)),'代表卡都是基礎卡');
A(b.innerHTML.includes('個變體'),'基礎卡標出底下有幾個變體');
A(M.defaultAxis('fill')==='speed'&&M.defaultAxis('groove')==='feel','過門用速度感分區，節奏用打法特徵');

// ================= 篩選：組內 OR、組間 AND =================
M.filt.tags=['慢歌','副歌'];
const r1=M.data.patterns.filter(M.matches);
A(r1.length>0&&r1.every(c=>c.tags.includes('慢歌')&&c.tags.includes('副歌')),'組間 AND：'+r1.map(c=>c.name).join('、'));
M.filt.tags=['快歌','慢歌'];
const r2=M.data.patterns.filter(M.matches);
A(r2.every(c=>c.tags.includes('快歌')||c.tags.includes('慢歌'))&&r2.length>r1.length,'組內 OR：'+r2.length+' 張');
M.filt.tags=[];
M.filt.kind='fill';
A(M.data.patterns.filter(M.matches).length===FIX.patterns.filter(c=>c.kind==='fill').length,'過門篩選正確');
M.filt.kind='groove';

// ================= 發佈迴圈 =================
const M3=boot(); await M3.syncLibrary(); M3.data.admin=true;
M3.data.patterns.push({ id:'own1', name:'我寫的節奏', kind:'groove', tags:['中板','主歌','8 beat'], parent:null,
  note:'', author:'我', official:false, archived:false, publish:true, pattern:M3.cardById('g8').pattern });
A(M3.publishSet().some(c=>c.id==='own1'),'標記待發佈的卡會進下一版');
M3.cardById('ght').archived=true;
A(!M3.publishSet().some(c=>c.id==='ght'),'從官方庫移除的卡不會再被發佈出去');
A(M3.cardById('ght'),'但它還在本機，取消封存救得回來');
A(Object.keys(M3.cardPayload(M3.cardById('g8'))).join()==='id,name,kind,tags,parent,note,author,pattern',
  '匯出的卡不帶 official／archived／publish 這些本機旗標');
M3.mergeLibrary({ type:'drumchart-library', version:M3.data.libVersion+1, patterns:M3.publishSet().map(M3.cardPayload) });
A(M3.cardById('own1').official&&!M3.cardById('own1').publish,'發佈過的自製卡，下次同步就轉正成官方卡');
A(M3.cardById('ght').archived,'踢掉的那張同步後不會復活');
M3.data.admin=false; A(M3.readOnly(M3.cardById('own1')),'轉正後一般使用者看到的是唯讀官方卡');

// ================= 收到的卡 =================
M.data.inbox=[];
const shared=M.encCard(M.cardById('g8'));
A(M.takePastedLink('https://x.github.io/drum-chart/#c='+shared),'貼上分享連結解析成功');
A(M.data.inbox.length===1&&M.data.patterns.every(c=>c.id!==M.data.inbox[0].card.id),'先進暫存區，不會直接混進庫裡');
A(!M.takePastedLink('https://example.com/沒有卡'),'不是分享連結時擋下來');
M.receiveCard(M.decCard(shared),'阿明'); A(M.data.inbox[1].from==='阿明','記得是誰傳來的');
const dec=M.decCard(shared);
A(JSON.stringify(dec.pattern)===JSON.stringify(M.cardById('g8').pattern),'分享連結 round-trip 一致');
A(M.encCard(M.cardById('g8')).length<1500,'分享連結 '+M.encCard(M.cardById('g8')).length+' 字元，塞得進網址');

// ================= 歌曲匯出 =================
const song=M.data.songs[0]; song.sections[0].grooveRef='g8g'; song.sections[0].fillRef='f1';
const pl=M.songPayload(song);
A(pl.patterns.some(p=>p.id==='g8g')&&pl.patterns.some(p=>p.id==='g8'),'匯出歌曲會夾帶用到的卡與它的父卡');

// ================= 離線 =================
libFails=true; const M2=boot(); await M2.syncLibrary();
A(M2.data.patterns.length===0,'第一次開啟又連不上：不會炸'); libFails=false;

// ================= v3 遷移 =================
const v3={currentId:'s1',songs:[{id:'s1',name:'舊歌',sections:[
 {id:'a',label:'Verse',note:'x',groove:{tempo:90,hh:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],sn:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],kk:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]},fill:null},
 {id:'b',label:'副歌',note:'',groove:{tempo:96,ri:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},fill:{tempo:96,tm:[0,0,0,0,0,0,0,0,0,0,1,1,2,2,3,3]}}]}]};
const mg=M.fromV3(v3);
A(mg.patterns.length===3,'v3 遷移：從舊段落抽出 3 張卡');
A(mg.patterns.every(c=>!c.official),'從 v3 抽出來的都是個人卡');
A(mg.songs[0].sections[1].grooveRef&&mg.songs[0].sections[1].fillRef,'舊段落改成引用卡片');

// ================= 七軌與新音色 =================
A(M.LANE_KEYS.join()==='cr,ri,oh,hh,tm,sn,kk','七軌，crash 排最上面');
// 標籤表
const feel=M.TAG_GROUPS.find(g=>g.key==='feel').tags;
A(feel.includes('four on the floor'),'打法特徵有 four on the floor（大鼓四分）');
A(!feel.includes('一拍一下'),'含糊的「一拍一下」拿掉了（沒講是哪個肢體）');
A(feel.includes('rimclick')&&feel.includes('留白'),'rimclick 與留白進了打法特徵');
A(!feel.some(t=>/shuffle|6-8|切分|ghost/.test(t)),'shuffle／大鼓切分／ghost 都不當瀏覽分區');
A(new Set(M.ALL_TAGS).size===M.ALL_TAGS.length,'三組標籤之間沒有重複的名字');
A(M.normCard({id:'t',name:'x',tags:['一拍一下','慢歌'],pattern:{}}).tags.join()==='留白,慢歌',
  '舊的「一拍一下」會自動改名成「留白」，不是靜默丟掉');
A(M.normCard({id:'t',name:'x',tags:['留白','一拍一下'],pattern:{}}).tags.join()==='留白',
  '改名撞到既有標籤時不會出現重複');
A(M.normCard({id:'t',name:'x',tags:['亂寫的標籤'],pattern:{}}).tags.length===0,'不認得的標籤還是會被擋掉');
A(M.SAMPLE_FILES.crash==='crash.mp3'&&M.SAMPLE_FILES.rimclick==='rimclick.mp3','新取樣有掛進來');
A(fs.existsSync(path.join(ROOT,'samples/crash.mp3'))&&fs.existsSync(path.join(ROOT,'samples/rimclick.mp3')),'兩個 mp3 真的在 samples/');
A(M.cycle('sn',0)===1&&M.cycle('sn',2)===3&&M.cycle('sn',3)===0,'小鼓連點：重音→ghost→rimclick→空白');
A(M.cellGlyph('sn',3)==='◇'&&M.cellGlyph('cr',1)==='⊗','rimclick 與 crash 有自己的符號');
A(M.emptyPattern().cr.length===16,'空白 pattern 有 cr 軌');

// ================= 譜的畫法 =================
const g8=M.cardById('g8');
A((M.miniGridHtml(g8.pattern).match(/class="ml"/g)||[]).length===3,'小譜只畫有打的軌');
A((M.miniGridHtml(g8.pattern).match(/class="mn beat"/g)||[]).length===4,'拍線四條，從拍號列貫穿下來');
A(M.miniGridHtml(M.emptyPattern()).includes('還沒點譜'),'空白卡顯示提示而不是空格子');
const h=M.cardHtml(M.cardById('g8g'));
A(!h.includes('data-play=')&&h.includes('data-ab="g8g"')&&h.includes('data-edit="g8g"'),'卡上沒試聽鈕，變體有對照鈕');
A(h.includes('class="dmeta"')&&h.includes('中板 · 主歌 · 8 beat'),'標籤收成一行文字');
A(h.includes('class="dcard variant"'),'變體卡有自己的樣式');
A(M.cardHtml({id:'x',name:'<img src=x>',tags:[],note:'',parent:null,pattern:g8.pattern}).includes('&lt;img'),'卡名有跳脫 HTML');
A(h.indexOf('class="dbtns"')<h.indexOf('class="fav'),'愛心固定在最右邊');
A(h.includes('>♡</button>'),'沒收藏是空心');

// ================= 過門疊在樂句尾 =================
const f1=M.cardById('f1'), mb=M.mergedBar(g8.pattern,f1.pattern);
A(mb.hh[0]===g8.pattern.hh[0],'過門空著的格子繼續走節奏');
A(mb.tm[15]===f1.pattern.tm[15],'過門有東西的格子換成過門');
A(mb.hh[12]===0&&f1.pattern.tm[12]!==0,'過門有東西的那一格，節奏整排讓位');
A(M.phrase(g8.pattern,null).length===1,'沒選過門就是單純 loop 節奏');
const ph=M.phrase(g8.pattern,f1.pattern);
A(ph.length===2&&ph[0].p===g8.pattern&&ph[1].p!==f1.pattern,'第一小節純節奏，第二小節節奏＋過門');

// ================= 播放器認 id =================
M.stopTransport();
M.playSeq([{p:g8.pattern,bars:1}],null,90,'card:g8');
A(M.trans.key==='card:g8','播放中記住的是 id');
M.playSeq([{p:g8.pattern,bars:1}],null,90,'card:g8');
A(!M.trans.key,'同一張再點一次＝停止');
M.playSeq([{p:g8.pattern,bars:1}],null,90,'card:g8');
M.playSeq([{p:M.cardById('gcr').pattern,bars:1}],null,90,'card:gcr');
A(M.trans.key==='card:gcr','點另一張就換過去'); M.stopTransport();
A(!/function showView\(v\)\s*\{\s*stopTransport/.test(src),'切分頁不中斷播放');
A(src.includes('data-sec="${sec.id}"'),'段落有 data-sec，重繪後標得回播放中');

// ================= 配過門與收藏 =================
A(M.loopFillCard()===null&&M.fillCtrlHtml().includes('不加'),'預設不配過門');
M.play.fill='f1';
A(M.loopFillCard().id==='f1'&&M.fillCtrlHtml().includes('一拍 tom 下行'),'配過門是全域設定，標題列顯示是哪一張');
M.filt.kind='fill'; A(M.fillCtrlHtml()==='','看過門時不顯示「配過門」'); M.filt.kind='groove'; M.play.fill=null;
A(!src.includes('id="cFill"')&&src.includes('openFillPicker'),'配過門改用挑卡彈窗，不是編輯裡的下拉');
M.data.favs=[]; M.toggleFav('g8');
A(M.isFav('g8')&&M.cardHtml(g8).includes('>♥</button>'),'收藏了是實心');
M.filt.fav=true; A(M.filtering(),'只看收藏也算篩選');
b=box(); M.renderWall(b);
A(b.innerHTML.includes('data-card="g8"')&&!b.innerHTML.includes('data-card="ght"'),'只看收藏濾掉沒收藏的');
M.mergeLibrary(FIX); A(M.isFav('g8'),'收藏在合併官方庫之後還在'); M.filt.fav=false; M.toggleFav('g8');

// ================= 樣式沒有回歸 =================
A(/--bg:#f7f7f5/.test(src)&&!/#fdf6ec|#ece3cf/.test(src),'Linear／Notion 色票，舊色碼沒回流');
A(/\.mini \{[^}]*overflow-y:hidden/.test(src),'小譜的捲軸關著');
A(/\.varlist \{[^}]*border-left/.test(src),'家族的共用左側軌還在');
A(/\.dcard:hover \.dbtns/.test(src),'卡片上的操作按鈕 hover 才出現');
// 這裡曾經出過一個 bug：彈窗沿用 .dbtns，而 .dbtns 的 opacity:0 沒有限定在卡片裡，
// 於是彈窗底部那三顆（複製／分享／刪除）看不見卻點得到。
A(!/(^|\n)\s*\.dbtns \{[^}]*opacity:0/.test(src),'「平常隱藏」的規則有限定在 .dcard 裡，不會外洩到彈窗');
A(!/(^|\n)\s*\.fav \{[^}]*opacity:0/.test(src),'愛心的隱藏規則同樣有限定範圍');
A(/\.dcard \.dbtns \{ opacity:0/.test(src)&&/\.dcard \.fav \{ opacity:0/.test(src),'兩個隱藏規則都掛在 .dcard 底下');
const dlg=src.match(/<span class="dlgacts">[\s\S]*?<\/span>/);
A(dlg&&/id="cDel"/.test(dlg[0]),'刪除鍵在彈窗自己的按鈕列 .dlgacts 裡，不再借用卡片的 class');


// ================= 名字選填、自動描述 =================
const N=boot(); await N.syncLibrary();
const un=(id,parent,lanes,tags)=>{ const c=N.normCard({id,name:'',kind:'groove',tags:tags||[],parent,
  pattern:JSON.parse(JSON.stringify(N.cardById(parent||'g8').pattern))});
  LK.forEach(k=>{ if(lanes[k]) c.pattern[k]=P(lanes[k]); }); N.data.patterns.push(c); return c; };
// 沒取名的基礎卡 → 用標籤當標題
const nb=N.normCard({id:'nb',name:'',kind:'groove',tags:['慢歌','主歌'],pattern:N.cardById('g8').pattern});
N.data.patterns.push(nb);
A(N.displayName(nb)==='慢歌 · 主歌','沒取名的基礎卡用標籤當標題');
A(N.displayName(N.normCard({id:'nn',name:'',kind:'groove',tags:[],pattern:{}}))==='未命名','沒名字也沒標籤才叫未命名');
A(N.displayName(N.cardById('g8'))==='基本 8 beat','有取名就用名字');
A(!N.cardHtml(nb).includes('class="dmeta"'),'沒取名的基礎卡不會把標籤重覆印兩次');
// 沒取名的變體 → 講跟父卡差在哪
const vg=un('vg','g8',{sn:'0020100200201002'});
A(N.displayName(vg)==='ghost 1& 2a 3& 4a','變體講 ghost 的落點：'+N.displayName(vg));
const vk=un('vk','g8',{kk:'1000100010001000'});
A(N.displayName(vk)==='大鼓 1 2 3 4','變體講大鼓落點：'+N.displayName(vk));
const vh=un('vh','g8',{hh:'1111111111111111'});
A(N.displayName(vh)==='踩鈸 八分→十六分','變體：'+N.displayName(vh));
const vr=un('vr','g8',{hh:'0000000000000000',ri:'1010101010101010'});
A(N.displayName(vr)==='換成 ride','變體：'+N.displayName(vr));
const vm=un('vm','g8',{sn:'0000300000003000'});
A(N.displayName(vm)==='小鼓改 rimclick','變體：'+N.displayName(vm));
const vc=un('vc','g8',{cr:'1000000000000000'});
A(N.displayName(vc)==='1 crash','變體講 crash 落點：'+N.displayName(vc));
const vsame=un('vsame','g8',{});
A(N.displayName(vsame)==='一樣','跟父卡完全相同時老實說「一樣」');
const vmany=un('vmany','g8',{hh:'1111111111111111',sn:'0020300200201002',kk:'1000100010001000',cr:'1000000000000000'});
A(N.displayName(vmany).includes('等'),'差太多時只講前兩項加「等」：'+N.displayName(vmany));
// 同樣顆數、不同落點：這是最常見的變化，只講顆數會三張撞成同一句話
const k1=un('k1','g8',{kk:'1000000010100000'}), k2=un('k2','g8',{kk:'1000001010000000'}), k3=un('k3','g8',{kk:'1000001000100000'});
const ds=[k1,k2,k3].map(x=>N.displayName(x));
A(new Set(ds).size===3,'同樣三顆大鼓、落點不同 → 三個不同的描述：'+ds.join(' ／ '));
A(ds[0]==='大鼓 1 3 3&','講的是打點位置不是顆數');
// 落點太多就退回顆數，不然一行塞不下
const kmany=un('kmany','g8',{kk:'1111111111111111'});
A(N.displayName(kmany)==='大鼓 16 下','落點超過六個就退回講顆數');
// 開鈸造成的踩鈸缺口不要重覆講兩次
const vo=un('vo','g8',{hh:'1010101010101000',oh:'0000000000000010'});
A(N.displayName(vo)==='4& 開鈸','開鈸只講開鈸，不會再嘮叨一句「踩鈸八分→7 下」');
// 取了名就用名字
vg.name='我的 ghost 版';
A(N.displayName(vg)==='我的 ghost 版','取了名就蓋過自動描述');
vg.name='';
// 變體在家族裡只畫差異軌，單獨出現（挑卡、收到的卡）畫完整
const inFam=N.cardHtml(vg), flat=N.cardHtml(vg,{flat:true});
A((inFam.match(/class="ml"/g)||[]).length===1,'家族裡的變體只畫有差異的那 1 軌');
A((flat.match(/class="ml"/g)||[]).length===3,'單獨出現時畫完整的譜');
A((N.cardHtml(vmany).match(/class="ml"/g)||[]).length>3,'差太多軌就退回畫完整的譜');
// 搜尋吃自動描述
N.filt.kind='groove'; N.filt.tags=[]; N.filt.fav=false; N.filt.arch=false; N.filt.q='ghost';
A(N.data.patterns.filter(N.matches).some(c=>c.id==='vg'),'搜尋 ghost 找得到沒取名的 ghost 變體');
N.filt.q='';
// 新卡與變體預設不取名
A(/name:"",\s*kind:filt.kind/.test(src),'＋新增卡片預設不取名');
A(/const n=\{ id:uid\(\), name:"", kind:c.kind/.test(src),'做變體預設不取名');

// ================= 調整順序 =================
const S=boot(); await S.syncLibrary();
const ids=()=>S.data.patterns.map(c=>c.id).join(',');
A(S.blocks().every(b=>b[0].parent===null&&b.slice(1).every(x=>x.parent===b[0].id)),'家族在陣列裡是連在一起的');
A(ids().indexOf('g8g')===ids().indexOf('g8')+3,'變體緊跟在它的基礎卡後面');
// 變體換位置
S.data.patterns.push(S.normCard({id:'g8x',name:'',kind:'groove',tags:['8 beat'],parent:'g8',
  pattern:S.cardById('g8').pattern}));
S.data.patterns=S.blocks().flat();
let order=()=>S.childrenOf('g8').map(c=>c.id).join(',');
A(order()==='g8g,g8x','兩個變體的初始順序');
A(S.moveCard('g8x',-1)&&order()==='g8x,g8g','變體往前');
A(S.moveCard('g8x',1)&&order()==='g8g,g8x','變體往後');
A(!S.moveCard('g8g',-1),'變體不能排到基礎卡前面');
A(!S.moveCard('g8x',1),'已經在最後就不動');
// 基礎卡搬家，變體要跟著走
const baseOrder=()=>S.data.patterns.filter(c=>!c.parent&&c.kind==='groove').map(c=>c.id).join(',');
const b0=baseOrder().split(',');
A(S.moveCard(b0[1],-1),'把第二張基礎卡往前搬');
A(baseOrder().split(',')[0]===b0[1],'它變成第一張');
A(S.blocks().every(b=>b.slice(1).every(x=>x.parent===b[0].id)),'搬完之後家族還是連在一起');
A(ids().indexOf('g8g')>ids().indexOf('g8')&&ids().indexOf('g8x')>ids().indexOf('g8'),'變體跟著父卡一起搬，沒有被留下');
// 節奏和過門各排各的
const fillsBefore=S.data.patterns.filter(c=>c.kind==='fill').map(c=>c.id).join(',');
S.moveCard('g8',1);
A(S.data.patterns.filter(c=>c.kind==='fill').map(c=>c.id).join(',')===fillsBefore,'搬節奏不會動到過門的順序');
A(!S.moveCard('沒這張',1),'搬不存在的卡不會炸');
// 順序會被帶進匯出
S.data.admin=true;
A(S.publishSet().map(c=>c.id).join(',')===S.data.patterns.filter(c=>c.official&&!c.archived).map(c=>c.id).join(','),
  '匯出 library.json 時保留你排好的順序');
// 排序模式下的按鈕
A(/data-mv="-1:\$\{c.id\}"/.test(src)&&/data-mv="1:\$\{c.id\}"/.test(src),'排序模式在卡片上給 ▲▼');
A(/\.dcard\.sorting \.dbtns \{ opacity:1/.test(src),'排序模式的按鈕常駐，才能連續按');
A(/if\(opt\.playOnClick && !sortOn\)/.test(src),'排序模式下點卡片不會播放，避免誤觸');

// ================= 拍號 =================
const T=boot(); await T.syncLibrary();
A(T.METER_KEYS.join()==='4/4,3/4,6/8,shuffle','四種拍號');
A(T.METERS['4/4'].steps===16&&T.METERS['3/4'].steps===12&&T.METERS['6/8'].steps===12&&T.METERS['shuffle'].steps===12,
  '4/4 是 16 格，其餘三種共用 12 格的網格');
A(T.METERS['3/4'].beat===4&&T.METERS['3/4'].count===4,'3/4：三拍，每拍四個十六分');
A(T.METERS['6/8'].beat===6&&T.METERS['6/8'].count===2,'6/8：兩個附點四分為主拍，每兩格數一個八分（1-6）');
A(T.METERS['shuffle'].beat===3&&T.METERS['shuffle'].count===3,'shuffle：四拍，每拍三連音');
// 每格時長：BPM 的那一拍等於幾格
const at=(m,bpm)=>T.stepDur(T.emptyPattern(m),bpm);
A(Math.abs(at('4/4',120)-0.125)<1e-9,'4/4 120BPM：一格 = 十六分 = 0.125s');
A(Math.abs(at('3/4',120)-0.125)<1e-9,'3/4 的一格跟 4/4 一樣是十六分');
A(Math.abs(at('shuffle',120)-0.5/3)<1e-9,'shuffle 一格 = 三連音的一個');
A(Math.abs(at('6/8',60)-1/6)<1e-9,'6/8 60BPM：附點四分一秒，一格 = 1/6 秒');
A(Math.abs(at('6/8',60)*12-2)<1e-9,'6/8 一小節 = 兩個附點四分拍');
// 空 pattern 與正規化
A(T.emptyPattern('6/8').hh.length===12&&T.emptyPattern('6/8').meter==='6/8','emptyPattern 依拍號給格數');
A(T.normPattern({meter:'3/4',hh:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]}).hh.length===12,'正規化會把多的格子截掉');
A(T.normPattern({meter:'亂寫',hh:[1]}).meter==='4/4','不認得的拍號退回 4/4');
A(T.normPattern({hh:[1]}).meter==='4/4','沒寫拍號的舊卡當 4/4');
// 換拍號
const p68=T.mkPat(60,{hh:'101010101010'},'6/8');
const p44=T.reMeter(p68,'4/4');
A(p44.meter==='4/4'&&p44.hh.length===16&&p44.hh.slice(0,12).join()===p68.hh.join()&&p44.hh[15]===0,
  '換成格數多的拍號：原本的留著，後面補空');
const back=T.reMeter(p44,'3/4');
A(back.hh.length===12,'換成格數少的拍號：截掉後面');
// 畫格子
const mini68=T.miniGridHtml(p68);
A((mini68.match(/class="mc/g)||[]).length===12,'6/8 的小譜是 12 格');
A(/repeat\(12,/.test(mini68),'欄數跟著拍號走');
A((mini68.match(/class="mn beat"/g)||[]).length===2,'6/8 只有兩條主拍線');
A((mini68.match(/class="mn sub"/g)||[]).length===4,'另外四個八分位置畫細線');
A(/>6</.test(mini68)&&!/>7</.test(mini68),'6/8 的拍號列數到 6');
const mini34=T.miniGridHtml(T.mkPat(90,{hh:'101010101010'},'3/4'));
A((mini34.match(/class="mn beat"/g)||[]).length===3&&/>3</.test(mini34)&&!/>4</.test(mini34),'3/4 數到 3，三條主拍線');
A((T.gridHtml(p68).match(/class="cell/g)||[]).length===12*7,'編輯用的大格子也是 12 格 × 七軌');
// 疊過門要同拍號
const g44=T.cardById('g8').pattern, f68=T.mkPat(60,{tm:'000000000111'},'6/8');
A(!T.sameMeter(g44,f68),'4/4 的節奏和 6/8 的過門不同拍號');
A(T.phrase(g44,f68).length===1,'拍號不合就不加過門，不會疊出亂七八糟的東西');
A(T.phrase(g44,T.cardById('f1').pattern).length===2,'同拍號才疊得起來');
A(T.mergedBar(p68,T.mkPat(60,{tm:'000000000111'},'6/8')).hh.length===12,'合出來的小節維持 12 格');
// 分享連結帶拍號
const c68=T.normCard({id:'x68',name:'六八測試',kind:'groove',tags:[],pattern:p68});
const dec68=T.decCard(T.encCard(c68));
A(dec68.pattern.meter==='6/8'&&dec68.pattern.hh.join()===p68.hh.join(),'分享連結帶得動拍號');

// ================= 開鈸接閉鈸要掐斷 =================
const H=boot(); await H.syncLibrary();
Object.keys(H.SAMPLE_FILES).forEach(k=>H.buffers[k]={});   // 假裝取樣載好了
const hp=H.emptyPattern(); hp.oh[0]=1; hp.hh[2]=1; hp.sn[4]=1;
audioLog.length=0;
H.fireStep(hp,0,10);                       // 開鈸
A(H.openHats.length===1,'開鈸響著的時候會被記住');
A(!audioLog.some(x=>x[0]==='ramp'),'還沒有人關踏板，不會掐');
H.fireStep(hp,2,10.5);                     // 閉鈸
A(audioLog.some(x=>x[0]==='ramp'&&x[1]===0&&x[2]===10.5+H.CHOKE),'閉鈸把開鈸淡出掐掉（留 '+(H.CHOKE*1000)+'ms 避免 click）');
A(audioLog.some(x=>x[0]==='stop'),'掐完把音源停掉');
A(H.openHats.length===0,'掐完就不再追蹤它');
// 別的鼓件不該掐
H.fireStep(hp,0,20); audioLog.length=0;
H.fireStep(hp,4,20.5);                     // 小鼓
A(!audioLog.some(x=>x[0]==='ramp'),'小鼓／大鼓／tom 不會掐開鈸');
A(H.openHats.length===1,'開鈸繼續響');
// 再一次開鈸也要掐掉前一個，不然會疊
audioLog.length=0; H.fireStep(hp,0,21);
A(audioLog.some(x=>x[0]==='ramp'&&x[1]===0),'連續兩個開鈸：後面的會掐掉前面的，不會疊在一起');
A(H.openHats.length===1,'只留最新的那一個');
H.stopTransport();
A(H.openHats.length===0,'按停止也會把還在響的開鈸收掉');

// ================= 沒標籤的卡不能憑空消失 =================
const U=boot(); await U.syncLibrary();
U.filt.kind='groove'; U.filt.q=''; U.filt.tags=[]; U.filt.fav=false; U.filt.arch=false; U.filt.family=null;
for(let i=0;i<6;i++) U.data.patterns.push(U.normCard({id:'u'+i,name:'',kind:'groove',tags:[],
  pattern:U.cardById('g8').pattern}));
let ub=box(); U.renderBrowse(ub);
for(let i=0;i<6;i++) A(ub.innerHTML.includes('data-card="u'+i+'"'),'未分類第 '+(i+1)+' 張看得到');
A(ub.innerHTML.includes('還沒標「打法特徵」'),'未分類有說明為什麼卡在這裡');
// 有標籤的分區仍然只放代表卡，但「看全部」要標出總數
for(let i=0;i<6;i++) U.data.patterns.push(U.normCard({id:'t'+i,name:'',kind:'groove',tags:['16 beat'],
  pattern:U.cardById('g8').pattern}));
ub=box(); U.renderBrowse(ub);
const sect16=ub.innerHTML.split('<section class="sect">').find(x=>x.includes('<h3>16 beat</h3>'));
A((sect16.match(/class="dcard/g)||[]).length===U.MAX_PER_SECTION,'有標籤的分區仍然只放 '+U.MAX_PER_SECTION+' 張代表卡');
A(/看全部 \d+ 張/.test(sect16),'「看全部」標出總數，才知道底下還有多少');

// ================= 變體要找得到 =================
const V=boot(); await V.syncLibrary();
V.filt.kind='groove'; V.filt.q=''; V.filt.tags=[]; V.filt.fav=false; V.filt.arch=false; V.filt.family=null;
let vb=box(); V.renderBrowse(vb);
A(!vb.innerHTML.includes('data-card="g8g"'),'分類瀏覽首頁只放基礎卡，變體不出現（刻意的）');
A(vb.innerHTML.includes('data-fam="g8"')&&vb.innerHTML.includes('個變體'),'但基礎卡上的「N 個變體」是可點的入口');
V.showFamily('g8');
A(V.filtering()&&V.filt.family==='g8','點了就進入那個家族的檢視');
vb=box(); const vn=V.renderWall(vb);
A(vb.innerHTML.includes('data-card="g8"')&&vb.innerHTML.includes('data-card="g8g"'),'家族檢視看得到基礎卡與變體');
A(vn===1+V.childrenOf('g8').length,'家族檢視只有這一家（'+vn+' 張）');
A(!vb.innerHTML.includes('data-card="ght"'),'別家的卡不會混進來');
// 變體的標籤跟父卡不同時也不能被濾掉
V.cardById('g8g').tags=['快歌'];
vb=box(); V.renderWall(vb);
A(vb.innerHTML.includes('data-card="g8g"'),'看家族時不套標籤篩選，標籤不同的變體照樣看得到');
V.filt.family=null;
A(!V.filtering(),'清掉家族就回到分類瀏覽');
A(/filt\.family=base; renderGallery\(\); openCardDialog/.test(src),'做完變體會留在那個家族裡，關掉彈窗不會找不到');

console.log('\n全部通過（'+REAL.patterns.length+' 張官方卡）');
})().catch(e=>{ console.error('\n'+e.message); process.exit(1); });
