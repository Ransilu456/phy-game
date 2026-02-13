#include <iostream>
#include <math.h>
#include <vector>
#include <iomanip>

// Mock of the implementation in physics.cpp
// In a real build, we would link them, but for a simple test, we'll direct include or copy-paste relevant logic
// to avoid Emscripten headers dependency which user might not have.

struct ProjectileState {
    double x, y, vx, vy, time;
};

ProjectileState state;

void init_projectile(double x, double y, double speed, double angleDeg) {
    state.x = x;
    state.y = y;
    double angleRad = angleDeg * (3.14159265358979323846 / 180.0);
    state.vx = speed * cos(angleRad);
    state.vy = speed * sin(angleRad);
    state.time = 0;
}

void update_projectile(double dt, double gravity, int airResistanceEnabled) {
    state.time += dt;
    double ax = 0;
    double ay = -gravity;
    if (airResistanceEnabled) {
        const double k = 0.2;
        ax -= k * state.vx;
        ay -= k * state.vy;
    }
    state.vx += ax * dt;
    state.vy += ay * dt;
    state.x += state.vx * dt;
    state.y += state.vy * dt;
}

int main() {
    std::cout << "--- Native Physics Engine Test (g++) ---" << std::endl;
    
    // Test Case 1: Simple Parabola
    // u = 20 m/s, theta = 45 deg, g = 9.81
    // Expected Range = u^2 * sin(2*theta) / g = 400 * 1 / 9.81 = ~40.77m
    
    init_projectile(0, 0, 20, 45);
    std::cout << "Init: x=" << state.x << " y=" << state.y << " vx=" << state.vx << " vy=" << state.vy << std::endl;
    
    double dt = 0.01;
    double max_h = 0;
    
    while (state.y >= 0) {
        update_projectile(dt, 9.81, 0);
        if (state.y > max_h) max_h = state.y;
    }
    
    std::cout << "Simulation Complete." << std::endl;
    std::cout << "Range (x): " << state.x << " m (Expected ~40.77)" << std::endl;
    std::cout << "Max Height: " << max_h << " m (Expected ~10.19)" << std::endl;
    std::cout << "Flight Time: " << state.time << " s (Expected ~2.88)" << std::endl;
    
    double error = abs(state.x - 40.77);
    if (error < 0.5) {
        std::cout << "[PASS] Logic verified." << std::endl;
        return 0;
    } else {
        std::cout << "[FAIL] result deviation too high." << std::endl;
        return 1;
    }
}
