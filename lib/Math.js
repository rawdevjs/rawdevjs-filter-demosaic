'use strict'

class DemosaicMath {
  static firstRed (tags) {
    let x = 0
    let y = 0

    for (let iy = 0; iy < tags.cfaRepeatPatternDim[0]; iy++) {
      for (let ix = 0; ix < tags.cfaRepeatPatternDim[1]; ix++) {
        if (tags.cfaPattern[iy * tags.cfaRepeatPatternDim[1] + ix] === 0) {
          x = ix
          y = iy
        }
      }
    }

    x = x % tags.cfaRepeatPatternDim[1]
    y = y % tags.cfaRepeatPatternDim[0]

    return {
      x: x,
      y: y
    }
  }

  static averageBlackLevel (tags) {
    let blackLevel = 0.0

    if (tags.blackLevel) {
      let value = 0.0

      for (let i = 0; i < tags.blackLevel.length; i++) {
        value += tags.blackLevel[i]
      }

      blackLevel += value / tags.blackLevel.length
    }

    if (tags.blackLevelDeltaH) {
      let value = 0.0

      for (let i = 0; i < tags.blackLevelDeltaH.length; i++) {
        value += tags.blackLevelDeltaH[i]
      }

      blackLevel += value / tags.blackLevelDeltaH.length
    }

    if (tags.blackLevelDeltaV) {
      let value = 0.0

      for (let i = 0; i < tags.blackLevelDeltaV.length; i++) {
        value += tags.blackLevelDeltaV[i]
      }

      blackLevel += value / tags.blackLevelDeltaV.length
    }

    return blackLevel
  }
}

module.exports = DemosaicMath
