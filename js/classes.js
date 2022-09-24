class InputKnob {
    constructor(container = document.getElementById(null), inputValue = 0, inputMin = 0, inputMax = 1, step = 1, newValue_callback = () => null, decimals = 10) {
        this.container = container
        this.container.innerHTML = `<canvas width="${window.getComputedStyle(container).width}" height="${window.getComputedStyle(container).height}"></canvas><span>${inputValue}</span>`
        this.canvas = this.container.querySelector('canvas')
        this.ctx = this.canvas.getContext('2d')
        this.span = this.container.querySelector('span')
        this.value = inputValue
        this.min = inputMin
        this.max = inputMax
        this.step = step
        this.callback = newValue_callback
        this.decimals = decimals
        this.update(inputValue, true)
        this.mouseY = null
        this.container.addEventListener('mousedown', e => this.mouseY = e.clientY)
        window.addEventListener('mouseup', () => this.mouseY = null)
        window.addEventListener('mousemove', e => {
            if (this.mouseY && this.mouseY < e.clientY - 5) {
                this.update(this.value - this.step)
                this.mouseY = e.clientY
            } else if (this.mouseY && this.mouseY > e.clientY + 5) {
                this.update(this.value + this.step)
                this.mouseY = e.clientY
            }
        })
    }
    update(newValue, noCallback) {
        this.span.innerHTML = this.value = newValue > this.max ? this.max : newValue < this.min ? this.min : Math.round(newValue * Math.pow(10, this.decimals)) / Math.pow(10, this.decimals)
        if (!noCallback) this.callback(this.value)
        this.ctx.lineWidth = 8
        this.ctx.fillStyle = '#000'
        this.ctx.strokeStyle = '#0af'
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.beginPath()
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.beginPath()
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2 - 8, Math.PI / 2, (((this.value / (this.max - this.min)) - (this.min / (this.max - this.min))) * (Math.PI * 2)) + (Math.PI / 2))
        this.ctx.stroke()
        this.ctx.fillStyle = '#fff'
        this.ctx.fillRect(this.canvas.width / 2 - 2, this.canvas.height - 12, 4, 8)
    }
}