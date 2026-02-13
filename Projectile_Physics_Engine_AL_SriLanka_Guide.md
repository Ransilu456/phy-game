# 🚀 Building a Projectile Physics Engine for Advanced Level (A/L) Physics Students -- Sri Lanka

## 🎯 Project Goal

Create a browser-based physics game focused on **Projectile Motion**
aligned with the Sri Lankan A/L Physical Science syllabus.\
The system will use:

-   **HTML** -- Structure\
-   **CSS** -- UI & Styling\
-   **JavaScript** -- Physics Engine & Rendering\
-   **C++ compiled to WebAssembly (WASM)** -- High
    performance physics calculations

------------------------------------------------------------------------

# 📚 1. Understanding Projectile Motion (A/L Level)

Projectile motion assumes:

-   Constant gravitational acceleration\
-   No air resistance (initial model)\
-   Motion in two dimensions

### Core Equations

Given: - Initial velocity: `u` - Angle of projection: `θ` - Gravity:
`g = 9.81 m/s²`

### Velocity Components

uₓ = u cosθ\
uᵧ = u sinθ

### Position Equations

x(t) = uₓ t\
y(t) = uᵧ t - ½ g t²

### Time of Flight

T = 2uᵧ / g

### Maximum Height

H = uᵧ² / 2g

### Range

R = u² sin(2θ) / g

------------------------------------------------------------------------

# 🧠 2. Designing the Physics Engine

A physics engine must:

1.  Track object state (position, velocity, acceleration)
2.  Update motion over time
3.  Render movement visually
4.  Detect collisions

## Core Data Structure (JavaScript)

``` js
class Projectile {
  constructor(x, y, speed, angle) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.angle = angle * Math.PI / 180;

    this.vx = speed * Math.cos(this.angle);
    this.vy = speed * Math.sin(this.angle);

    this.g = 9.81;
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
    this.x = this.vx * this.time;
    this.y = this.vy * this.time - 0.5 * this.g * this.time * this.time;
  }
}
```

------------------------------------------------------------------------

# 🎮 3. Rendering in Browser (Canvas)

``` js
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function draw(projectile) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(projectile.x, canvas.height - projectile.y, 5, 0, Math.PI * 2);
  ctx.fill();
}
```

Use `requestAnimationFrame()` for smooth animation.

------------------------------------------------------------------------

# 🧪 4. Advanced Features for A/L Students

## Add:

-   Air resistance
-   Variable gravity (Moon vs Earth)
-   Collision detection
-   Real-time graph plotting (x-t, y-t, v-t)
-   Challenge mode (hit target)

------------------------------------------------------------------------

# 🌐 5. Website Structure

    /projectile-game
      ├── index.html
      ├── style.css
      ├── engine.js
      ├── game.js
      └── wasm/ (optional C++ compiled)

------------------------------------------------------------------------

# ⚡ 6. Optional: Using C++ with WebAssembly

Steps:

1.  Write physics calculations in C++
2.  Compile using Emscripten
3.  Load WASM in JavaScript
4.  Use C++ functions for heavy computations

Example C++ snippet:

``` cpp
double calculateRange(double u, double angle) {
    double g = 9.81;
    double rad = angle * M_PI / 180.0;
    return (u * u * sin(2 * rad)) / g;
}
```

------------------------------------------------------------------------

# 🎯 7. Game Idea for Sri Lankan A/L Students

### "Hit the Target -- A/L Physics Edition"

Students must:

-   Calculate angle & velocity
-   Predict range
-   Adjust parameters manually
-   Compete with leaderboard scoring

Include:

-   Timer
-   Difficulty levels
-   Marks system based on accuracy

------------------------------------------------------------------------

# 📈 8. Educational Enhancements

-   Show real-time formula substitution
-   Show derivation hints
-   Provide past paper style questions
-   Show graphical analysis

------------------------------------------------------------------------

# 🧩 9. Expansion Ideas

-   2D rigid body engine
-   Momentum simulation
-   Circular motion
-   SHM engine
-   Full A/L Physics Simulation Suite

------------------------------------------------------------------------

# 🤖 GEMINI PROMPT

Below is a refined prompt to give Gemini:

------------------------------------------------------------------------

Create a complete browser-based physics game focused on Projectile
Motion aligned with the Sri Lankan A/L Physical Science syllabus.

Requirements:

1.  Use HTML, CSS, and JavaScript.
2.  Build a custom physics engine from scratch (no external physics
    libraries).
3.  Implement projectile motion using correct equations.
4.  Allow user input for:
    -   Initial velocity
    -   Projection angle
    -   Gravity
5.  Animate using requestAnimationFrame.
6.  Display:
    -   Real-time trajectory
    -   Time of flight
    -   Maximum height
    -   Range
7.  Add target-hitting challenge mode.
8.  Add score system based on calculation accuracy.
9.  Make UI modern and responsive.
10. Comment code clearly for learning purposes.
11. Structure code into modules.
12. Provide explanation of physics implementation.

Advanced: - Add air resistance toggle. - Add Moon/Earth gravity
switch. - Add graph plotting (position vs time).

Return full project file structure and complete code.

------------------------------------------------------------------------

# ✅ Outcome

After completing this project, students will:

-   Understand projectile motion deeply
-   Apply theory into simulation
-   Learn game physics programming
-   Improve mathematical modeling skills
