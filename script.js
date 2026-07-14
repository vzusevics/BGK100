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

    // Draw Earth curve
    ctx.fillStyle = "#88b0ff";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height + R / 5000, R / 5000, Math.PI, 0);
    ctx.fill();

    // Draw observer (left side)
    ctx.fillStyle = "black";
    ctx.fillRect(50, canvas.height - 100 - observer_h / 10, 10, 100);

    // Draw ship (right side)
    const shipX = canvas.width - 150;
    const shipY = canvas.height - 100 - (hidden < 0 ? 0 : hidden / 10);

    ctx.fillStyle = hidden > 0 ? "gray" : "red"; // gray = hidden, red = visible
    ctx.fillRect(shipX, shipY, 60, 30);

    // Text feedback
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
