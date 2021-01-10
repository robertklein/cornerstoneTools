import external from '../../externalModules.js';
import { BaseBrushTool } from '../base';
import { getModule } from '../../store/index.js';
import { drawBrushPixels, getEllipse } from '../../util/segmentation/index.js';
import { getLogger } from '../../util/logger.js';

const logger = getLogger('tools:BrushTool');

const segmentationModule = getModule('segmentation');

/**
 * @public
 * @class BrushTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image.
 * @extends Tools.Base.BaseBrushTool
 */
export default class BrushCanTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'BrushCan',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {},
      mixins: ['renderBrushMixin'],
    };

    super(props, defaultProps);

    /**
     * fill: adjacent | all
     * sample: average
     * slices: single | multi
     */
    this._options = {
      fill: 'adjacent',
      sample: 'average',
      slices: 'single',
      min: null,
      max: null,
    };
    this._calculating = false;
    this.touchDragCallback = this._paint.bind(this);
  }

  /**
   * Paints the data to the labelmap.
   *
   * @protected
   * @param  {Object} evt The data object associated with the event.
   * @returns {void}
   */
  _paint(evt) {
    if (this._calculating) {
      // Console.log('is _calculating');
      return;
    }
    // Console.log('is NOT _calculating');
    this._calculating = true;
    const { configuration } = segmentationModule;
    const eventData = evt.detail;
    const element = eventData.element;
    const {
      rows,
      columns,
      columnPixelSpacing,
      rowPixelSpacing,
    } = eventData.image;
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    let pointerArray = getEllipse(
      radius,
      rows,
      columns,
      x,
      y,
      columnPixelSpacing,
      rowPixelSpacing
    );
    const pixelData = eventData.image.getPixelData();

    const positive = [],
      negative = [],
      stat = [];
    let allowedMin = null,
      allowedMax = null,
      sum = 0,
      median = 0,
      average = 0,
      adjacent = [],
      lastLoop = [];
    const getPixelIndex = (x, y) => y * columns + x;
    const setPixelCoords = i => [i % columns, Math.floor(i / columns)];

    for (let i = 0; i < pointerArray.length; i++) {
      const idx = getPixelIndex(pointerArray[i][0], pointerArray[i][1]);

      const val = pixelData[idx];

      adjacent.push(idx);

      stat[i] = val;
      sum += val;
      if (allowedMin === null) {
        allowedMin = val;
      } else {
        allowedMin = Math.min(val, allowedMin);
      }
      if (allowedMax === null) {
        allowedMax = val;
      } else {
        allowedMax = Math.max(val, allowedMax);
      }
    }
    if (this._options.min !== null) {
      allowedMin = this._options.min;
    }
    if (this._options.max !== null) {
      allowedMax = this._options.max;
    }
    if (pointerArray.length) {
      average = sum / pointerArray.length;
    }
    median = this.median(stat);
    console.log(stat);
    console.log(`Min: ${allowedMin}`);
    console.log(`Max: ${allowedMax}`);
    console.log(`Avg: ${average}`);
    console.log(`Median: ${median}`);

    pointerArray = [];
    let q = 0;

    while (q < 512 && adjacent.length) {
      q++;
      lastLoop = [];
      for (let i = 0; i < adjacent.length; i++) {
        if (
          pixelData[adjacent[i]] >= allowedMin &&
          pixelData[adjacent[i]] <= allowedMax
        ) {
          positive.push(adjacent[i]);
          lastLoop.push(adjacent[i]);
        } else {
          negative.push(adjacent[i]);
        }
      }
      adjacent = [];
      for (let i = 0; i < lastLoop.length; i++) {
        const crd = setPixelCoords(lastLoop[i]);
        const coords = [];
        let tmpCoord = null;

        // Top
        tmpCoord = [crd[0], crd[1] - 1];
        if (tmpCoord[1] >= 0 && tmpCoord[1] < rows) {
          coords.push(getPixelIndex(tmpCoord[0], tmpCoord[1]));
        }
        // Right
        tmpCoord = [crd[0] + 1, crd[1]];
        if (tmpCoord[0] >= 0 && tmpCoord[0] < columns) {
          coords.push(getPixelIndex(tmpCoord[0], tmpCoord[1]));
        }
        // Bottom
        tmpCoord = [crd[0], crd[1] + 1];
        if (tmpCoord[1] >= 0 && tmpCoord[1] < rows) {
          coords.push(getPixelIndex(tmpCoord[0], tmpCoord[1]));
        }
        // Left
        tmpCoord = [crd[0] - 1, crd[1]];
        if (tmpCoord[0] >= 0 && tmpCoord[0] < columns) {
          coords.push(getPixelIndex(tmpCoord[0], tmpCoord[1]));
        }
        for (let j = 0; j < coords.length; j++) {
          if (
            positive.indexOf(coords[j]) === -1 &&
            negative.indexOf(coords[j]) === -1 &&
            lastLoop.indexOf(coords[j]) === -1 &&
            adjacent.indexOf(coords[j]) === -1
          ) {
            adjacent.push(coords[j]);
          }
        }
      }
    }
    for (let i = 0; i < positive.length; i++) {
      pointerArray.push(setPixelCoords(positive[i]));
    }

    // For (let i = 0; i < pixelData.length; i++) {
    //   if (pixelData[i] >= allowedMin && pixelData[i] <= allowedMax) {
    //     pointerArray.push(setPixelCoords(i));
    //   }
    // }

    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;

    // Draw / Erase the active color.
    drawBrushPixels(
      pointerArray,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      columns,
      shouldErase
    );

    external.cornerstone.updateImage(evt.detail.element);
    setTimeout(() => {
      this._calculating = false;
    }, 500);
  }

  median(values) {
    if (values.length === 0) {
      return 0;
    }

    values.sort(function(a, b) {
      return a - b;
    });
    const half = Math.floor(values.length / 2);

    if (values.length % 2) {
      return values[half];
    }

    return (values[half - 1] + values[half]) / 2.0;
  }
}
