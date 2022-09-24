var windowId = null, windowSize = null
window.addEventListener('load', () => {
    let windowResize = null, previousDevicePixelRatio = window.devicePixelRatio
    windowSize = new InputKnob(document.querySelector('#window-size'), 1, .65, 1.25, .05, value => {
        if (windowResize) clearTimeout(windowResize)
        windowResize = setTimeout(() => {
            updateWindow(false, value)
            setTimeout(() => windowResize = null, 500)
        }, 1000)
    }, 2)

    window.addEventListener('resize', () => {
        if (!windowResize && window.devicePixelRatio !== previousDevicePixelRatio) {
            updateWindow()
            previousDevicePixelRatio = window.devicePixelRatio
        }
    })
})

function updateWindow(initialSetup, value) {
    const zoom = Math.round(window.outerWidth / document.documentElement.clientWidth * 100) / 100
    if (value === zoom) value = null
    if (value) document.body.style.zoom = value * (1 / zoom)
    else document.body.style.zoom = ''
    const main = document.querySelector('main'), scale = value || (zoom < 1.25 ? zoom > .65 ? zoom : .65 : 1.25)
    main.style.width = 'auto'
    const width = Math.ceil((document.querySelector('main').clientWidth + 10) * scale), height = Math.ceil((document.body.clientHeight + 40) * scale)
    main.style = ''
    windowSize.update(scale, true)
    if (initialSetup) chrome.windows.update(windowId, { width: width, height: height, top: screen.height - height, left: screen.width - width, focused: true })
    else chrome.windows.update(windowId, { width: width, height: height })
}
function setupCanvas_context_dB(analyser) {
    const canvas_context_db = document.querySelector('#canvas-context-db'), max_dB = analyser.maxDecibels, min_dB = analyser.minDecibels
    canvas_context_db.innerHTML = ''
    let span = document.createElement('span')
    span.innerHTML = `<p class="db">${Math.floor(max_dB)}</p>`
    span.style.top = '0'
    canvas_context_db.appendChild(span)
    for (let i = Math.floor(max_dB - 10); i > Math.floor(min_dB); i -= 10) {
        span = document.createElement('span')
        span.innerHTML = `<p class="db">${i}</p>`
        span.style.top = `${(getPercentage(i, max_dB, min_dB) * 100).toFixed(2)}%`
        canvas_context_db.appendChild(span)
    }
    span = document.createElement('span')
    span.innerHTML = `<p class="db">${Math.floor(min_dB)}</p>`
    span.style.top = '100%'
    canvas_context_db.appendChild(span)
}

function documentSetup(mono_analyser, frequencyData, delay, chromeStorage) {
    const canvas_context_hz = document.querySelector('#canvas-context-hz')
    let span = document.createElement('span')
    span.innerHTML = '<p class="hz">0</p>'
    span.style.left = 0
    canvas_context_hz.appendChild(span)

    frequencyData.forEach(item => {
        span = document.createElement('span')
        const value = { class: item.hz > 999 ? 'khz' : 'hz', hz: item.hz > 999 ? item.hz / 1000 : item.hz }
        span.innerHTML = `<p class="${value.class}">${value.hz}</p>`
        span.style.left = item.w + 'px'
        canvas_context_hz.appendChild(span)
    })

    setupCanvas_context_dB(mono_analyser)
    const meter_values = [0, -1, -2, -3, -5, -10, -20]
    meter_values.forEach(value => {
        const span = document.createElement('span')
        span.innerHTML = `<p class="db">${value}</p>`
        span.style.top = `${100 - (dBFS_to_gain(value) * 100).toFixed(2)}%`
        document.querySelector('#meter-context').appendChild(span)
    })

    const inspector_canvas = document.querySelector('#frequency-inspector'), inspector_ctx = inspector_canvas.getContext('2d')
    inspector_ctx.font = '22px arial'
    let inspector_mouse = null
    inspector_canvas.addEventListener('mouseenter', e => {
        const zoomMultiplier = document.body.style.zoom ? 1 / parseFloat(document.body.style.zoom) : 1
        inspector_mouse = { x: e.offsetX * zoomMultiplier, y: e.offsetY * zoomMultiplier }
        inspector_draw()
    })
    inspector_canvas.addEventListener('mousemove', e => {
        const zoomMultiplier = document.body.style.zoom ? 1 / parseFloat(document.body.style.zoom) : 1
        inspector_mouse = { x: e.offsetX * zoomMultiplier, y: e.offsetY * zoomMultiplier }
        inspector_draw()
    })
    inspector_canvas.addEventListener('mouseleave', () => {
        inspector_mouse = null
        inspector_ctx.clearRect(0, 0, inspector_canvas.width, inspector_canvas.height)
    })
    function inspector_draw() {
        inspector_ctx.clearRect(0, 0, inspector_canvas.width, inspector_canvas.height)
        inspector_ctx.fillStyle = '#fffa'
        inspector_ctx.fillRect(0, inspector_mouse.y - 1, inspector_canvas.width, 2)
        inspector_ctx.fillRect(inspector_mouse.x - 1, 0, 2, inspector_canvas.height)
        let previous_width = 0, previous_hz = 0, next_width = null, next_hz = null
        frequencyData.forEach(item => {
            if (item.w <= inspector_mouse.x) {
                previous_width = item.w
                previous_hz = item.hz
            } else if (!next_width && !next_hz && item.w > inspector_mouse.x) {
                next_width = item.w
                next_hz = item.hz
            }
        })
        const hz = getFrequency_for_width(inspector_mouse.x, next_width, previous_width, next_hz, previous_hz), db = getValue_for_percentage(inspector_mouse.y / inspector_canvas.height, mono_analyser.maxDecibels, mono_analyser.minDecibels)
        inspector_ctx.fillStyle = '#fff'
        inspector_ctx.fillText(`${Math.round(hz)} Hz, ${Math.round(db)} dB`, inspector_mouse.x <= inspector_canvas.width - 180 ? inspector_mouse.x + 10 : inspector_mouse.x - 180, inspector_mouse.y >= 40 ? inspector_mouse.y - 10 : inspector_mouse.y + 30, 175)
    }

    const max_dB = new InputKnob(document.querySelector('#max-decibels'), mono_analyser.maxDecibels, -55, 0, 5, value => {
        mono_analyser.maxDecibels = value
        setupCanvas_context_dB(mono_analyser)
    }, 0),
        min_dB = new InputKnob(document.querySelector('#min-decibels'), mono_analyser.minDecibels, -200, -60, 5, value => {
            mono_analyser.minDecibels = value
            setupCanvas_context_dB(mono_analyser)
        }, 0)

    let delayChange = null
    const delay_input = new InputKnob(document.querySelector('#delay'), delay.delayTime.value * 1000, 0, 400, 25, value => {
        if (delayChange) clearTimeout(delayChange)
        delayChange = setTimeout(() => delay.delayTime.value = value / 1000, 1000)
    }, 0)

    const meterWrapper = document.querySelector('#meter-wrapper'),
        meterAmount = new InputKnob(document.querySelector('#meter-amount'), 1, 1, document.querySelectorAll('#meter-wrapper > .meter-container').length, 1, value => meterWrapper.style = `cursor:${value <= 1 ? 'w-resize' : value >= document.querySelectorAll('#meter-wrapper > .meter-container').length ? 'e-resize' : 'ew-resize'};width:${(value * parseInt(window.getComputedStyle(document.querySelector('.meter-container')).width)) + parseInt(window.getComputedStyle(meterWrapper).paddingLeft)}px;`, 0)
    if (chromeStorage.meterAmount > 1) meterAmount.update(chromeStorage.meterAmount)

    let metersResize = null
    meterWrapper.addEventListener('mousedown', e => {
        const zoomMultiplier = document.body.style.zoom ? 1 / parseFloat(document.body.style.zoom) : 1
        metersResize = { visible: meterAmount.value, x: e.clientX * zoomMultiplier }
    })
    window.addEventListener('mousemove', e => {
        if (metersResize) {
            const zoomMultiplier = document.body.style.zoom ? 1 / parseFloat(document.body.style.zoom) : 1
            meterWrapper.style.width = `${Math.round(meterWrapper.getBoundingClientRect().width + metersResize.x - (e.clientX * zoomMultiplier))}px`
            const meters = document.querySelectorAll('#meter-wrapper > .meter-container')
            for (var i = 0; i < meters.length; i++) if (meters[i].getBoundingClientRect().right > document.body.clientWidth) break
            metersResize = { visible: i, x: e.clientX * zoomMultiplier }
        }
    })
    window.addEventListener('mouseup', () => {
        if (metersResize) {
            meterAmount.update(metersResize.visible)
            metersResize = null
        }
    })
    document.querySelector('main').addEventListener('contextmenu', e => e.preventDefault())
    window.addEventListener('beforeunload', () => {
        chrome.runtime.sendMessage({ type: 'delete_windowId' })
        chrome.storage.sync.set({ max_dB: max_dB.value, min_dB: min_dB.value, delay: delay_input.value / 1000, windowSize: windowSize.value, meterAmount: meterAmount.value })
    })
}