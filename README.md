# 富士山下的 7-ELEVEN · 自由探索（three.js）

重現日本山梨縣富士河口湖「7-Eleven 河口湖站東店」經典打卡景：
全幅玻璃店面、三色橫帶招牌、停車場，以及後方巨大的富士山。
可自由探索，並即時切換 **時間** 與 **天氣**。

## 怎麼開始

- **Windows**：雙擊 `啟動遊戲.bat`（會自動起本機伺服器並開瀏覽器）
- **有 Python**：在本資料夾執行 `python -m http.server 8000`，開 <http://localhost:8000>
- **有 Node**：`npx serve .`

> 場景使用 ES modules，需要透過 HTTP 開啟（直接雙擊 index.html 會空白）。
> 部署到 Vercel / GitHub Pages 等靜態主機則完全不用設定。

不需要安裝任何套件 — three.js 與後處理模組都已內建於 `libs/`，完全離線可玩。

## 操作

| 按鍵 | 功能 |
| --- | --- |
| `W A S D` / 方向鍵 | 移動（相機相對方向） |
| `Shift` | 奔跑 |
| `Space` | 跳躍 |
| 按住滑鼠拖曳 | 旋轉視角 |
| 滾輪 | 縮放鏡頭 |

## 時間系統（滑桿 0–24 時 + 快捷鈕）

- 清晨 / 正午 / 黃昏 / 夜晚，太陽月亮方位、天空色、霧色即時變化
- 夜晚：星空、月亮、路燈與 7-Eleven 招牌、販賣機、住家窗戶全部亮起
- 黃昏：富士山染成紅色的「赤富士」名場面
- 勾選「時間流動」可自動推進（5 分鐘 = 一天）

## 天氣系統

| 天氣 | 效果 |
| --- | --- |
| ☀️ 晴天 | 藍天、清楚富士山 |
| 🌸 櫻花 | 花瓣隨風飄舞的春日限定 |
| ☁️ 多雲 | 天色轉灰、雲層變厚 |
| 🌧 下雨 | 雨絲、路面變濕反光、能見度下降 |
| ⛖ 雷暴 | 更暗、閃電照亮天空 |
| ❄️ 下雪 | 雪花飄落、地面逐漸積雪 |
| 🌫 起霧 | 濃霧壟罩街道 |

## 部署到 Vercel

本專案是**純靜態網站**（無框架、無 build 步驟），部署零設定：

**方法一：GitHub 匯入（推薦）**
1. 把整個資料夾 push 到 GitHub repo
2. 到 [vercel.com](https://vercel.com) → Add New… → Project → Import 該 repo
3. Framework Preset 保持「Other」，直接按 Deploy 即可

**方法二：Vercel CLI**
```bash
npm i -g vercel
vercel          # 首次部署（預覽）
vercel --prod   # 上正式環境
```

已內建的部署優化：
- 所有資源皆為相對路徑，任何子網域 / 子路徑都能跑
- 完全離線可用（three.js 已內建於 `libs/`，無 CDN 依賴）
- 手機 / 平板自動降載（粒子減量、陰影 1024）
- favicon 與 meta description 已設定，分享連結有標題描述

## 檔案結構

```
index.html            頁面與 UI（importmap + ES modules）
style.css             介面樣式
啟動遊戲.bat           Windows 一鍵啟動
libs/three.module.js  three.js r149（離線內建）
libs/addons/          後處理模組（bloom 泛光）
js/util.js            共用工具（貼圖、合併幾何）
js/world.js           街道、7-Eleven、房屋、電線桿、湖、富士山
js/sky.js             天空、日月星辰、雲
js/character.js       玩家角色與控制
js/environment.js     晝夜光照、天氣、雨雪花瓣粒子
js/main.js            渲染迴圈、bloom、輸入、UI 綁定
```

小技巧：點「📸 經典機位」可以站到重現打卡照的視角（7-11 在左、
富士山正前方）。
