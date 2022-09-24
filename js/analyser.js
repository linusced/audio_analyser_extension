const audioCtx = new AudioContext(), mono_analyser = audioCtx.createAnalyser(), delay = audioCtx.createDelay(.5), splitter = audioCtx.createChannelSplitter(2), left_analyser = audioCtx.createAnalyser(), right_analyser = audioCtx.createAnalyser()

chrome.tabCapture.capture({ audio: true }, stream => chrome.windows.getCurrent(w => {
    windowId = w.id
    if (!stream || stream.constructor.name !== 'MediaStream') {
        console.warn(chrome.runtime.lastError.message)
        alert('Unable to get an audio stream for the current tab!\nPlease try again after selecting the Chrome tab you want to analyse.')
        chrome.windows.remove(windowId)
    } else {
        setup(stream)
        chrome.runtime.sendMessage({ type: 'new_windowId', data: windowId })
    }
}))

function setup(stream) {
    chrome.storage.sync.get(['max_dB', 'min_dB', 'delay', 'windowSize', 'meterAmount'], chromeStorage => {
        updateWindow(true, chromeStorage.windowSize || null)

        mono_analyser.fftSize = left_analyser.fftSize = right_analyser.fftSize = 32768
        mono_analyser.smoothingTimeConstant = left_analyser.smoothingTimeConstant = right_analyser.smoothingTimeConstant = 0
        mono_analyser.minDecibels = chromeStorage.min_dB || -100
        mono_analyser.maxDecibels = chromeStorage.max_dB <= 0 ? chromeStorage.max_dB : -10
        delay.delayTime.value = chromeStorage.delay >= 0 ? chromeStorage.delay : .4

        const src = audioCtx.createMediaStreamSource(stream)
        src.connect(mono_analyser)
        mono_analyser.connect(delay)
        delay.connect(audioCtx.destination)
        src.connect(splitter)
        splitter.connect(left_analyser, 0)
        splitter.connect(right_analyser, 1)

        const canvas = document.querySelector('#frequencies'), ctx = canvas.getContext('2d'), multiplier = canvas.height / 255, byteArray = new Uint8Array(mono_analyser.frequencyBinCount),
            frequencyData = [{ hz: 32, w: 110 }, { hz: 64, w: 204 }, { hz: 125, w: 297 }, { hz: 250, w: 390 }, { hz: 500, w: 482 }, { hz: 1000, w: 574 }, { hz: 2000, w: 667 }, { hz: 4000, w: 760 }, { hz: 8000, w: 851 }, { hz: 16000, w: 944 }, { hz: Math.floor(audioCtx.sampleRate / 2), w: 1000 }],
            floatArray = new Float32Array(mono_analyser.fftSize), mono_peakMeter = document.querySelector('#peak > .meter > span'), mono_peakLabel = document.querySelector('#peak > .meter-label > p.db'), rmsMeter = document.querySelector('#rms > .meter > span'), rmsLabel = document.querySelector('#rms > .meter-label > p.db'),
            left_floatArray = new Float32Array(left_analyser.fftSize), right_floatArray = new Float32Array(right_analyser.fftSize), left_peakMeter = document.querySelector('#peak-left > .meter > span'), left_peakLabel = document.querySelector('#peak-left > .meter-label > p.db'), right_peakMeter = document.querySelector('#peak-right > .meter > span'), right_peakLabel = document.querySelector('#peak-right > .meter-label > p.db')
        ctx.fillStyle = '#36779B'

        requestAnimationFrame(update)
        function update() {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            mono_analyser.getByteFrequencyData(byteArray)
            var x = 0, previous_width = 0, previous_width_hz = 0, previous_index = null
            for (let i = 0; i < frequencyData.length; i++) {
                const width = frequencyData[i].w, width_hz = frequencyData[i].hz
                for (x; x <= width; x++) {
                    const hz = getFrequency_for_width(x, width, previous_width, width_hz, previous_width_hz),
                        index = getIndex_for_frequency(hz, mono_analyser.fftSize, audioCtx.sampleRate)
                    let value = byteArray[index]
                    if (previous_index) {
                        const max = Math.max.apply(Math, byteArray.slice(previous_index, index))
                        if (Math.abs(max) !== Infinity) value = max
                    }
                    ctx.fillRect(x, canvas.height - (value * multiplier), 1, canvas.height)
                    previous_index = index
                }
                previous_width = width
                previous_width_hz = width_hz
            }

            mono_analyser.getFloatTimeDomainData(floatArray)
            left_analyser.getFloatTimeDomainData(left_floatArray)
            right_analyser.getFloatTimeDomainData(right_floatArray)

            let rms = 0
            for (let i = 0; i < floatArray.length; i++) rms += Math.abs(floatArray[i])
            rms = gain_to_dBFS(Math.sqrt(rms / floatArray.length))
            display(rms, rmsMeter, rmsLabel)

            const mono_peak = gain_to_dBFS(Math.max(-Math.min.apply(Math, floatArray), Math.max.apply(Math, floatArray))), left_peak = gain_to_dBFS(Math.max(-Math.min.apply(Math, left_floatArray), Math.max.apply(Math, left_floatArray))), right_peak = gain_to_dBFS(Math.max(-Math.min.apply(Math, right_floatArray), Math.max.apply(Math, right_floatArray)))
            display(mono_peak, mono_peakMeter, mono_peakLabel)
            display(left_peak, left_peakMeter, left_peakLabel)
            display(right_peak, right_peakMeter, right_peakLabel)

            function display(dBFS, meter, label) {
                meter.style.background = label.style.color = dBFS >= -.3 ? '#f00' : dBFS >= -2 ? '#ff0' : '#fff'
                meter.style.height = `${(dBFS_to_gain(dBFS) * 100).toFixed(2)}%`
                label.innerHTML = Math.abs(dBFS) !== Infinity ? dBFS.toFixed(1) : '~'
            }
            requestAnimationFrame(update)
        }

        documentSetup(mono_analyser, frequencyData, delay, chromeStorage)
    })
}