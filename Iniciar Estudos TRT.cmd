@echo off
chcp 65001 >nul
title Estudos TRT - Analista Judiciario
cd /d "%~dp0"

echo ============================================================
echo   Estudos TRT - Analista Judiciario
echo ============================================================
echo.

REM Instala as dependencias na primeira execucao
if not exist "node_modules" (
  echo [1/2] Instalando dependencias ^(so na primeira vez^)...
  call npm install
  echo.
)

REM Gera a versao do app se ainda nao existir
if not exist "dist\index.html" (
  echo [2/2] Preparando o app...
  call npm run build
  echo.
)

echo Abrindo o app no navegador...
echo.
echo  ^>^> MANTENHA ESTA JANELA ABERTA enquanto estuda.
echo  ^>^> Para encerrar, basta fechar esta janela.
echo.

REM Sobe o servidor local e abre o navegador automaticamente
REM (porta 5188 para nao colidir com outros projetos locais)
call npm run preview -- --port 5188 --open

echo.
echo O app foi encerrado. Pressione qualquer tecla para sair.
pause >nul
