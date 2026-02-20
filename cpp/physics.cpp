#include <cmath>
#include <emscripten.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

extern "C" {

struct ProjectileState {
    double x;
    double y;
    double vx;
    double vy;
    double ax;
    double ay;
    double time;
    double thrust;
    double fuel;
    double heading; // Steering angle in radians
    int isActive;
};

const int MAX_PROJECTILES = 10;
ProjectileState projectiles[MAX_PROJECTILES];

EMSCRIPTEN_KEEPALIVE
void init_projectile(int id, double x, double y, double speed, double angleDeg, double thrust, double fuel) {
    if (id < 0 || id >= MAX_PROJECTILES) return;
    
    double angleRad = angleDeg * M_PI / 180.0;
    projectiles[id].x = x;
    projectiles[id].y = y;
    projectiles[id].vx = speed * std::cos(angleRad);
    projectiles[id].vy = speed * std::sin(angleRad);
    projectiles[id].ax = 0;
    projectiles[id].ay = 0;
    projectiles[id].time = 0;
    projectiles[id].thrust = thrust;
    projectiles[id].fuel = fuel;
    projectiles[id].heading = angleRad;
    projectiles[id].isActive = 1;
}

EMSCRIPTEN_KEEPALIVE
void set_heading(int id, double angleDeg) {
    if (id < 0 || id >= MAX_PROJECTILES) return;
    projectiles[id].heading = angleDeg * M_PI / 180.0;
}

EMSCRIPTEN_KEEPALIVE
void set_thrust(int id, double thrust) {
    if (id < 0 || id >= MAX_PROJECTILES) return;
    projectiles[id].thrust = thrust;
}

EMSCRIPTEN_KEEPALIVE
void update_projectile(int id, double dt, double gravity, int airResistanceEnabled) {
    if (id < 0 || id >= MAX_PROJECTILES || !projectiles[id].isActive) return;

    ProjectileState& p = projectiles[id];
    
    // Reset acceleration
    p.ax = 0;
    p.ay = -gravity;

    // Apply Thrust in the direction of 'heading'
    if (p.fuel > 0 && p.thrust > 0) {
        p.ax += p.thrust * std::cos(p.heading);
        p.ay += p.thrust * std::sin(p.heading);
        p.fuel -= dt;
        if (p.fuel < 0) p.fuel = 0;
    }

    // Apply Air Resistance
    if (airResistanceEnabled) {
        double v = std::sqrt(p.vx * p.vx + p.vy * p.vy);
        if (v > 0.1) {
            const double k = 0.05; // Drag coefficient
            p.ax -= k * p.vx * v;
            p.ay -= k * p.vy * v;
        }
    }

    // Euler Integration
    p.vx += p.ax * dt;
    p.vy += p.ay * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.time += dt;

    // Ground check - stop if hitting ground
    if (p.y < 0 && p.time > 0.1) {
        p.isActive = 0;
    }
}

EMSCRIPTEN_KEEPALIVE double get_x(int id) { return projectiles[id].x; }
EMSCRIPTEN_KEEPALIVE double get_y(int id) { return projectiles[id].y; }
EMSCRIPTEN_KEEPALIVE double get_vx(int id) { return projectiles[id].vx; }
EMSCRIPTEN_KEEPALIVE double get_vy(int id) { return projectiles[id].vy; }
EMSCRIPTEN_KEEPALIVE double get_ax(int id) { return projectiles[id].ax; }
EMSCRIPTEN_KEEPALIVE double get_ay(int id) { return projectiles[id].ay; }
EMSCRIPTEN_KEEPALIVE double get_time(int id) { return projectiles[id].time; }
EMSCRIPTEN_KEEPALIVE double get_fuel(int id) { return projectiles[id].fuel; }
EMSCRIPTEN_KEEPALIVE double get_heading(int id) { return projectiles[id].heading * 180.0 / M_PI; }
EMSCRIPTEN_KEEPALIVE int is_active(int id) { return projectiles[id].isActive; }

}
