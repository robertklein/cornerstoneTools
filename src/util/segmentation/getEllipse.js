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

  if (radius <= 1) {
    return [];
  }

  const circleArray = [];
  let index = 0;

  const wi = Math.ceil(
    Math.min(1, rowPixelSpacing / columnPixelSpacing) * radius
  );
  const hi = Math.ceil(
    Math.min(1, columnPixelSpacing / rowPixelSpacing) * radius
  );

  const r =
    radius *
    (columnPixelSpacing < rowPixelSpacing
      ? columnPixelSpacing
      : rowPixelSpacing);
  const r2 = r * r;

  for (let j = -hi; j <= hi; j++) {
    const yi = y0 + j;

    if (yi > rows || yi < 0) {
      continue;
    }

    for (let i = -wi; i <= wi; i++) {
      const xi = x0 + i;

      if (xi >= columns || xi < 0) {
        continue;
      }

      const x = (xi + 0.5 - xCoord) * columnPixelSpacing;
      const y = (yi + 0.5 - yCoord) * rowPixelSpacing;
      const h2 = x * x + y * y;

      if (h2 < r2) {
        circleArray[index++] = [xi, yi];
      }
    }
  }

  return circleArray;
}
