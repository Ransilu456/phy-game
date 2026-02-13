@echo off
echo Compiling Native Test with g++...
g++ cpp/test_physics.cpp -o physics_test.exe

if %errorlevel% equ 0 (
    echo Running Test...
    physics_test.exe
) else (
    echo Compilation Failed.
)
pause
