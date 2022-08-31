import external from '../../externalModules.js';
import { BaseBrushTool } from '../base';
import { getModule } from '../../store/index.js';
import { getEllipse } from '../../util/segmentation/index.js';

const segmentationModule = getModule('segmentation');

/**
 * @public
 * @class BrushIslandTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image.
 * @extends Tools.Base.BaseBrushTool
 */
export default class BrushIslandTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'BrushIsland',
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
    let pointerArray = getEllipse(
      radius,
      rows,
      columns,
      x,
      y,
      columnPixelSpacing,
      rowPixelSpacing
    );

    external.cornerstone.triggerEvent(element, 'cornerstonetoolsbrushisland', {
      pointerArray,
    });
  }
}
