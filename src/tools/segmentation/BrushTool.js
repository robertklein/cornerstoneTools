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

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    // const pointerArray = getEllipse(
    //   radius,
    //   rows,
    //   columns,
    //   x,
    //   y,
    //   columnPixelSpacing,
    //   rowPixelSpacing
    // );
    // const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;
    // // Draw / Erase the active color.
    // drawBrushPixels(
    //   pointerArray,
    //   labelmap2D.pixelData,
    //   labelmap3D.activeSegmentIndex,
    //   columns,
    //   shouldErase
    // );
    // external.cornerstone.updateImage(evt.detail.element);

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
          x = Math.round(x);
          y = Math.round(y);
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
          // if (!this.items[x].includes(y)) {
          //   this.items[x].push(y);
          //   return true;
          // }
          // this.ignored++;
          // return false;
        },
        getTotal() {
          let c = 0;
          for (let o of this.items) {
            c += o.length;
          }
          return c;
        },
        fill(px, py, cx, cy) {
          const dx = cx - px;
          const dy = cy - py;
          const sq = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
          const step = s.bras.radius / 2;
          const intCircles = [];
          if (sq > step) {
            const cntSteps = Math.floor(sq / step);
            for (let i = 1; i < cntSteps + 1; i++) {
              const itp = i / (cntSteps + 1);
              const idx = itp * dx;
              const idy = itp * dy;
              intCircles.push([px + idx, py + idy]);
            }
          }
          // console.log(px, py, cx, cy, sq, step, intCircles);
          return intCircles;
        },
      };

      const timing = [];
      if (typeof s.bras !== 'undefined') {
        timing.push(Date.now());
        cindo.reset();
        indo.reset();
        const merge2 = [];
        for (let i in s.bras.stack) {
          const one = s.bras.stack[i];
          if (cindo.addUnique(one.x, one.y)) {
            if (i > 0) {
              const pOne = s.bras.stack[i - 1];
              const interpolatedCircles = cindo.fill(
                pOne.x,
                pOne.y,
                one.x,
                one.y
              );
              for (let ic of interpolatedCircles) {
                // const pointerArray = getCircle(
                //   s.bras.radius,
                //   rows,
                //   columns,
                //   ic[0],
                //   ic[1]
                // );
                const pointerArray = getEllipse(
                  s.bras.radius,
                  rows,
                  columns,
                  ic[0],
                  ic[1],
                  columnPixelSpacing,
                  rowPixelSpacing
                );
                for (let j of pointerArray) {
                  indo.addUnique(j[0], j[1]);
                }
              }
              // return false;
            }
            // const pointerArray = getCircle(
            //   s.bras.radius,
            //   rows,
            //   columns,
            //   one.x,
            //   one.y
            // );
            const pointerArray = getEllipse(
              s.bras.radius,
              rows,
              columns,
              one.x,
              one.y,
              columnPixelSpacing,
              rowPixelSpacing
            );
            for (let j of pointerArray) {
              // const index = j[0] + j[1] * columns;
              indo.addUnique(j[0], j[1]);
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

    // _paint(evt) {
    //   const { configuration } = segmentationModule;
    //   const eventData = evt.detail;
    //   const element = eventData.element;
    //   const {
    //     rows,
    //     columns,
    //     columnPixelSpacing,
    //     rowPixelSpacing,
    //   } = eventData.image;
    //   const { x, y } = eventData.currentPoints.image;
    //   if (x < 0 || x > columns || y < 0 || y > rows) {
    //     return;
    //   }
    //   const radius = configuration.radius;
    //   const pointerArray = getEllipse(
    //     radius,
    //     rows,
    //     columns,
    //     x,
    //     y,
    //     columnPixelSpacing,
    //     rowPixelSpacing
    //   );
    //   const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;
    //   // Draw / Erase the active color.
    //   drawBrushPixels(
    //     pointerArray,
    //     labelmap2D.pixelData,
    //     labelmap3D.activeSegmentIndex,
    //     columns,
    //     shouldErase
    //   );
    //   external.cornerstone.updateImage(evt.detail.element);
    // }
  }
}
