import external from '../../externalModules.js';
import { BaseBrushTool } from '../base';

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
    const eventData = evt.detail;
    const element = eventData.element;

    external.cornerstone.triggerEvent(element, 'cornerstonetoolsbrushisland', {
      evt,
    });
  }
}
