const canvas = document.getElementById("viewCanvas");
const ctx = canvas.getContext("2d");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const R = 6371000; // Earth radius in meters
const exaggeration = 50; // vertical exaggeration factor
const curveScale = 0.02; // pixels per meter

// load assets
const shipVisibleImg = new Image();
shipVisibleImg.src = "assets/img/ship_visible.jpg";
const shipHiddenImg = new Image();
shipHiddenImg.src = "assets/img/ship_hidden.jpg";
const observerImg = new Image();
observerImg.src = "assets/img/observer.jpg";

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
    //observer img
    if (observerImg.complete) {
    ctx.drawImage(observerImg, observerX - 40, observerY - 80, 80, 80);
    }

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
    ctx.fillStyle = "black";
    ctx.font = "16px Arial";

    const horizonLabel = `horizon ${Math.round(horizon_m_clamped)} m`;
    const textWidth = ctx.measureText(horizonLabel).width;

    const labelX = horizonX - textWidth - 20;
    const labelY = horizonY + 1;
    ctx.fillText(horizonLabel, labelX, labelY);

    /* ---------------------------------------------------------
       Real visibility text (new)
       --------------------------------------------------------- */
    const state = visibilityState(distance_m, observer_h, ship_h);

    ctx.fillStyle = "black";
    ctx.font = "20px Arial";

    if (state === "visible") {
        ctx.fillText("Ship completely visible", 40, 30);
    } else if (state === "partial") {
        ctx.fillText("Ship partially visible", 40, 30);
    } else {
        ctx.fillText("Ship completely hidden", 40, 30);
    }
    /* ---------------------------------------------------------
   Draw ship (visual shading only)
   --------------------------------------------------------- */
    let shipImgToDraw;
    if (state === "invisible") {
        shipImgToDraw = shipHiddenImg;
    } else {
        shipImgToDraw = shipVisibleImg;
    }

    if (shipImgToDraw.complete) {
        ctx.drawImage(shipImgToDraw, shipX - 60, shipY - 120, 120, 120);
    }
    /* ---------------------------------------------------------
        POV Circle Graphic
        --------------------------------------------------------- */

    // compute horizon distance
    const horizon_m = Math.sqrt(2 * R * observer_h);

    // compute hidden height (real curvature)
    const drop_m = (distance_m ** 2) / (2 * R);
    const hiddenHeight = drop_m - observer_h;

    // POV internal scaling
    const circleDiameterPx = 200;
    const shipHeightPx = 120;
    const internalDiameter = shipHeightPx * 3;
    const scale = circleDiameterPx / internalDiameter;

    // circle position
    const circleX = canvas.width - 250;
    const circleY = 150;
    const circleRadius = circleDiameterPx / 2;

    // draw circle border
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // clip drawing to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    ctx.clip();

    // draw sky
    ctx.fillStyle = "#88b0ff";
    ctx.fillRect(circleX - circleRadius, circleY - circleRadius, circleDiameterPx, circleDiameterPx);

    // horizon always in middle
    const horizonInternalY = 0;
    const horizonScreenY = circleY + horizonInternalY * scale;

    // draw sea
    ctx.fillStyle = "#3366aa";
    ctx.fillRect(circleX - circleRadius, horizonScreenY, circleDiameterPx, circleDiameterPx);

    // ---------------------------------------------------------
    // SHIP POSITIONING LOGIC (distance‑based U‑curve)
    // ---------------------------------------------------------

    // key internal Y positions
    const visibleBottomY = internalDiameter / 4;   // fully visible resting bottom
    const horizonBottomY = 0;                     // bottom exactly on horizon
    const hiddenBottomY = internalDiameter / 2;   // fully hidden bottom

    // distance difference from horizon
    const d = distance_m - horizon_m;

    let shipBottomInternalY;

    // PHASE A: fully visible → bottom fixed
    if (d <= 0) {
        shipBottomInternalY = visibleBottomY;
    }

    // PHASE B: moving upward toward horizon
    else if (d > 0 && d < 2000) {
        const ratio = d / 2000;  // 0 → visible, 1 → horizon
        shipBottomInternalY =
            visibleBottomY - ratio * (visibleBottomY - horizonBottomY);
    }

    // PHASE C: moving downward into hidden region
    else if (d >= 2000 && d < 2000 + ship_h) {
        const ratio = (d - 2000) / ship_h;  // 0 → horizon, 1 → hidden
        shipBottomInternalY =
            horizonBottomY + ratio * (hiddenBottomY - horizonBottomY);
    }

    // PHASE D: fully hidden → do not draw ship
    else {
        shipBottomInternalY = hiddenBottomY;
    }

    // ---------------------------------------------------------
    // DRAW SHIP (only when not fully hidden)
    // ---------------------------------------------------------

    if (d < 2000 + ship_h) {
        const shipBottomScreenY = circleY + shipBottomInternalY * scale;
        const shipScreenY = shipBottomScreenY - 40; // center 80px ship image

        if (shipVisibleImg.complete) {
            ctx.drawImage(
                shipVisibleImg,
                circleX - 40,
                shipScreenY,
                80,
                80
            );
        }
    }

    ctx.restore();
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
