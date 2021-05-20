import './index.css'
import ScratchCard from '../../src'

window.onload = function () {
  const pureMaskScratchCard = new ScratchCard(document.querySelector('.pure-mask-scratch-card-container'), {
    mask: 'red',
    onScratch (percent) {
      document.querySelector('.pure-mask-scratch-card-container .percent-tips').textContent = `已经刮开了${percent}%`
    }
  })
  pureMaskScratchCard.init()

  const imageMaskScratchCard = new ScratchCard(document.querySelector('.image-mask-scratch-card-container'), {
    mask: require('./bg.png'),
    onScratch (percent) {
      document.querySelector('.image-mask-scratch-card-container .percent-tips').textContent = `已经刮开了${percent}%`
    },
    throttleWait: 0
  })
  imageMaskScratchCard.init()

  const bgScratchCard = new ScratchCard(document.querySelector('.bg-scratch-card-container'), {
    mask: require('./mask.png'),
    bg: require('./bg.png'),
    throttleWait: 0
  })
  bgScratchCard.init()

  const maxPercentMaskScratchCard = new ScratchCard(document.querySelector('.maxPercent-scratch-card-container'), {
    mask: require('./bg.png'),
    maxPercent: 10,
    brushSize: 80,
    brushPress: 0.25,
    onScratch (percent) {
      document.querySelector('.maxPercent-scratch-card-container .percent-tips').textContent = `已经刮开了${percent}%`
    }
  })
  maxPercentMaskScratchCard.init()

  const areaMaskScratchCard = new ScratchCard(document.querySelector('.area-scratch-card-container'), {
    mask: require('./bg.png'),
    scratchArea: {
      startX: 350,
      startY: 150,
      areaWidth: 100,
      areaHeight: 100
    },
    brushSize: 80,
    brushPress: 0.25,
    onScratch (percent) {
      document.querySelector('.area-scratch-card-container .percent-tips').textContent = `已经刮开了${percent}%`
    }
  })
  areaMaskScratchCard.init()

  document.querySelectorAll('.btn-toggle-code').forEach(btn => {
    btn.addEventListener('click', function () {
      const demoCode = this.parentNode.querySelector('.demo-code')
      if (demoCode.style.height === '0px' || !demoCode.style.height) {
        demoCode.style.height = `${demoCode.querySelector('.code-wrapper').getBoundingClientRect().height + 40}px`
        this.textContent = '隐藏代码'
      } else {
        demoCode.style.height = 0
        this.textContent = '显示代码'
      }
    })
  })
}
