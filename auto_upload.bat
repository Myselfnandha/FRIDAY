@echo off
setlocal
echo Reading configuration...
set "HF_TOKEN="

:: Try to read HF_TOKEN from backend\.env
if exist "backend\.env" (
    for /f "usebackq tokens=1* delims==" %%a in ("backend\.env") do (
        for /f "tokens=*" %%x in ("%%a") do if /i "%%x"=="HF_TOKEN" set "HF_TOKEN=%%b"
    )
)

if defined HF_TOKEN (
    for /f "tokens=*" %%x in ("%HF_TOKEN%") do set "HF_TOKEN=%%x"
)

if "%HF_TOKEN%"=="" (
    echo Error: HF_TOKEN not found in backend\.env
    exit /b 1
)

echo.
echo Staging and Committing all changes...
git add .
git commit -m "Update"

echo.
echo Configuring Hugging Face Remote...
git remote remove space 2>nul
git remote add space https://nandhaalagesan248:%HF_TOKEN%@huggingface.co/spaces/nandhaalagesan248/FRIDAY

echo.
echo Pushing to Hugging Face Space (Force Push)...
git push --force space main

echo.
echo Pushing to GitHub (Origin)...
git push origin main

echo.
echo Done.
endlocal
