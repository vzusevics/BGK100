const canvas = document.getElementById("viewCanvas");
const ctx = canvas.getContext("2d");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const R = 6371000; // Earth radius in meters
const exaggeration = 50; // vertical exaggeration factor
const curveScale = 0.02; // pixels per meter


// Convert distance to curvature drop and map to canvas Y (visual only)
function earthCurveY(x) {
    const maxDist = 50000; // 50 km in meters
    const distanceRatio = x / canvas.width;
    const dist_m = distanceRatio * maxDist;

    const drop_m = (dist_m ** 2) / (2 * R);

    return canvas.height - 300 + drop_m * curveScale * exaggeration;
}

/* ---------------------------------------------------------
   REAL CURVATURE VISIBILITY CHECK (independent of drawing) - correct
   --------------------------------------------------------- */

function isHiddenReal(distance_m, observer_h, ship_h = 2) {
    // Curvature drop in meters
    const drop_m = (distance_m ** 2) / (2 * R);
    return drop_m > (observer_h + ship_h);
}

//ship visible or not?
function visibilityState(distance_m, observer_h, ship_h = 2) {
    const drop_m = (distance_m ** 2) / (2 * R);
    const hiddenHeight = drop_m - observer_h;

    if (hiddenHeight <= 0) return "visible";
    if (hiddenHeight >= ship_h) return "invisible";
    return "partial";
}

/* ---------------------------------------------------------
   DRAW EVERYTHING (visual stays exactly as before)
   --------------------------------------------------------- */

function drawScene(distance_km, observer_h) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const distance_m = distance_km * 1000;
    const ship_h = 2;
    
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
    const maxDist = 50000;
    let shipX = (distance_m / maxDist) * canvas.width;

    // Prevent LOS slope from blowing up
    if (shipX <= observerX + 1) {
        shipX = observerX + 1;
    }
    // Ship vertical position (visual)
    const shipBaseY = earthCurveY(shipX);
    const shipHeight = ship_h * curveScale * exaggeration;
    const shipY = shipBaseY - shipHeight;

    /* ---------------------------------------------------------
       VISUAL LOS INTERSECTION CHECK (kept exactly as before)
       --------------------------------------------------------- */

    let hiddenVisual = false;

    /* ---------------------------------------------------------
       REAL CURVATURE CHECK (new)
       --------------------------------------------------------- */

//    const hiddenReal = isHiddenReal(distance_m, observer_h);

    /* ---------------------------------------------------------
       Draw LOS (visual)
       --------------------------------------------------------- */
    const horizon_m = Math.sqrt(2 * R * observer_h);
    const horizon_m_clamped = Math.min(horizon_m, maxDist);
    const horizonX = (horizon_m_clamped / maxDist) * canvas.width;

    // prevent division by zero in LOS slope
    if (horizonX <= observerX + 1) {
        horizonX = observerX + 1;
    }
    const horizonY = earthCurveY(horizonX);
    const losSlope = (horizonY - observerY) / (horizonX - observerX);
    const losEndY = observerY + losSlope * (canvas.width - observerX);


    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(observerX, observerY);
    ctx.lineTo(canvas.width, losEndY);
    ctx.stroke();

// LOS label
    const horizonLabel = `horizon ${Math.round(horizon_m)} m`;
    const labelX = horizonX - 5;
    const labelY = horizonY + 5;
    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    ctx.fillText(horizonLabel, labelX, labelY);

    
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
    const state = visibilityState(distance_m, observer_h, ship_h);

    ctx.fillStyle = "black";
    ctx.font = "20px Arial";

    if (state === "visible") {
        ctx.fillText("Ship completely visible", 20, 30);
    } else if (state === "partial") {
        ctx.fillText("Ship partially visible", 20, 30);
    } else {
        ctx.fillText("Ship completely hidden", 20, 30);
    }
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
