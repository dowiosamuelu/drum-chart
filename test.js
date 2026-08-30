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
global.AudioContext=function(){ return {currentTime:0,state:'running',createBufferSource:()=>({connect(){},start(){}}),
  createGain:()=>({gain:{},connect(){}}),decodeAudioData:()=>Promise.resolve({})}; };
global.window.AudioContext=global.AudioContext;
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
  'toggleFav,cellGlyph,cycle,SAMPLE_FILES,emptyPattern,trans,playSeq,stopTransport,loopFillCard,fillCtrlHtml}';
function boot(){ store={}; return new Function('return (function(){ '+body+'\n; return '+EXPORTS+'; })()')(); }
const A=(c,m)=>{ if(!c) throw new Error('FAIL: '+m); console.log('ok -',m); };
const box=()=>({ innerHTML:'', querySelectorAll(){ return []; } });

(async()=>{
// ================= 真正的 library.json：只檢查結構 =================
A(REAL.type==='drumchart-library'&&typeof REAL.version==='number','library.json 有 type 與 version');
A(Array.isArray(REAL.patterns),'library.json 有 patterns 陣列（目前 '+REAL.patterns.length+' 張）');
A(REAL.patterns.every(c=>c.id&&c.name&&LK.every(k=>Array.isArray(c.pattern[k])&&c.pattern[k].length===16)),
  '每張卡都有 id、名稱與七軌 ×16 格');
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
A(/\.dcard:hover \.dbtns/.test(src),'操作按鈕 hover 才出現');

console.log('\n全部通過（'+REAL.patterns.length+' 張官方卡）');
})().catch(e=>{ console.error('\n'+e.message); process.exit(1); });
