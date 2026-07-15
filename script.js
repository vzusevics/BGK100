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
        POV Circle Graphic (state‑driven, screen‑space anchors)
        --------------------------------------------------------- */

    // recompute curvature drop and hidden height for POV logic
    const drop_m = (distance_m ** 2) / (2 * R);
    const hiddenHeight = drop_m - observer_h;

    // POV circle geometry
    const circleDiameterPx = 200;
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
    const horizonScreenY = circleY;

    // draw sea
    ctx.fillStyle = "#3366aa";
    ctx.fillRect(circleX - circleRadius, horizonScreenY, circleDiameterPx, circleDiameterPx);

    /* ---------------------------------------------------------
    SHIP POSITIONING LOGIC (strictly by state)
    Anchors are now halfway between center and perimeter
    → independent of observer height
    → no drift
    → perfect continuity
    --------------------------------------------------------- */

    // screen‑space anchors (fixed, height‑independent)
    const topScreenY    = circleY - circleRadius / 2;   // halfway to top
    const bottomScreenY = circleY + circleRadius / 2;   // halfway to bottom

    let shipScreenY = null;

    // VISIBLE: bottom → top based on distance to horizon
    if (state === "visible") {
        const horizon_m = Math.sqrt(2 * R * observer_h);
        const ratio = Math.min(distance_m / horizon_m, 1);
        shipScreenY = bottomScreenY - ratio * (bottomScreenY - topScreenY);
    }

    // PARTIAL: top → bottom based on hiddenHeight fraction
    else if (state === "partial") {
        const ratio = Math.min(Math.max(hiddenHeight / ship_h, 0), 1);
        shipScreenY = topScreenY + ratio * (bottomScreenY - topScreenY);
    }

    // INVISIBLE: do not draw ship
    else {
        shipScreenY = null;
    }

    /* ---------------------------------------------------------
    DRAW SHIP (only when not fully hidden)
    --------------------------------------------------------- */

    if (shipScreenY !== null) {
        if (shipVisibleImg.complete) {
            ctx.drawImage(
                shipVisibleImg,
                circleX - 40,
                shipScreenY - 40,   // center 80px image
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
