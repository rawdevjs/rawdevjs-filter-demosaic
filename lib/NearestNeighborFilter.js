'use strict'

const clamp = require('lodash/clamp')
const DemosaicMath = require('./Math')
const Image = require('rawdevjs-image')

class NearestNeighborFilter {
  constructor (options) {
    this.label = 'nearest neighbor demosaicing'
    this.inPlace = false
    this.dirty = true

    if (options) {
      for (let option in options) {
        this[option] = options[option]
      }
    }

    this.rgbImageOptions = this.rgbImageOptions || Image.Types.RGB48
  }

  prepareParameters (image) {
    let activeArea = image.properties.activeArea || [0, 0, image.height, image.width]
    let rgbImage = new Image(this.rgbImageOptions, {
      width: activeArea[3] - activeArea[1],
      height: activeArea[2] - activeArea[0]
    })
    let defaultCropOrigin = image.properties.defaultCropOrigin || [0, 0]
    let defaultCropSize = image.properties.defaultCropSize || [rgbImage.width, rgbImage.height]
    let firstRed = DemosaicMath.firstRed(image.properties)
    let blackLevel = DemosaicMath.averageBlackLevel(image.properties)
    let whiteLevel = image.properties.whiteLevel || image.componentMaxValue
    let scale = (rgbImage.componentMaxValue / (whiteLevel - blackLevel)) * (1 + (image.properties.baselineExposure || 0))

    return {
      rgbImage: rgbImage,
      rgbBufferType: rgbImage.BufferType,
      activeAreaX: activeArea[1],
      activeAreaY: activeArea[0],
      activeAreaWidth: activeArea[3],
      activeAreaHeight: activeArea[2],
      cropX: defaultCropOrigin[0],
      cropY: defaultCropOrigin[1],
      cropWidth: defaultCropSize[0],
      cropHeight: defaultCropSize[1],
      firstRed: firstRed,
      blackLevel: blackLevel,
      whiteLevel: whiteLevel,
      scale: scale
    }
  }

  process (image) {
    let parameters = this.prepareParameters(image)

    // TODO: four loops for unsave data

    let rgbBuffer = this.processTile(
      0,
      parameters.rgbImage.height,
      parameters.rgbImage.width,
      image.buffer.subarray(parameters.activeAreaX + parameters.activeAreaY * image.bufferWidth),
      image.bufferWidth,
      parameters.rgbBufferType,
      parameters.rgbImage.components.length,
      parameters.rgbImage.bufferWidth,
      parameters.firstRed,
      parameters.blackLevel,
      parameters.scale)

    parameters.rgbImage.buffer.set(rgbBuffer)

    parameters.rgbImage.width = parameters.cropWidth
    parameters.rgbImage.height = parameters.cropHeight
    parameters.rgbImage.bufferOffsetX = parameters.cropX
    parameters.rgbImage.bufferOffsetY = parameters.cropY

    return Promise.resolve(parameters.rgbImage)
  }

  processTile (offset, height, width, bayerBuffer, bayerSliceLength, RgbBufferType, rgbComponentLength, rgbSliceLength, firstRed, blackLevel, scale) {
    let rgbBuffer = new RgbBufferType(height * rgbSliceLength * rgbComponentLength)

    let getPixel = (x, y) => {
      return clamp((bayerBuffer[y * bayerSliceLength + x] - blackLevel) * scale, 0, 65535)
    }

    let setPixel = (offset, r, g, b) => {
      rgbBuffer[offset] = r
      rgbBuffer[offset + 1] = g
      rgbBuffer[offset + 2] = b
    }

    let processPixel = (x, y, offset) => {
      let modX = (x + firstRed.x) & 1
      let modY = (y + firstRed.y) & 1

      if (modX) {
        if (modY) {
          setPixel(offset, getPixel(x - 1, y - 1), getPixel(x - 1, y), getPixel(x, y))
        } else {
          setPixel(offset, getPixel(x - 1, y), getPixel(x, y), getPixel(x, y - 1))
        }
      } else {
        if (modY) {
          setPixel(offset, getPixel(x, y - 1), getPixel(x, y), getPixel(x - 1, y))
        } else {
          setPixel(offset, getPixel(x, y), getPixel(x - 1, y), getPixel(x - 1, y - 1))
        }
      }
    }

    for (let y = 0; y < height; y++) {
      let rgbOffset = y * rgbSliceLength * rgbComponentLength

      for (let x = 0; x < width; x++) {
        processPixel(x, offset + y, rgbOffset + x * rgbComponentLength)
      }
    }

    return rgbBuffer
  }
}

module.exports = NearestNeighborFilter
