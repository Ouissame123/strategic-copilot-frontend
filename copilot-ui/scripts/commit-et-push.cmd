@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo === Dossier : %CD% ===
where git >nul 2>&1
if errorlevel 1 (
  echo Git n'est pas dans le PATH. Installe Git for Windows ou utilise "Git Bash".
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo Initialisation du depot Git...
  git init
  echo Branche par defaut : main
  git branch -M main 2>nul
)

echo.
echo === git status ===
git status

echo.
echo === git add ===
git add -A

echo.
echo === commit ===
git commit -m "feat: contrat API, auth refresh, payloads RH, brief backend"

if errorlevel 1 (
  echo Echec du commit ^(rien a commiter ou erreur^). Verifiez le message ci-dessus.
  goto remote
)

:remote
echo.
echo === remotes ===
git remote -v
if errorlevel 1 goto fin

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo.
  echo Aucun remote "origin". Ajoutez votre depot GitHub puis relancez :
  echo   git remote add origin https://github.com/VOTRE_USER/VOTRE_REPO.git
  echo   git push -u origin main
  goto fin
)

echo.
echo === git push ===
git push
if errorlevel 1 (
  echo Echec du push. Essayez : git push -u origin main
)

:fin
echo.
pause
