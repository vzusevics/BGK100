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
const lighthouseImg = new Image();
lighthouseImg.src = "assets/img/lighthouse.png";


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
    const ship_h = 50;
    
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

    //left side decor
    const leftImg = new Image();
    leftImg.src = "assets/img/lv_side.png";
    if (leftImg.complete) {
        ctx.drawImage(leftImg, 0, canvas.height - 500, 400, 400);
    }
    //right side decor
    const rightImg = new Image();
    rightImg.src = "assets/img/est_side.png";

    if (rightImg.complete) {
        ctx.drawImage(rightImg, canvas.width - 160, canvas.height - 100, 200, 200);
    }


    // Observer position (visual)
    const observerX = 1;
    const observerBaseY = earthCurveY(observerX);
    const observerY = observerBaseY - observer_h * curveScale * exaggeration;
    //observer img
    if (observerImg.complete) {
    ctx.drawImage(observerImg, observerX - 1, observerY - 80, 80, 80);
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
    const horizon_km_clamped = horizon_m_clamped / 1000;

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

    const horizonLabel = `horizonts ${Number(horizon_km_clamped.toFixed(1))} km`;
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
        ctx.fillText("Taizels redzams", 40, 30);
    } else if (state === "partial") {
        ctx.fillText("Taizels daļēji paslēpts aiz Zemes izliekuma", 40, 30);
    } else {
        ctx.fillText("Taizels pilnībā paslēpts aiz Zemes izliekuma", 40, 30);
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
        POV Circle Graphic (state‑driven, correct sea layering)
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

    /* ---------------------------------------------------------
    SHIP POSITIONING LOGIC (strictly by state)
    --------------------------------------------------------- */

    // screen‑space anchors (with your +5px offset)
    const topScreenY    = circleY + 5 - circleRadius / 2;   // halfway to top
    const bottomScreenY = circleY + circleRadius / 2;       // halfway to bottom

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
    DRAW SEA + SHIP WITH CORRECT LAYERING
    --------------------------------------------------------- */

    // ⭐ VISIBLE STATE — SEA FIRST, SHIP ON TOP
    if (state === "visible") {
        // draw sea first
        ctx.fillStyle = "#3366aa";
        ctx.fillRect(circleX - circleRadius, horizonScreenY, circleDiameterPx, circleDiameterPx);

        // draw ship on top
        if (shipScreenY !== null && shipVisibleImg.complete) {
            ctx.drawImage(
                shipVisibleImg,
                circleX - 40,
                shipScreenY - 40,
                80,
                80
            );
        }
    }

    // ⭐ PARTIAL STATE — SHIP FIRST, SEA ON TOP (obscures ship)
    else if (state === "partial") {
        // draw ship first
        if (shipScreenY !== null && shipVisibleImg.complete) {
            ctx.drawImage(
                shipVisibleImg,
                circleX - 40,
                shipScreenY - 40,
                80,
                80
            );
        }

        // draw sea on top (covers descending ship)
        ctx.fillStyle = "#3366aa";
        ctx.fillRect(circleX - circleRadius, horizonScreenY, circleDiameterPx, circleDiameterPx);
    }

    // ⭐ INVISIBLE STATE — only draw sea
    else {
        ctx.fillStyle = "#3366aa";
        ctx.fillRect(circleX - circleRadius, horizonScreenY, circleDiameterPx, circleDiameterPx);
    }
    /* ---------------------------------------------------------
        SECOND POV CIRCLE (fixed distance + fixed lighthouse height)
    --------------------------------------------------------- */

    // fixed parameters
    const pov2_distance_m = 35000;   // 35 km
    const pov2_lighthouse_h = 57;    // 57 m lighthouse height

    // compute curvature drop and hidden height
    const pov2_drop_m = (pov2_distance_m ** 2) / (2 * R);
    const pov2_hiddenHeight = pov2_drop_m - observer_h;

    // determine visibility state (same logic)
    let pov2_state;
    if (pov2_hiddenHeight <= 0) pov2_state = "visible";
    else if (pov2_hiddenHeight >= pov2_lighthouse_h) pov2_state = "invisible";
    else pov2_state = "partial";

    // POV circle geometry (bottom center)
    const pov2_circleDiameterPx = 200;
    const pov2_circleRadius = pov2_circleDiameterPx / 2;
    const pov2_circleX = canvas.width / 2;
    const pov2_circleY = canvas.height - 150;   // bottom center

    // draw circle border
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pov2_circleX, pov2_circleY, pov2_circleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // clip drawing to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(pov2_circleX, pov2_circleY, pov2_circleRadius, 0, Math.PI * 2);
    ctx.clip();

    // draw sky
    ctx.fillStyle = "#88b0ff";
    ctx.fillRect(
        pov2_circleX - pov2_circleRadius,
        pov2_circleY - pov2_circleRadius,
        pov2_circleDiameterPx,
        pov2_circleDiameterPx
    );

    // horizon always in middle
    const pov2_horizonScreenY = pov2_circleY;

    /* ---------------------------------------------------------
    LIGHTHOUSE POSITIONING LOGIC (same as first POV)
    --------------------------------------------------------- */

    const pov2_topScreenY    = pov2_circleY + 5 - pov2_circleRadius / 2;
    const pov2_bottomScreenY = pov2_circleY + pov2_circleRadius / 2;

    let pov2_lighthouseScreenY = null;

    // VISIBLE: bottom → top
    if (pov2_state === "visible") {
        const pov2_horizon_m = Math.sqrt(2 * R * observer_h);
        const pov2_ratio = Math.min(pov2_distance_m / pov2_horizon_m, 1);
        pov2_lighthouseScreenY = pov2_bottomScreenY - pov2_ratio * (pov2_bottomScreenY - pov2_topScreenY);
    }

    // PARTIAL: top → bottom
    else if (pov2_state === "partial") {
        const pov2_ratio = Math.min(Math.max(pov2_hiddenHeight / pov2_lighthouse_h, 0), 1);
        pov2_lighthouseScreenY = pov2_topScreenY + pov2_ratio * (pov2_bottomScreenY - pov2_topScreenY);
    }

    // INVISIBLE: no lighthouse
    else {
        pov2_lighthouseScreenY = null;
    }

    /* ---------------------------------------------------------
    DRAW SEA + LIGHTHOUSE WITH CORRECT LAYERING
    --------------------------------------------------------- */

    // VISIBLE — sea first, lighthouse on top
    if (pov2_state === "visible") {
        ctx.fillStyle = "#3366aa";
        ctx.fillRect(
            pov2_circleX - pov2_circleRadius,
            pov2_horizonScreenY,
            pov2_circleDiameterPx,
            pov2_circleDiameterPx
        );

        if (pov2_lighthouseScreenY !== null && lighthouseImg.complete) {
            ctx.drawImage(
                lighthouseImg,
                pov2_circleX - 40,
                pov2_lighthouseScreenY - 40,
                80,
                80
            );
        }
    }

    // PARTIAL — lighthouse first, sea covers it
    else if (pov2_state === "partial") {
        if (pov2_lighthouseScreenY !== null && lighthouseImg.complete) {
            ctx.drawImage(
                lighthouseImg,
                pov2_circleX - 40,
                pov2_lighthouseScreenY - 40,
                80,
                80
            );
        }

        ctx.fillStyle = "#3366aa";
        ctx.fillRect(
            pov2_circleX - pov2_circleRadius,
            pov2_horizonScreenY,
            pov2_circleDiameterPx,
            pov2_circleDiameterPx
        );
    }

    // INVISIBLE — only sea
    else {
        ctx.fillStyle = "#3366aa";
        ctx.fillRect(
            pov2_circleX - pov2_circleRadius,
            pov2_horizonScreenY,
            pov2_circleDiameterPx,
            pov2_circleDiameterPx
        );
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
