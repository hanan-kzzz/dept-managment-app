@echo off
if "%~1"=="" (
    set /p commit_msg="Enter commit message: "
) else (
    set commit_msg=%~1
)

echo Adding files...
git add .

echo Committing changes...
git commit -m "%commit_msg%"

echo Pushing to GitHub...
git push

echo Done!
pause
