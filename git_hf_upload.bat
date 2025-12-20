@echo off
setlocal
echo Reading configuration...
set "HF_TOKEN="

:: Try to read HF_TOKEN from backend\.env
if exist "backend\.env" (
    for /f "usebackq tokens=1* delims==" %%a in ("backend\.env") do (
        :: Remove potential surrounding whitespace from key
        for /f "tokens=*" %%x in ("%%a") do if /i "%%x"=="HF_TOKEN" set "HF_TOKEN=%%b"
    )
)

:: Trim potential whitespace from the token value
if defined HF_TOKEN (
    for /f "tokens=*" %%x in ("%HF_TOKEN%") do set "HF_TOKEN=%%x"
)

if "%HF_TOKEN%"=="" (
    echo Warning: HF_TOKEN not found in backend\.env
    set /p HF_TOKEN="Please enter your Hugging Face Access Token: "
)

echo.
echo Cleaning up sensitive files from git tracking...
git rm --cached -r .env 2>nul
git rm --cached -r backend\.env 2>nul
git rm --cached -r **\.env 2>nul

echo.
echo Staging and Committing all changes...
git add .
git commit -m "Update system modules, UI layout, and authentication"

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
pause
