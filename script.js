const canvas = document.getElementById("viewCanvas");
const ctx = canvas.getContext("2d");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const R = 6371000; // Earth radius in meters
const exaggeration = 10; // vertical exaggeration factor
const curveScale = 0.02; // pixels per meter


// Convert distance to curvature drop and map to canvas Y (visual only)
function earthCurveY(x) {
    const maxDist = 100000; // 100 km in meters
    const distanceRatio = x / canvas.width;
    const dist_m = distanceRatio * maxDist;

    const drop_m = (dist_m ** 2) / (2 * R);

    return canvas.height - 100 + drop_m * curveScale * exaggeration;
}

/* ---------------------------------------------------------
   REAL CURVATURE VISIBILITY CHECK (independent of drawing) - correct
   --------------------------------------------------------- */

function isHiddenReal(distance_m, observer_h, ship_h = 2) {
    // Curvature drop in meters
    const drop_m = (distance_m ** 2) / (2 * R);
    return drop_m > (observer_h + ship_h);
}

/* ---------------------------------------------------------
   DRAW EVERYTHING (visual stays exactly as before)
   --------------------------------------------------------- */

function drawScene(distance_km, observer_h) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const distance_m = distance_km * 1000;

    // Draw Earth curve (visual exaggerated)
    ctx.fillStyle = "#88b0ff";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);

    for (let x = 0; x <= canvas.width; x += 5) {
        ctx.lineTo(x, earthCurveY(x));
    }

    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // Observer position (visual)
    const observerX = 1;
    const observerBaseY = earthCurveY(observerX);
    const observerY = observerBaseY - observer_h * curveScale * exaggeration;

    // Ship horizontal position (visual)
    const maxDist = 100000;
    const shipX = (distance_m / maxDist) * canvas.width;

    // Ship vertical position (visual)
    const shipBaseY = earthCurveY(shipX);
    const shipHeight = ship_h * curveScale * exaggeration;
    const shipY = shipBaseY - shipHeight;

    /* ---------------------------------------------------------
       VISUAL LOS INTERSECTION CHECK (kept exactly as before)
       --------------------------------------------------------- */

    let hiddenVisual = false;
    const losSlope = (shipY - observerY) / (shipX - observerX);

    for (let x = observerX; x < shipX; x += 5) {
        const yLOS = observerY + losSlope * (x - observerX);
        if (earthCurveY(x) < yLOS) {
            hiddenVisual = true;
            break;
        }
    }

    /* ---------------------------------------------------------
       REAL CURVATURE CHECK (new)
       --------------------------------------------------------- */

    const hiddenReal = isHiddenReal(distance_m, observer_h);

    /* ---------------------------------------------------------
       Draw LOS (visual)
       --------------------------------------------------------- */

    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(observerX, observerY);
    ctx.lineTo(shipX, shipY);
    ctx.stroke();

    /* ---------------------------------------------------------
       Draw ship (visual shading only)
       --------------------------------------------------------- */

/* ---------------------------------------------------------
   Draw ship (visual shading only)
   --------------------------------------------------------- */

    ctx.fillStyle = hiddenVisual ? "gray" : "red";
    ctx.fillRect(shipX - 30, shipY, 60, shipHeight);

    /* ---------------------------------------------------------
       Real visibility text (new)
       --------------------------------------------------------- */

    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText(
        hiddenReal
            ? "Ship is hidden (real curvature)"
            : "Ship is visible (real curvature)",
        20,
        30
    );
}

/* ---------------------------------------------------------
   UPDATE UI + REDRAW
   --------------------------------------------------------- */

function update() {
    const distance = +document.getElementById("distanceSlider").value;
    const height = +document.getElementById("heightSlider").value;

    document.getElementById("distanceValue").textContent = distance + " km";
    document.getElementById("heightValue").textContent = height + " m";

    drawScene(distance, height);
}


document.getElementById("distanceSlider").oninput = update;
document.getElementById("heightSlider").oninput = update;

window.onload = update;
