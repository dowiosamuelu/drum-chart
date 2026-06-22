# 鼓手攻略表（Drum Chart）

把一首歌按**當天曲序**排成段落（Intro / Verse 1 / Verse 2 / 副歌 / Bridge…），
每段用內建的格子編輯器標清楚**打什麼節奏（groove）、用什麼過門（fill）**，
然後把整份**分享給其他鼓手**——對方能看、能聽（真鼓音色），還能**做自己的版本**。

目標是慢慢長出一個「鼓手互相觀摩的知識庫」。

---

## 怎麼啟動

### 最快：直接開網址

線上版（GitHub Pages）：**https://dowiosamuelu.github.io/drum-chart/**

打開就能用，免安裝。分享給其他鼓手用這個最方便。
（資料存在各自瀏覽器的 localStorage，攻略還是靠匯出/匯入 JSON 互傳——見下方〈怎麼分享〉。）

### 本機跑（要改程式碼或離線時）

純前端的單檔網頁，但**不能直接雙擊開**（`file://` 會讓 YouTube 出錯，且讀不到 `samples/`），
用一個本機小伺服器：

```bash
git clone https://github.com/dowiosamuelu/drum-chart.git
cd drum-chart
python3 -m http.server 8777
```

瀏覽器開：**http://localhost:8777/index.html**

---

## 怎麼用

1. **新增歌曲**：右上角「＋ 新增歌曲」，填歌名與你的名字（編輯者）。
2. **排曲序**：右側「＋ 新增段落」一段一段加，用每段左邊的 ▲▼ 調整順序。
3. **編每段的打法**：點段落，右下出現可編輯的格子。直接點格子切換音符：
   - 六軌：Ride / Open HH / Hi-hat / Tom / Snare / Kick
   - **Snare** 連點輪：● 重音 → ○ ghost note（弱音）→ 空白
   - **Tom** 連點輪：H → M → L（高/中/低）→ 空白
   - 其他軌：有 / 無
4. **聽**：每個區塊可調 BPM、按「播放」（loop）。音色是真鼓取樣，ghost note 為明顯弱音。
5. **過門**：預設沒有，按「＋ 新增過門」才出現它的格子；可「移除過門」。
6. **參考影片（選配）**：左邊可貼 YouTube 連結聽原曲 feel。
   現場曲速常和 YT 不同，影片只是參考、不是時間軸主軸。

目前固定 **4/4、16 格（十六分音符）**，其他拍號暫不支援。

---

## 怎麼分享

用**檔案**分享（不用網路、不用帳號）：

- **匯出這首**：存成 `歌名.json`。
- **匯出全部**：把所有歌存成 `本週歌單.json`（一週多首一次傳）。
- **匯入檔案**：選 `.json` 匯入，單首或整包都吃。
- **做我自己的版本**：把目前這份複製成「（我的版本）」再改。

把 `.json` 用 LINE / email / 雲端硬碟傳給其他鼓手即可。

---

## 已知限制 / 設計取捨

- **JSON 是快照，不會自動同步**：別人改完傳回來要手動再匯入；各自的版本會各自長。
  等這個「共享→觀摩→做版本」的迴圈確認有價值，下一步才做真正的**雲端資料庫**。
- **資料存在瀏覽器 localStorage**：換瀏覽器／清快取會不見，重要的請記得匯出存檔。

---

## 技術

- 單檔 `index.html`，純前端，資料存 localStorage。
- 鼓譜資料格式：`pattern = { tempo, ri[], oh[], hh[], tm[], sn[], kk[] }`，每軌 16 格。
  `tm` 值 1/2/3 = 高/中/低 tom；`sn` 值 1/2 = 重音/ghost；其餘 0/1。
- 播放用 Web Audio 載入 `samples/` 的真鼓取樣 MP3 觸發；各鼓件音量在程式裡的 `GAINS` 微調。
- YouTube 用官方 IFrame API 嵌入（選配）。

### samples/ 來源

`samples/` 的鼓組取樣取自開源專案
[GrooveScribe](https://github.com/montulli/GrooveScribe)（`soundfont/NewDrumSamples`），
版權 © 2015 Lou Montulli and Mike Johnston，授權為 GPLv2。
音檔已重新命名以對應本專案軌道，音訊內容未更動。詳見 [NOTICE](NOTICE)。

---

## 授權

本專案依 **GNU General Public License v2（GPLv2）** 散布，詳見 [LICENSE](LICENSE)。
（採 GPLv2 是為了與上述鼓組取樣的授權相容。）
