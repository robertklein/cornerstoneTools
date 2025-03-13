import external from './../../externalModules.js';
import EVENTS from '../../events.js';
import { BaseBrushTool } from '../base';
import { getModule } from './../../store/index.js';
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
export default class BrushTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'Brush',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {},
      mixins: ['renderBrushMixin'],
    };

    super(props, defaultProps);

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

    const radius = configuration.radius;

    const s = segmentationModule;
    if (typeof s.bras === 'undefined')
      s.bras = { radius: null, scale: null, stack: [] };

    const viewport = external.cornerstone.getViewport(element);
    const { scale, translation } = viewport;
    const xy = external.cornerstone.pixelToCanvas(element, { x, y });
    const ctx = element.firstChild.getContext('2d');
    ctx.beginPath();
    ctx.strokeStyle = '#b3ff00';
    ctx.arc(xy.x, xy.y, radius * scale, 0, 2 * Math.PI);
    ctx.stroke();

    s.bras.radius = radius;
    s.bras.scale = scale;
    s.bras.stack.push({ x, y });
  }

  _endPainting(evt) {
    // const { configuration } = segmentationModule;
    const eventData = evt.detail;
    // const element = eventData.element;
    const {
      rows,
      columns,
      columnPixelSpacing,
      rowPixelSpacing,
    } = eventData.image;
    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;
    const s = segmentationModule;
    try {
      const indo = {
        items: [],
        perPage: 1000,
        reset() {
          while (this.items > 0) this.items.pop();
          for (let i = 0; i < columns; i++) {
            this.items.push([]);
          }
        },
        addUnique(x, y) {
          if (!this.items[x].includes(y)) this.items[x].push(y);
        },
      };
      const cindo = {
        items: [],
        perPage: 1000,
        ignored: 0,
        ignoreAdj: 1,
        reset() {
          while (this.items > 0) this.items.pop();
          for (let i = 0; i < columns; i++) {
            this.items.push([]);
          }
        },
        addUnique(x, y) {
          x = Math.floor(/*round*/ x);
          y = Math.floor(/*round*/ y);
          let included = false;
          for (
            let i = Math.max(0, x - this.ignoreAdj);
            i < Math.min(columns - 1, x + this.ignoreAdj);
            i++
          ) {
            for (
              let j = Math.max(0, y - this.ignoreAdj);
              j < Math.min(rows - 1, y + this.ignoreAdj);
              j++
            ) {
              if (this.items[i].includes(j)) {
                included = true;
                break;
              }
            }
          }
          if (!included) {
            this.items[x].push(y);
            return true;
          }
          this.ignored++;
          return false;
        },
        getTotal() {
          let c = 0;
          for (let o of this.items) {
            c += o.length;
          }
          return c;
        },
        getLine(px, py, cx, cy) {
          // DDA
          let dx = cx - px;
          let dy = cy - py;

          let step;
          if (Math.abs(dx) >= Math.abs(dy)) {
            step = Math.abs(dx);
          } else {
            step = Math.abs(dy);
          }

          dx = dx / step;
          dy = dy / step;

          let x = px;
          let y = py;
          let i = 0;
          const intCircles = [];

          while (i <= step) {
            intCircles.push([Math.floor(x), Math.floor(y)]);
            x = x + dx;
            y = y + dy;
            i = i + 1;
          }

          return intCircles;
        },
      };

      const timing = [];
      if (typeof s.bras !== 'undefined') {
        timing.push(Date.now());
        cindo.reset();
        indo.reset();
        const merge2 = [];
        let path = [];
        for (let i = 0; i < s.bras.stack.length; ++i) {
          if (i < 1) {
            const first = s.bras.stack[0];
            path.push([[first.x, first.y]]);

            continue;
          }

          const to = s.bras.stack[i];
          const from = s.bras.stack[i - 1];

          path.push(cindo.getLine(from.x, from.y, to.x, to.y));
        }

        for (let segment of path) {
          for (let point of segment) {
            const x = point[0];
            const y = point[1];
            const xi = Math.floor(x);
            const yi = Math.floor(y);
            const pointerArray = getEllipse(
              s.bras.radius,
              rows,
              columns,
              x,
              y,
              columnPixelSpacing,
              rowPixelSpacing
            );

            for (let p of pointerArray) {
              if (p[0] >= 0 && p[0] < columns && p[1] >= 0 && p[1] < rows) {
                indo.addUnique(p[0], p[1]);
              }
            }

            if (x >= 0 && x < columns && y >= 0 && y < rows) {
              try {
                indo.addUnique(xi, yi);
              } catch (e) {
                console.log(point, x, y);
              }
            }
          }
        }

        for (let x in indo.items) {
          const xint = parseInt(x);
          for (let y of indo.items[x]) {
            merge2.push([xint, y]);
          }
        }
        // timing.push(Date.now());
        let changedData = [];
        const previousData = labelmap2D.pixelData.slice();

        drawBrushPixels(
          merge2,
          labelmap2D.pixelData,
          labelmap3D.activeSegmentIndex,
          columns,
          shouldErase,
          changedData
        );
        external.cornerstone.triggerEvent(
          evt.detail.element,
          EVENTS.SEGMENTATION_CHANGED,
          {
            changedData,
            shouldErase,
            previousData,
            currentData: labelmap2D.pixelData,
          }
        );
        external.cornerstone.updateImage(evt.detail.element);
        // timing.push(Date.now());

        // console.log(timing[2] - timing[0], timing[2] - timing[1]);
        // console.log(
        //   merge2,
        //   `cindo total: ${cindo.getTotal()}, ignored: ${cindo.ignored}`
        // );
      }
    } catch (exc) {
      console.log(exc);
    } finally {
      s.bras = { radius: null, scale: null, stack: [] };
    }
  }
}
