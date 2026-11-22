@echo off
cd /d "%~dp0"
where docker >nul 2>&1
if errorlevel 1 (
  echo Docker nao encontrado. Instale e abra o Docker Desktop.
  pause
  exit /b 1
)
if exist ".env" goto subir
echo Criando .env com senhas aleatorias...
powershell -NoProfile -Command "'MYSQL_ROOT_PASSWORD=' + [guid]::NewGuid().ToString('N') | Out-File -Encoding ascii .env; 'MYSQL_PASSWORD=' + [guid]::NewGuid().ToString('N') | Out-File -Encoding ascii -Append .env"
:subir
echo Subindo MySQL, backend e frontend do Plumaris...
docker compose up --build -d
echo.
docker compose ps
echo.
echo Interface: http://localhost:5173
echo API:       http://localhost:8080/api/animais
pause
