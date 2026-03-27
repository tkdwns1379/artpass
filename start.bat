@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  아트패스 (ArtPass) 시작
echo ========================================
echo.
echo  브라우저에서 접속: http://localhost:5200
echo.
echo  종료하려면 두 창을 모두 닫으세요.
echo ========================================
echo.

start "아트패스 백엔드" cmd /k "cd /d C:\design-admission\backend && npm start"
start "아트패스 프론트" cmd /k "cd /d C:\design-admission && npm run dev"
