const canvas = document.getElementById("viewport");
const ctx = canvas.getContext("2d");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const R = 6371000; // Earth radius (m)

function computeHiddenHeight(distance_m, observer_h) {
    const drop = (distance_m ** 2) / (2 * R);
    return drop - observer_h;
}

function drawScene(distance_km, observer_h) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const distance_m = distance_km * 1000;
    const hidden = computeHiddenHeight(distance_m, observer_h);

    // Earth curve
    ctx.fillStyle = "#88b0ff";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.quadraticCurveTo(
        canvas.width / 2,
        canvas.height - 80,
        canvas.width,
        canvas.height
    );
    ctx.fill();

    // Observer
    const observerY = canvas.height - 100 - observer_h;
    ctx.fillStyle = "black";
    ctx.fillRect(50, observerY, 10, 100);

    // Ship position (moves left→right)
    const maxDist = 100000; // 100 km
    const shipX = 60 + (distance_m / maxDist) * (canvas.width - 120);
    const shipY = canvas.height - 100 - (hidden < 0 ? 0 : hidden);

    // Ship graphic
    ctx.fillStyle = hidden > 0 ? "gray" : "red";
    ctx.fillRect(shipX, shipY, 60, 30);

    // Line of sight
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, observerY);
    ctx.lineTo(shipX + 30, shipY);
    ctx.stroke();

    // Visibility text
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText(
        hidden > 0 ? "Ship is hidden behind curvature" : "Ship is visible",
        20,
        30
    );
}

function update() {
    const distance = document.getElementById("distanceSlider").value;
    const height = document.getElementById("heightSlider").value;

    // Update text readouts
    document.getElementById("distanceValue").textContent = distance + " km";
    document.getElementById("heightValue").textContent = height + " m";

    drawScene(distance, height);
}

document.getElementById("distanceSlider").addEventListener("input", update);
document.getElementById("heightSlider").addEventListener("input", update);

update();
