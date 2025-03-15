export function calculateDistance(pointA, pointB) {
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function calculateAngle(pointA, pointB) {
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    return Math.atan2(dy, dx);
}

export function normalizeVector(vector) {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    return {
        x: vector.x / length,
        y: vector.y / length
    };
}

export function scaleVector(vector, scale) {
    return {
        x: vector.x * scale,
        y: vector.y * scale
    };
}