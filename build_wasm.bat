@echo off
echo ==========================================
echo   Building C++ Physics Engine to WASM
echo ==========================================

REM ------------------------------------------
REM Check if emcc exists in PATH
REM ------------------------------------------
where emcc >nul 2>nul
if %ERRORLEVEL% equ 0 goto :emcc_found
echo.
echo ERROR: Emscripten (emcc) not found in PATH.
echo Run emsdk_env.bat first.
echo.
pause
exit /b 1

:emcc_found
REM ------------------------------------------
REM Create output folder if not exists
REM ------------------------------------------
if not exist "js" mkdir "js"

echo.
echo Compiling...

REM ------------------------------------------
REM Compile C++ to WebAssembly
REM ------------------------------------------
emcc cpp/physics.cpp ^
 -o js/physics.js ^
 -O3 ^
 --minify 0 ^
 -sWASM=1 ^
 -sEXPORTED_RUNTIME_METHODS=['cwrap'] ^
 -sEXPORTED_FUNCTIONS=['_init_projectile','_update_projectile','_get_x','_get_y','_get_vx','_get_vy','_get_time'] ^
 -sALLOW_MEMORY_GROWTH=1

REM ------------------------------------------
REM Check result
REM ------------------------------------------
if %ERRORLEVEL% neq 0 goto :compile_failed

echo.
echo ==========================================
echo   ✅ Compilation Successful
echo   Output:
echo      js/physics.js
echo      js/physics.wasm
echo ==========================================
goto :end

:compile_failed
echo.
echo ❌ Compilation Failed.

:end
pause

