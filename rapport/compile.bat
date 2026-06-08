@echo off
cd /d "%~dp0"
pdflatex -interaction=nonstopmode main.tex
bibtex main
pdflatex -interaction=nonstopmode main.tex
pdflatex -interaction=nonstopmode main.tex
echo.
echo PDF genere : %~dp0main.pdf
