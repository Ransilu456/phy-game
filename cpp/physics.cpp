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
    double time;
};

// Global state instance
ProjectileState state = {0, 0, 0, 0, 0};

EMSCRIPTEN_KEEPALIVE
void init_projectile(double x, double y, double speed, double angleDeg) {
    state.x = x;
    state.y = y;
    double angleRad = angleDeg * (M_PI / 180.0);
    state.vx = speed * std::cos(angleRad);
    state.vy = speed * std::sin(angleRad);
    state.time = 0;
}

EMSCRIPTEN_KEEPALIVE
void update_projectile(double dt, double gravity, int airResistanceEnabled) {
    if (std::isnan(dt) || dt <= 0) return;

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

EMSCRIPTEN_KEEPALIVE
double get_x() { return state.x; }

EMSCRIPTEN_KEEPALIVE
double get_y() { return state.y; }

EMSCRIPTEN_KEEPALIVE
double get_vx() { return state.vx; }

EMSCRIPTEN_KEEPALIVE
double get_vy() { return state.vy; }

EMSCRIPTEN_KEEPALIVE
double get_time() { return state.time; }

}
