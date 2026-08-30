const fs=require('fs'), path=require('path');
const ROOT='/Users/samuellu/Documents/Code/projects/drum-chart';
const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const body=src.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
new Function(body); // 語法檢查

const LIB=JSON.parse(fs.readFileSync(path.join(ROOT,'library.json'),'utf8'));
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
global.document={ createElement:()=>El(), getElementById:()=>El(), querySelectorAll:()=>[], head:{appendChild(){}} };
global.localStorage={ getItem:k=>store[k]??null, setItem:(k,v)=>store[k]=v };
global.window={}; global.location={hash:'',origin:'http://x',pathname:'/'}; global.history={replaceState(){}};
global.navigator={}; global.alert=()=>{}; global.confirm=()=>true; global.prompt=()=>'';
global.AudioContext=function(){ return {currentTime:0,state:'running',createBufferSource:()=>({connect(){},start(){}}),
  createGain:()=>({gain:{},connect(){}}),decodeAudioData:()=>Promise.resolve({})}; };
global.window.AudioContext=global.AudioContext;
global.setInterval=()=>1; global.clearInterval=()=>{};
let libToServe=LIB, libFails=false;
global.fetch=(u)=>{ if(String(u).includes('library.json')){
    if(libFails) return Promise.reject(new Error('offline'));
    return Promise.resolve({ ok:true, json:()=>Promise.resolve(libToServe) }); }
  return Promise.reject(new Error('no samples in test')); };

const EXPORTS='{data,filt,cardById,childrenOf,matches,encCard,decCard,songPayload,importSong,mergeCards,'+
  'renderGallery,renderBrowse,renderWall,renderSections,renderPicker,miniGridHtml,cardHtml,LANES,MAX_PER_SECTION,'+
  'defaultAxis,filtering,TAG_GROUPS,ALL_TAGS,fromV3,migrate,normCard,defaultData,syncLibrary,mergeLibrary,'+
  'receiveCard,takePastedLink,readOnly,publishSet,cardPayload,picking,mergedBar,phrase,isFav,toggleFav,'+
  'cellGlyph,cycle,LANE_KEYS,SAMPLE_FILES,emptyPattern,trans,playSeq,stopTransport,play,loopFillCard,fillCtrlHtml}';
function boot(){ store={}; return new Function('return (function(){ '+body+'\n; return '+EXPORTS+'; })()')(); }

const A=(c,m)=>{ if(!c) throw new Error('FAIL: '+m); console.log('ok -',m); };
const box=()=>({ innerHTML:'', querySelectorAll(){ return []; } });

(async()=>{
// ---------- library.json 本身 ----------
A(LIB.type==='drumchart-library'&&LIB.version>=1,'library.json 有 type 與 version');
A(LIB.patterns.length>=26,'library.json 有 '+LIB.patterns.length+' 張卡');
A(LIB.patterns.every(c=>!c.parent||LIB.patterns.some(x=>x.id===c.parent)),'每個變體的父卡都在庫裡');
A(LIB.patterns.every(c=>!c.parent||!LIB.patterns.find(x=>x.id===c.parent).parent),'家族只有一層');
A(new Set(LIB.patterns.map(c=>c.id)).size===LIB.patterns.length,'沒有重複的 id');
A(LIB.patterns.every(c=>c.tags.every(t=>true))&&LIB.patterns.every(c=>c.pattern&&c.pattern.ri.length===16),'每張卡的 pattern 結構正確');
A(!/seedCards/.test(src),'index.html 裡不再內嵌官方庫內容');

// ---------- 首次開啟：本地是空的，直接載入 ----------
let M=boot();
A(M.data.patterns.length===0,'還沒同步前本地是空的（內容不在程式裡）');
A(M.data.songs[0].sections[1].grooveRef==='g8','官方庫還沒載入，範例歌的引用仍然保留（不被誤殺）');
await M.syncLibrary();
A(M.data.patterns.length===LIB.patterns.length,'同步後載入 '+M.data.patterns.length+' 張');
A(M.data.patterns.every(c=>c.official),'載入的卡都標成官方');
A(M.data.libVersion===LIB.version,'記下官方庫版本 v'+M.data.libVersion);
A(M.cardById('g8')&&M.cardById('gcr'),'範例歌引用的卡都對得上了');

// ---------- 官方卡唯讀 ----------
A(M.readOnly(M.cardById('g8')),'官方卡唯讀');
M.data.admin=true;
A(!M.readOnly(M.cardById('g8')),'管理模式下官方卡可編輯');
M.data.admin=false;

// ---------- 重複同步不會長出東西 ----------
const before=M.data.patterns.length;
let r=M.mergeLibrary(LIB);
A(M.data.patterns.length===before&&r.added===0&&r.updated===LIB.patterns.length,'同一版重複合併：新增 0、更新 '+r.updated+'，不會重複');

// ---------- 個人卡不受合併影響 ----------
const mine={ id:'mine1', name:'我的私房打法', kind:'groove', tags:['慢歌'], parent:null, note:'', author:'我',
  official:false, archived:false, publish:false, pattern:M.cardById('g8').pattern };
M.data.patterns.push(mine);
M.mergeLibrary(LIB);
A(M.cardById('mine1')&&!M.cardById('mine1').official,'個人卡在合併後原封不動');

// ---------- 新版：新增 + 封存 ----------
const v2=JSON.parse(JSON.stringify(LIB)); v2.version=LIB.version+1;
v2.patterns=v2.patterns.filter(c=>c.id!=='gspace');                 // 官方庫移掉一張
v2.patterns.push({ id:'gnew', name:'新的官方卡', kind:'groove', tags:['快歌','副歌','8 beat'], parent:null,
  note:'', author:'', pattern:M.cardById('g8').pattern });
r=M.mergeLibrary(v2);
A(r.added===1&&r.archived===1,'新版合併：新增 1 張、封存 1 張');
A(M.cardById('gspace')&&M.cardById('gspace').archived,'被移除的官方卡是封存不是刪除——引用它的歌不會壞');
const sec=M.data.songs[0].sections.find(x=>x.grooveRef==='gspace');
A(!!sec&&M.cardById(sec.grooveRef),'那首範例歌的 Bridge 仍然指得到那張卡');

// ---------- 封存的卡不出現在瀏覽／挑卡 ----------
M.filt.kind='groove'; M.filt.q=''; M.filt.tags=[];
const b1=box(); M.renderBrowse(b1);
A(!b1.innerHTML.includes('>留白<'),'封存的卡不出現在分類瀏覽');
M.filt.tags=['慢歌']; const b2=box(); M.renderWall(b2);
A(!b2.innerHTML.includes('>留白<'),'封存的卡不出現在篩選結果牆');
M.filt.tags=[];
M.picking.kind='groove'; M.picking.q='留白'; M.renderPicker();
A(true,'挑卡也濾掉封存的卡（渲染不炸）');

// ---------- 待發佈與匯出內容 ----------
M.cardById('mine1').publish=true;
const pub=M.publishSet();
A(pub.some(c=>c.id==='mine1'),'標記待發佈的個人卡會進下一版');
A(!pub.some(c=>c.id==='gspace'),'已封存的官方卡不會再被發佈出去');
const activeOfficial=M.data.patterns.filter(c=>c.official&&!c.archived).length;
A(pub.length===activeOfficial+1,'下一版共 '+pub.length+' 張（'+activeOfficial+' 張未封存的官方卡 ＋ 1 張待發佈）');
A(Object.keys(M.cardPayload(pub[0])).join()==='id,name,kind,tags,parent,note,author,pattern',
  '匯出的卡不帶 official／archived／publish 這些本機旗標');

// ---------- 收到的卡 ----------
M.data.inbox=[];
const shared=M.encCard(M.cardById('g8'));
A(M.takePastedLink('https://x.github.io/drum-chart/#c='+shared),'貼上分享連結解析成功');
A(M.data.inbox.length===1&&M.data.patterns.every(c=>c.id!==M.data.inbox[0].card.id),
  '收到的卡先進暫存區，不會直接混進節奏庫');
A(!M.takePastedLink('https://example.com/沒有卡'),'不是分享連結時會擋下來');
M.receiveCard(M.decCard(shared),'阿明');
A(M.data.inbox[1].from==='阿明','記得是誰傳來的');

// ---------- 離線 ----------
libFails=true;
const M2=boot(); await M2.syncLibrary();
A(M2.data.patterns.length===0,'第一次開啟又連不上：不會炸，只是庫是空的');
libFails=false;

// ---------- v3 遷移仍然可用 ----------
const v3={currentId:'s1',songs:[{id:'s1',name:'舊歌',sections:[
 {id:'a',label:'Verse',note:'x',groove:{tempo:90,hh:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],sn:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],kk:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]},fill:null},
 {id:'b',label:'副歌',note:'',groove:{tempo:96,ri:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},fill:{tempo:96,tm:[0,0,0,0,0,0,0,0,0,0,1,1,2,2,3,3]}}]}]};
const mg=M.fromV3(v3);
A(mg.patterns.length===3,'v3 遷移：從舊段落抽出 3 張卡（不再夾帶內建 seed）');
A(mg.patterns.every(c=>!c.official),'從 v3 抽出來的都是個人卡，不是官方卡');
A(mg.songs[0].sections[1].grooveRef&&mg.songs[0].sections[1].fillRef,'舊段落改成引用卡片');

// ---------- 前面幾輪的行為沒有回歸 ----------
const g8=M.cardById('g8');
A((M.miniGridHtml(g8.pattern).match(/class="ml"/g)||[]).length===3,'小譜只畫有打的軌');
A(M.miniGridHtml(g8.pattern).includes('class="mn beat"'),'拍線還在');
const h=M.cardHtml(M.cardById('g8g'));
A(!h.includes('data-play=')&&h.includes('data-ab="g8g"'),'卡上沒有試聽鈕、變體有對照鈕');
A(h.includes('class="dmeta"')&&h.includes('官方'),'官方卡在標籤行標出來');
A(M.cardHtml({id:'x',name:'<img src=x>',tags:[],note:'',parent:null,pattern:g8.pattern}).includes('&lt;img'),'卡名有跳脫 HTML');
const dec=M.decCard(M.encCard(g8));
A(JSON.stringify(dec.pattern)===JSON.stringify(g8.pattern),'分享連結 round-trip 一致');
const css=src;
A(/--bg:#f7f7f5/.test(css)&&!/#fdf6ec|#ece3cf/.test(css),'Linear／Notion 色票，舊色碼沒有回流');
A(/\.mini \{[^}]*overflow-y:hidden/.test(css),'小譜的捲軸還是關著');
A(/\.varlist \{[^}]*border-left/.test(css),'家族的共用左側軌還在');


// ---------- 新軌：crash 與 rimclick ----------
A(M.LANE_KEYS.join()==='cr,ri,oh,hh,tm,sn,kk','七軌，crash 排在最上面');
A(M.SAMPLE_FILES.crash==='crash.mp3'&&M.SAMPLE_FILES.rimclick==='rimclick.mp3','新取樣有掛進來');
A(fs.existsSync(path.join(ROOT,'samples/crash.mp3'))&&fs.existsSync(path.join(ROOT,'samples/rimclick.mp3')),'兩個 mp3 檔真的在 samples/');
A(M.cycle('sn',0)===1&&M.cycle('sn',1)===2&&M.cycle('sn',2)===3&&M.cycle('sn',3)===0,'小鼓連點：重音→ghost→rimclick→空白');
A(M.cellGlyph('sn',3)==='◇'&&M.cellGlyph('cr',1)==='⊗','rimclick 與 crash 有自己的符號');
A(M.emptyPattern().cr.length===16,'空白 pattern 有 cr 軌');
A(LIB.patterns.every(c=>Array.isArray(c.pattern.cr)),'library.json 每張卡都有 cr 軌');
A(!LIB.patterns.some(c=>c.id==='g8s'),'重複的「8 beat 十六分踩鈸」已併進「16 beat 基本」');
A(LIB.patterns.find(c=>c.id==='gbalrim').pattern.sn.includes(3),'抒情 rimclick 那張真的用了 rimclick');
A(LIB.patterns.find(c=>c.id==='gcrcrash').pattern.cr[0]===1,'進場 crash 那張第一拍是 crash');

// ---------- 過門接在節奏後面 ----------
const g=M.cardById('g8'), f1=M.cardById('f1');           // f1 只佔最後一拍
const mb=M.mergedBar(g.pattern,f1.pattern);
A(mb.hh[0]===g.pattern.hh[0]&&mb.kk[0]===g.pattern.kk[0],'過門空著的格子繼續走節奏');
A(mb.tm[15]===f1.pattern.tm[15],'過門有東西的格子換成過門');
A(mb.hh[12]===0&&f1.pattern.tm[12]!==0,'過門有東西的那一格，節奏整排讓位（踩鈸不會疊上來）');
A(M.phrase(g.pattern,null).length===1,'沒選過門就是單純 loop 節奏');
const ph=M.phrase(g.pattern,f1.pattern);
A(ph.length===2&&ph[0].p===g.pattern&&ph[1].p!==f1.pattern,'加了過門：第一小節純節奏，第二小節是節奏＋過門');
A(M.LANE_KEYS.every(k=>ph[1].p[k].length===16),'合出來的小節是完整的 pattern');

// ---------- 收藏 ----------
M.data.favs=[];
A(!M.isFav('g8'),'預設沒有收藏');
M.toggleFav('g8');
A(M.isFav('g8')&&M.data.favs.length===1,'收藏存在 data.favs（只存 id）');
M.filt.kind='groove'; M.filt.q=''; M.filt.tags=[]; M.filt.fav=true;
A(M.filtering(),'只看收藏也算篩選，會切到平鋪結果牆');
const favBox=box(); const nf=M.renderWall(favBox);
A(favBox.innerHTML.includes('data-card="g8"'),'只看收藏時收藏的卡有出現');
A(!favBox.innerHTML.includes('data-card="ght"'),'沒收藏的卡被濾掉');
M.mergeLibrary(LIB);
A(M.isFav('g8'),'收藏在合併官方庫之後還在（只存 id，跟卡片內容無關）');
M.toggleFav('g8'); M.filt.fav=false;
A(!M.isFav('g8')&&!M.filtering(),'再按一次取消收藏');
A(M.defaultAxis('fill')==='speed','過門改用「速度感」分區（適用段落對過門語意不清）');


// ---------- 播放器認 id，不認 DOM 元素 ----------
const gg=M.cardById('g8');
M.stopTransport();
M.playSeq([{p:gg.pattern,bars:1}],null,90,'card:g8');
A(M.trans.key==='card:g8','播放中記住的是 id（重繪後還認得出來）');
M.playSeq([{p:gg.pattern,bars:1}],null,90,'card:g8');
A(!M.trans.key,'同一張再點一次＝停止');
M.playSeq([{p:gg.pattern,bars:1}],null,90,'card:g8');
M.playSeq([{p:M.cardById('ght').pattern,bars:1}],null,90,'card:ght');
A(M.trans.key==='card:ght','點另一張就換過去');
M.stopTransport();
A(!/function showView\(v\)\{?\s*\n?\s*stopTransport/.test(src),'切分頁不再中斷播放');
A(/markPlaying\(\);\s*\n\}/.test(src)||src.includes('markPlaying();          // 換分頁'),'切分頁後把播放中的樣子貼回去');
A(src.includes('data-sec="${sec.id}"'),'段落有 data-sec，重繪後標得回播放中');

// ---------- 配過門：全域選擇、用卡片挑 ----------
A(M.loopFillCard()===null&&M.fillCtrlHtml().includes('不加'),'預設不配過門');
M.play.fill='f1';
A(M.loopFillCard().id==='f1','配過門是全域設定，不是卡片屬性');
A(M.fillCtrlHtml().includes('一拍 tom 下行'),'標題列顯示目前配的是哪一張');
M.filt.kind='fill';
A(M.fillCtrlHtml()==='','看過門的時候不顯示「配過門」');
M.filt.kind='groove';
A(!src.includes('id="cFill"'),'編輯彈窗裡的過門下拉已移除（改用卡片挑）');
A(src.includes('openFillPicker'),'改成開挑卡彈窗——看得到譜、聽得到');
M.play.fill=null;

// ---------- 愛心位置 ----------
const fh=M.cardHtml(gg);
A(fh.indexOf('class="dbtns"')<fh.indexOf('class="fav'),'愛心固定在最右邊，在操作按鈕之後');
A(fh.includes('>♡</button>'),'沒收藏是空心');
M.toggleFav('g8');
A(M.cardHtml(gg).includes('>♥</button>'),'收藏了是實心');
M.toggleFav('g8');


// ---------- 維護官方庫：踢掉不要的、發佈過的轉正 ----------
const M3=boot(); await M3.syncLibrary();
M3.data.admin=true;
// 作者自己寫一張，標記待發佈
const own={ id:'own1', name:'我寫的節奏', kind:'groove', tags:['中板','主歌','8 beat'], parent:null, note:'', author:'我',
  official:false, archived:false, publish:true, pattern:M3.cardById('g8').pattern };
M3.data.patterns.push(own);
A(M3.publishSet().some(c=>c.id==='own1'),'待發佈的卡會進下一版');
// 把一張官方卡踢出官方庫
M3.cardById('ght').archived=true;
A(!M3.publishSet().some(c=>c.id==='ght'),'封存的官方卡不會再被發佈出去');
A(M3.cardById('ght'),'但它還在本機，取消封存救得回來');
// 模擬：發佈後其他人（和作者自己）再同步
const v3lib={ type:'drumchart-library', version:M3.data.libVersion+1, patterns:M3.publishSet().map(M3.cardPayload) };
M3.mergeLibrary(v3lib);
A(M3.cardById('own1').official&&!M3.cardById('own1').publish,'發佈過的自製卡，下次同步就轉正成官方卡');
A(M3.cardById('ght').archived,'踢掉的那張同步後仍然是封存狀態，不會復活');
A(M3.readOnly(M3.cardById('own1'))===false,'（管理模式下）轉正後仍可編輯');
M3.data.admin=false;
A(M3.readOnly(M3.cardById('own1'))===true,'一般使用者看到的是唯讀的官方卡');
// 管理模式可以看見封存的卡
M3.data.admin=true; M3.filt.kind='groove'; M3.filt.q=''; M3.filt.tags=[]; M3.filt.fav=false;
M3.filt.arch=false; const ba=box(); M3.renderBrowse(ba);
A(!ba.innerHTML.includes('data-card="ght"'),'預設看不到封存的卡');
M3.filt.arch=true; const bb=box(); M3.renderBrowse(bb);
A(bb.innerHTML.includes('data-card="ght"')&&bb.innerHTML.includes('已封存'),'勾了「顯示已封存」才看得到，而且有標記');

console.log('\n全部通過');
})().catch(e=>{ console.error('\n'+e.message); process.exit(1); });
