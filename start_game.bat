@echo off
echo --- Step 1: Building WASM ---
call build_wasm.bat

if %errorlevel% neq 0 (
    echo Build failed. Please ensure 'emcc' is in your PATH.
    echo If you have emsdk installed, you may need to run 'emsdk_env.bat' first.
    pause
    exit /b
)

echo.
echo --- Step 2: Starting Local Server ---
echo WASM requires an HTTP server (cannot run from file://)
echo Starting Python server...
python serve.py
pause
