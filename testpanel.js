// AUTHOR: Matthew
// PURPOSE: Add a simple test runner loaded client-side only.
var testService = (function createTestService(mount) {
  // Check if `__TEST__` has been set.
  // NOTE: Not used yet.
  var window = (typeof window === 'undefined') ? {} : window
  window.__TEST__ = true
  
  // Only add the panel if given a mounting element.
  if (mount) { 
    addTestPanel(mount)
  }

  // Add a panel to contain the test output.
  // Adds a toggle button to show/hide the panel.
  // And a container that the test messages render to.
  function addTestPanel(mount) {
    var panel = document.createElement('div')
    var toggle = document.createElement('button')
    var container = document.createElement('div')
    var style = document.createElement('style')

    panel.className = panel.id = 'test-panel'
    toggle.className = toggle.id = 'panel-button'
    container.className = container.id = 'test-container'
    toggle.innerText = '≡'
    style.innerText = `body { background-color: pink; margin: 0; } .test-panel { position: fixed; height: 100vh; background-color: white; z-index: 3000; width: 300px; right: -300px; } .test-container { padding: 10px; height: 100vh; overflow-y: scroll; z-index: 200; background-color: white; } .panel-button { position: absolute; left: -28px; font-size: 1em; }`

    panel.appendChild(style)
    panel.appendChild(toggle)
    panel.appendChild(container)
    mount.insertBefore(panel, mount.firstChild)
  }

  // Adds show/hide toggling functionality to the toggle button.
  // TODO: Move this into the addTestPanel(:mount) function.
  document.getElementById('panel-button').addEventListener('click', function(e) {
    var panel = document.getElementById('test-panel')
    var isShowing = panel.style.right == '0px'
    panel.style.right = isShowing ? '-300px' : '0px'
  })

  // Adds an expandable `<details/>` element to the container element.
  // @params message: string (will go in the <summary/> tag of the details title)
  // @params trace: string (will go into pre-formatted <pre/> tag of the details body)
  // @params color: string (default 'black')
  function writeToPanel(message, trace, color) {
    color = color || 'black'
    var details = document.createElement('details')
    var title = document.createElement('summary')
    var titlef = document.createElement('pre')
    titlef.innerText = message
    titlef.style.display = 'inline-block'
    titlef.style.color = color
    titlef.style.margin = 0
    title.appendChild(titlef)
    details.appendChild(title)

    var pre = document.createElement('pre')
    pre.innerText = trace
    pre.style.backgroundColor = 'lightgray'
    pre.style.overflowX = 'scroll'
    pre.style.margin = '4px 0'
    var panel = document.getElementById('test-container')

    details.appendChild(pre)
    panel.appendChild(details)
  }

  // ** Assertion Functions **

  // assertEquals compares two values for equality.
  function assertEquals(actual, expected, message) {
    message = message || (actual.toString() + ' == ' + expected.toString())
    if (actual == expected) {
      writeToPanel('passed: ' + message, (new Error).stack, 'green')
    } else {
      writeToPanel('FAILED: ' + message, (new Error).stack, 'red')
    }
  }
  
  // Assertion API object
  var testService = {
    assertEquals: assertEquals,
  }
  
  return testService
})(document.getElementById('mount')) // Replace this entry element.
