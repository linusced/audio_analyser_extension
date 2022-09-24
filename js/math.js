function dBFS_to_gain(dBFS) {
    return 10 ** (dBFS * .05)
}
function gain_to_dBFS(gain) {
    return Math.log10(gain) * 20
}
function getPercentage(value, max, min) {
    // If statement for min_dB && max_dB
    if (max <= 0 && min < 0) return ((value / (min - max)) - (max / (min - max)))
    else return (value / (max - min)) - (min / (max - min))
}
function getIndex_for_frequency(frequency, fftSize, sampleRate) {
    return Math.round(frequency * ((fftSize / 2) / (sampleRate / 2)))
}
function getFrequency_for_width(width, final_width, previous_width, final_hz, previous_hz) {
    return (getPercentage(width, final_width, previous_width) * (final_hz - previous_hz)) + previous_hz
}
function getValue_for_percentage(percentage, min, max) {
    return percentage * (max - min) + min
}