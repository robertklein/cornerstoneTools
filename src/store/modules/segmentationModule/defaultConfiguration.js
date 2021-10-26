import ARRAY_TYPES from './arrayTypes';

const { UINT_8_ARRAY } = ARRAY_TYPES;

// Segmentation module configuration.
const defaultConfiguration = {
  renderOutline: true,
  renderFill: true,
  shouldRenderInactiveLabelmaps: true,
  radius: 10,
  minRadius: 1,
  maxRadius: 50,
  fillAlpha: 0.2,
  fillAlphaInactive: 0.1,
  outlineAlpha: 0.7,
  outlineAlphaInactive: 0.35,
  outlineWidth: 3,
  storeHistory: true,
  segmentsPerLabelmap: 256, // Max is 65535 due to using 16-bit Unsigned ints.
  arrayType: UINT_8_ARRAY,
};

export default defaultConfiguration;
