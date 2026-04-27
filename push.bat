@echo off
set "msg="
set /p "msg=Enter commit message (or press Enter for default): "

if not defined msg (
    set "msg=auto-update: adding another api endpoint"
)

echo --- Adding changes... ---
git add .

echo --- Committing with message: %msg% ---
:: Кавычки здесь критически важны
git commit -m "%msg%"

echo --- Pushing to GitHub... ---
git push

echo --- Done! ---
pause