@echo off
rem 富士山下的 7-ELEVEN — 本機啟動器
rem （ES modules 需要透過 HTTP 開啟，不能直接雙擊 index.html）
cd /d "%~dp0"
start "Fuji-711 Server" cmd /c "python -m http.server 8642 2>nul || py -m http.server 8642"
timeout /t 1 >nul
start "" http://localhost:8642
echo 伺服器已啟動：http://localhost:8642 （關閉該視窗即可停止）
