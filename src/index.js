import throttle from 'lodash.throttle'
import cloneDeep from 'lodash/fp/cloneDeep'

const defaultConfig = {
  bg: null,
  mask: '#ccc',
  scratchArea: {
    startX: 0,
    startY: 0,
    areaWith: 0,
    areaHeight: 0
  },
  width: null,
  height: null,
  brushSize: 25,
  brushPress: 1,
  maxPercent: 100,
  onCreated: null,
  onScratch: null,
  throttleWait: 0,
  onEnd: null
}

function ScratchCard (container, config) {
  const _config = Object.assign({}, defaultConfig, config)
  this.container = container
  this.bg = _config.bg
  this.bgCanvas = null
  this.bgCtx = null
  this.mask = _config.mask
  this.maskCanvas = null
  this.maskCtx = null
  this.width = _config.width
  this.height = _config.height
  this.containerRect = null
  this.brushSize = _config.brushSize
  this.brushPress = _config.brushPress
  this.scratchedPercent = 0
  this.maxPercent = _config.maxPercent
  this.scratchArea = cloneDeep(_config.scratchArea)
  this.onCreated = _config.onCreated
  this.onScratch = typeof _config.onScratch === 'function'
    ? (x, y) => {
      _config.onScratch(this.scratchedPercent)
    }
    : null
  this.throttleWait = _config.throttleWait

  this.onEnd = typeof _config.onEnd === 'function'
    ? (percent) => {
      _config.onEnd(percent)
    }
    : null
}

ScratchCard.prototype = {
  init () {
    this.bgCanvas && this.container.removeChild(this.bgCanvas)
    this.bgCanvas = null
    this.bgCtx = null
    this.maskCanvas && this.container.removeChild(this.maskCanvas)
    this.maskCanvas = null
    this.maskCtx = null
    this.containerRect = this.container
      ? this.container.getBoundingClientRect()
      : { top: 0, left: 0, width: 300, height: 150 }
    this.width = this.width || this.containerRect.width
    this.height = this.height || this.containerRect.height
    Promise.all([this.drawBg(), this.drawMask()])
      .then(() => {
        this.initPixelspixelsDataStore()
        this.bindEvents()
        this.bgCanvas && this.container.appendChild(this.bgCanvas)
        this.maskCanvas && this.container.appendChild(this.maskCanvas)
        this.onCreated && this.onCreated()
        this.scratchArea.areaWith = this.scratchArea.areaWith || this.width
        this.scratchArea.areaHeight = this.scratchArea.areaHeight || this.height
      })
      .catch(err => {
        throw err
      })
  },

  loadImage (src) {
    return new Promise(resolve => {
      const image = new Image()
      image.src = src
      if (image.complete) {
        resolve(image)
      } else {
        image.onload = () => {
          resolve(image)
        }
      }
    })
  },

  drawBg () {
    return new Promise(resolve => {
      if (!this.bg) {
        resolve()
        return true
      }
      this.bgCanvas = this.bgCanvas || document.createElement('canvas')
      this.bgCtx = this.bgCtx || this.bgCanvas.getContext('2d')
      // this.bgCanvas.style = 'position: absolute; top: 0; left: 0;' // cause error in ie because of strict mode
      // this.bgCanvas.style.position = 'absolute'
      // this.bgCanvas.style.top = 0
      // this.bgCanvas.style.left = 0
      this.bgCanvas.style.zIndex = 1
      this.resetCanvas(this.bgCanvas, this.width, this.height)

      this.loadImage(this.bg).then(image => {
        this.bgCtx.drawImage(image, 0, 0, this.width, this.height)
        resolve()
      })
    })
  },

  drawMask () {
    return new Promise(resolve => {
      this.maskCanvas = this.maskCanvas || document.createElement('canvas')
      this.maskCtx = this.maskCtx || this.maskCanvas.getContext('2d')
      // this.maskCanvas.style = 'position: absolute; top: 0; left: 0;' // cause error in ie because of strict mode
      // this.maskCanvas.style.position = 'absolute'
      // this.maskCanvas.style.top = 0
      // this.maskCanvas.style.left = 0
      this.maskCanvas.style.zIndex = 2
      this.resetCanvas(this.maskCanvas, this.width, this.height)

      if (!/\.(jpg|png|gif|jpeg|bmp)/.test(this.mask)) {
        this.maskCtx.fillStyle = this.mask
        this.maskCtx.fillRect(0, 0, this.width, this.height)
        this.maskCtx.globalCompositeOperation = 'destination-out'
        resolve()
      } else {
        this.loadImage(this.mask).then(image => {
          this.scale = image.width / this.width
          this.scratchArea.startX /= this.scale
          this.scratchArea.startY /= this.scale
          this.scratchArea.areaWith /= this.scale
          this.scratchArea.areaHeight /= this.scale

          this.maskCtx.drawImage(image, 0, 0, this.width, this.height)
          // 可视化可刮区域
          // this.maskCtx.fillStyle = "red"
          // this.maskCtx.fillRect(this.scratchArea.startX, this.scratchArea.startY, this.scratchArea.areaWith,this.scratchArea.areaHeight)
          this.maskCtx.globalCompositeOperation = 'destination-out'
          resolve()
        })
      }
    })
  },

  resetCanvas (canvas, width, height) {
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').clearRect(0, 0, width, height)
  },

  initPixelspixelsDataStore () {
    const imageData = this.maskCtx.getImageData(0, 0, this.width, this.height)
    const pixelsData = imageData.data
    this.totalPixelsNum = pixelsData.length / 4
    const scratchedPixels = []
    for (let i = 0, j = pixelsData.length; i < j; i += 4) {
      const alpha = pixelsData[i + 3]
      if (alpha < 128) {
        scratchedPixels.push(i)
      }
    }
    this.scratchedPixelsNum = scratchedPixels.length
  },

  bindEvents () {
    const isMobile = (/android|iphone|ipad|ipod|windows phone|symbianos/i.test(navigator.userAgent.toLowerCase()))
    const startScratchEventName = isMobile ? 'touchstart' : 'mousedown'
    const scratchingEventName = isMobile ? 'touchmove' : 'mousemove'
    const endScratchEventName = isMobile ? 'touchend' : 'mouseup'
    let isScratching = false
    let isComplete = false
    this.maskCanvas.addEventListener(startScratchEventName, throttle(e => {
      isScratching = true
      const scratchCoords = this.getScratchCoords(e)
      const isScratchable = scratchCoords.x > this.scratchArea.startX + this.brushSize && scratchCoords.x < this.scratchArea.startX + this.scratchArea.areaWith - this.brushSize &&
      scratchCoords.y > this.scratchArea.startY + this.brushSize && scratchCoords.y < this.scratchArea.startY + this.scratchArea.areaHeight - this.brushSize
      if (isScratchable) this.scratch(scratchCoords.x, scratchCoords.y)
      else this.storePixelsData(scratchCoords.x, scratchCoords.y)
    }, this.throttleWait), false)
    this.maskCanvas.addEventListener(scratchingEventName, throttle(e => {
      if (!isScratching) return false
      e.preventDefault()
      const scratchCoords = this.getScratchCoords(e)
      const isScratchable = scratchCoords.x > this.scratchArea.startX && scratchCoords.x < this.scratchArea.startX + this.scratchArea.areaWith &&
      scratchCoords.y > this.scratchArea.startY && scratchCoords.y < this.scratchArea.startY + this.scratchArea.areaHeight
      if (isScratchable) this.scratch(scratchCoords.x, scratchCoords.y)
    }, this.throttleWait), false)
    document.addEventListener(endScratchEventName, throttle(e => {
      if (isComplete) return
      // 计算已经刮掉的面积
      if (this.scratchedPercent >= this.maxPercent) {
        this.maskCanvas.getContext('2d').clearRect(0, 0, this.width, this.height)
        this.onEnd && this.onEnd(this.scratchedPercent)
        isComplete = true
      }
      isScratching = false
    }, this.throttleWait), false)
  },

  getScratchCoords (e) {
    this.containerRect = this.container.getBoundingClientRect()
    const eventClientX = typeof e.clientX === 'number' ? e.clientX : e.touches[0].clientX
    const x = eventClientX - this.containerRect.left
    const eventClientY = typeof e.clientY === 'number' ? e.clientY : e.touches[0].clientY
    const y = eventClientY - this.containerRect.top
    return { x, y }
  },

  scratch (x, y) {
    this.storePixelsData(x, y)
    this.maskCtx.beginPath()
    const scratchBrush = this.maskCtx.createRadialGradient(x, y, 0, x, y, this.brushSize)
    scratchBrush.addColorStop(0, `rgba(0, 0, 0, ${this.brushPress})`)
    scratchBrush.addColorStop(1, `rgba(0, 0, 0, 0)`)
    this.maskCtx.fillStyle = scratchBrush
    this.maskCtx.arc(x, y, this.brushSize, 0, Math.PI * 2)
    this.maskCtx.fill()

    const ratioScratchable = (this.scratchArea.areaWith * this.scratchArea.areaHeight) / (this.width * this.height)
    this.scratchedPercent = (this.getScratchedPercent(x, y) / ratioScratchable).toFixed(2)
    this.onScratch && this.onScratch(x, y)
  },

  storePixelsData (x, y) {
    const imageData = this.maskCtx.getImageData(
      x - this.brushSize,
      y - this.brushSize,
      this.brushSize * 2,
      this.brushSize * 2
    )
    this.pixelsDataStore = imageData.data
  },

  getScratchedPercent (x, y) {
    const imageData = this.maskCtx.getImageData(
      x - this.brushSize,
      y - this.brushSize,
      this.brushSize * 2,
      this.brushSize * 2
    )
    const pixelsData = imageData.data
    for (let i = 0, j = pixelsData.length; i < j; i += 4) {
      const alpha = pixelsData[i + 3]
      const alphaBefore = this.pixelsDataStore[i + 3]
      if (alphaBefore >= 64 && alpha < 64) {
        this.scratchedPixelsNum++
      }
    }
    return (this.scratchedPixelsNum / this.totalPixelsNum * 100).toFixed(2)
  }
}

export default ScratchCard
