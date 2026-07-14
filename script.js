const canvas = document.getElementById("viewCanvas");
const ctx = canvas.getContext("2d");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const R = 6371000; // Earth radius in meters
const exaggeration = 10; // vertical exaggeration factor

// Convert distance to curvature drop and map to canvas Y
function earthCurveY(x) {
    const maxDist = 100000; // 100 km in meters
    const distanceRatio = x / canvas.width;
    const dist_m = distanceRatio * maxDist;

    const drop_m = (dist_m ** 2) / (2 * R);
    const curveScale = 0.02; // pixels per meter

    return canvas.height - 100 + drop_m * curveScale * exaggeration;
}

// Draw everything
function drawScene(distance_km, observer_h) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const distance_m = distance_km * 1000;

    // Draw Earth curve
    ctx.fillStyle = "#88b0ff";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);

    for (let x = 0; x <= canvas.width; x += 5) {
        ctx.lineTo(x, earthCurveY(x));
    }

    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // Observer position
    const observerX = 1;
    const observerBaseY = earthCurveY(observerX);
    const observerY = observerBaseY - observer_h;

    ctx.fillStyle = "black";
    ctx.fillRect(observerX - 5, observerY, 10, 100);

    // Ship horizontal position
    const maxDist = 100000;
    const shipX = (distance_m / maxDist) * canvas.width;

    // Ship vertical position (on curve)
    const shipY = earthCurveY(shipX);

    // LOS intersection check
    let hidden = false;
    const losSlope = (shipY - observerY) / (shipX - observerX);

    for (let x = observerX; x < shipX; x += 5) {
        const yLOS = observerY + losSlope * (x - observerX);
        if (earthCurveY(x) < yLOS) {
            hidden = true;
            break;
        }
    }

    // Draw line of sight
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(observerX, observerY);
    ctx.lineTo(shipX, shipY);
    ctx.stroke();

    // Draw ship
    ctx.fillStyle = hidden ? "gray" : "red";
    ctx.fillRect(shipX - 30, shipY - 15, 60, 30);

    // Visibility text
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText(hidden ? "Ship is hidden behind curvature" : "Ship is visible", 20, 30);
}

// Update UI + redraw
function update() {
    const distance = document.getElementById("distanceSlider").value;
    const height = document.getElementById("heightSlider").value;

    document.getElementById("distanceValue").textContent = distance + " km";
    document.getElementById("heightValue").textContent = height + " m";

    drawScene(distance, height);
}

document.getElementById("distanceSlider").oninput = update;
document.getElementById("heightSlider").oninput = update;

window.onload = update;
