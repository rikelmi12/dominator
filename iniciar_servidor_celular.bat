@echo off
title DOMINATOR - Servidor para Celular
cls
echo ======================================================
echo   DOMINATOR: CONQUISTA DOS REINOS - SERVIDOR MOBILE
echo ======================================================
echo.
echo   Para jogar no celular (conectado no mesmo Wi-Fi):
echo   Abra o navegador do celular (Chrome/Safari) e acesse:
echo.
echo   ==^> http://192.168.1.8:8080
echo.
echo   Dica: No celular, gire para o modo paisagem (horizontal)
echo   para a melhor experiencia de batalha!
echo.
echo ======================================================
echo   Pressione Ctrl + C para encerrar o servidor.
echo ======================================================
echo.
python -m http.server 8080 --bind 0.0.0.0
pause
