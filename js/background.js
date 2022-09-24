var windowId = null, allow_onClickEvent = true
chrome.browserAction.onClicked.addListener(() => {
    if (allow_onClickEvent) {
        allow_onClickEvent = false
        if (windowId) chrome.windows.update(windowId, { focused: true })
        else chrome.windows.create({
            url: chrome.runtime.getURL('../index.html'),
            type: 'popup',
            focused: false
        })
        setTimeout(() => allow_onClickEvent = true, 1000)
    }
})
chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'new_windowId') windowId = msg.data
    else if (msg.type === 'delete_windowId') windowId = null
})