/**
 * Gets the pixels within the circle.
 * @export @public @method
 * @name getCircle
 *
 * @param  {number} radius     The radius of the circle.
 * @param  {number} rows       The number of rows.
 * @param  {number} columns    The number of columns.
 * @param  {number} [xCoord = 0] The x-location of the center of the circle.
 * @param  {number} [yCoord = 0] The y-location of the center of the circle.
 * @returns {Array.number[]}        Array of pixels contained within the circle.
 */
export default function getCircle(
  radius,
  rows,
  columns,
  xCoord = 0,
  yCoord = 0,
  columnPixelSpacing = 1,
  rowPixelSpacing = 1
) {
  const x0 = Math.floor(xCoord);
  const y0 = Math.floor(yCoord);

  if (radius === 1) {
    return [[x0, y0]];
  }

  const circleArray = [];
  let index = 0;

  const rx = Math.round(
    Math.min(1, rowPixelSpacing / columnPixelSpacing) * radius
  );
  const ry = Math.round(
    Math.min(1, columnPixelSpacing / rowPixelSpacing) * radius
  );

  console.log(radius, rx, ry);

  for (let y = -ry; y <= ry; y++) {
    const yCoord = y0 + y;

    if (yCoord > rows || yCoord < 0) {
      continue;
    }

    for (let x = -rx; x <= rx; x++) {
      const xCoord = x0 + x;

      if (xCoord >= columns || xCoord <= 0) {
        continue;
      }
      const res = ry * ry * x * x + rx * rx * y * y - rx * rx * ry * ry;

      if (res < 0) {
        circleArray[index++] = [x0 + x, y0 + y];
      }
    }
  }

  return circleArray;
}
