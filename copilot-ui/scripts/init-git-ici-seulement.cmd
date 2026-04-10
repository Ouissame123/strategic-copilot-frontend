@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Depot Git UNIQUEMENT pour ce dossier :
echo   %CD%
echo.

if exist ".git" (
  echo Un depot existe deja ici. Utilisez : git status
  pause
  exit /b 0
)

echo [IMPORTANT] Si "git status" depuis Bureau affichait tout votre disque,
echo le depot errone est probablement dans : %USERPROFILE%\.git
echo.
echo Supprimez-le MANUELLEMENT une seule fois si vous n'y avez JAMAIS commite :
echo   1. Fermez Cursor/VS Code
echo   2. Explorateur Windows -^> %USERPROFILE%
echo   3. Afficher fichiers caches -^> supprimer le dossier ".git" s'il est a la racine du profil
echo    OU en Invite de commandes (admin deconseille) :
echo      rmdir /s /q "%USERPROFILE%\.git"
echo.
pause

git init
git branch -M main
echo.
echo OK : depot cree dans copilot-ui. Verifiez avec : git status
echo Vous ne devriez voir QUE les fichiers du projet (pas Desktop, AppData, etc.)
pause
