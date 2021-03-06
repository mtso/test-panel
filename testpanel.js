// testpanel.js
// (c) 2017 Matthew Tso
// PURPOSE: Attach a behavior-driven testing service to the page on the
//          client-side. Supports simple test case execution using both
//          synchronous and asynchronously executed test functions that
//          catch thrown exceptions.
window.__testService__ = (function() {
  // TODO: check for window.__DEV__ flag

  var isAdded = false // Add panel once only
  var panel

  // Builds the panel element and adds it to the mount node
  function addPanel(mount) {
    var panel = document.createElement('div')
    var style = document.createElement('style')
    var toggle = document.createElement('button')
    var container = document.createElement('div')

    toggle.innerText = '='
    toggle.className = 'toggle-button'
    toggle.addEventListener('click', function(e) {
      var isShowing = panel.style.marginRight == '0px'
      panel.style.marginRight = isShowing ? '-300px' : '0px'
    })
    container.className = 'panel-container'

    style.innerText = `
      .panel {
        background-color: white;
        height: 100vh;
        width: 300px;
        position: fixed;
        z-index: 10000;
        top: 0;
        right: 0;
        margin-right: -300px;
      }
      .toggle-button {
        position: absolute;
        margin-left: -28px;
        font-size: 1em;
      }
      .panel-container {
        padding: 10px;
        background-color: white;
        height: 100vh;
        overflow-y: scroll;
      }`

    panel.className = 'panel'
    panel.appendChild(toggle)
    panel.appendChild(container)

    if (!mount.appendChild) {
      mount = document.body
    }

    mount.insertBefore(panel, mount.firstChild)
    mount.insertBefore(style, mount.firstChild)

    window.addEventListener('click', function(e) {
      var bounds = toggle.getBoundingClientRect()

      var isInX = e.clientX > bounds.left && e.clientX < bounds.right
      var isInY = e.clientY > bounds.top && e.clientY < bounds.bottom

      if (isInX && isInY) {
        toggle.click()
      }
    })

    // Return a reference to both the panel and content container.
    return {
      panel: panel,
      container: container,
    }
  }

  // Add the panel UI once.
  function addPanelIfNotExists() {
    if (isAdded) {
      return
    }
    isAdded = true

    // MARK: Mount point for panel UI.
    panel = addPanel(document.body)

    var div = document.createElement('div')
    var runButton = document.createElement('button')
    runButton.innerText = 'Run'
    runButton.style.fontSize = '1em'
    runButton.addEventListener('click', runSuites)

    panel.panel.insertBefore(runButton, panel.container)
    panel.container.appendChild(div)

    panel.panel.style.borderLeft = '1px solid gray'

    window.addEventListener('click', function(e) {
      var bounds = runButton.getBoundingClientRect()

      var isInX = e.clientX > bounds.left && e.clientX < bounds.right
      var isInY = e.clientY > bounds.top && e.clientY < bounds.bottom

      if (isInX && isInY) {
        runButton.click()
      }
    })
  }

  var testSuites = {}

  // Describes and registers a new suite of test cases.
  // `it` and `asserts` will be available within the 
  // callback's context.
  function describe(title, registerCases, options) {
    addPanelIfNotExists()
    options = options || {}

    var suite = {}

    suite.title = title
    suite.asyncCount = 0
    suite.cases = []
    suite.defaultTimeout = options.timeout || 2000 // 2 seconds

    suite.run = function() {
      return new Promise(function(resolve, reject) {
        var results = []
        var doneCount = 0
        var testmap = {}
        var isFinished = false
        var testId = 0
        var isCollected = {}

        function finish() {
          for (var i = 0; i < testId; i++) {
            if (!isCollected[i]) {
              results.push({
                isPass: false,
                error: new Error('Timeout exceeded. Was `done()` called?'),
                message: testmap[i].message,
              })
            }
          }
          resolve(results)
        }

        // Create a callback that ends the test case for the given id (index)
        function makeDone(id) {
          return function done() {
            // is success if this is called
            doneCount += 1
            var test = testmap[id]

            isCollected[id] = true
            results.push({
              isPass: true,
              error: null,
              message: test.message,
            })

            checkDone()
          }
        }

        function checkDone() {
          if (doneCount >= suite.asyncCount) {
            // finish
            isFinished = true
            finish()
          }
        }

        // If this timer finishes before isFinished is set to true
        // one of the async callbacks were not called.
        setTimeout(function() {
          if (!isFinished) {
            isFinished = true
            finish()
          }
        }, suite.defaultTimeout)

        suite.cases.forEach(function(test) {
          var id = testId++
            testmap[id] = test

          // MARK: register async funcs separately
          if (test.isAsync) {
            var donecb = makeDone(id)
            test.callback(donecb)

          } else {
            var isPass = false
            var error = null

            try {
              test.callback()
              isPass = true
            } catch (e) {
              error = e
            }

            isCollected[id] = true
            results.push({
              isPass: isPass,
              error: error,
              message: test.message,
            })
          }
        })

        // Call once in the case that all tests are sync
        checkDone()

        return results
      })
    }

    testSuites[title] = suite

    this.it = function(message, callback) {
      var isAsync = callback.length > 0
      if (isAsync) {
        suite.asyncCount += 1
      }
      suite.cases.push({
        message: message,
        callback: callback,
        isAsync: isAsync,
      })
    }

    // Add assertions to describe's scope context 
    this.assertEquals = assertEquals
    this.assertArraysEqual = assertArraysEqual
    this.assertNotEquals = assertNotEquals
    this.assertThrows = assertThrows

    // Run the registration handler with this scope
    // (which contains the `it` and `asserts`)
    registerCases.bind(this)()
  }

  // MARK: Render Functions
  //       Adds results to the UI.

  function addToContainer(content) {
    while (panel.container.childNodes.length > 0) {
      panel.container.removeChild(panel.container.firstChild)
    }

    panel.container.appendChild(content)
  }

  function renderTest(test) {
    test = test || {}
    var details = document.createElement('details')
    var header = document.createElement('summary')
    var title = document.createElement('pre')

    var message = test.isPass ? 'passed: ' : 'FAILED: '
    message += test.message

    title.innerText = message
    title.style.display = 'inline-block'
    title.style.margin = '0'
    title.style.color = test.isPass ? 'green' : 'red'

    header.style.cursor = 'pointer'
    header.appendChild(title)
    details.appendChild(header)

    // Render stack trace and error message
    if (test.error) {
      var reason = document.createElement('div')
      var trace = document.createElement('pre')

      reason.innerText = test.error.message
      reason.style.marginLeft = '18px'

      trace.innerText = test.error.stack
      trace.style.overflowX = 'scroll'
      trace.style.backgroundColor = 'rgba(0,0,0,0.2)'
      trace.style.margin = '4px 0px 4px 18px'

      details.appendChild(reason)
      details.appendChild(trace)
    }

    return details
  }

  // Add results to panel
  function renderResults(results) {
    var container = document.createElement('div')

    function renderSuite(test) {
      var header = document.createElement('div')
      var title = document.createElement('h4')

      header.appendChild(title)
      title.style.marginBottom = 0
      title.innerText = test.suite.title || 'title'
      test.results.forEach(function(r) {
        var rendered = renderTest(r)
        header.appendChild(rendered)
      })

      container.appendChild(header)
    }

    Object.keys(results)
      .sort(function(a, b) {
        return +a - +b
      })
      .map(function(k) {
        return results[k]
      })
      .forEach(renderSuite)

    addToContainer(container)
  }

  // Run button click handler.
  // `runSuites()` is the test runner start trigger.
  function runSuites() {
    var results = {}
    var counts = 0

    function checkDone() {
      if (counts >= Object.keys(testSuites).length) {
        renderResults(results)
      }
    }

    // Start each test suite sequentially.
    Object.keys(testSuites)
      .map(function(title) {
        return testSuites[title]
      })
      .forEach(function(suite, i) {
        suite.run()
          .then(function(res) {
            // Add result to table on the suite level.
            results[i] = {
              results: res,
              suite: suite,
            }

            counts++
            checkDone()
          })
      })
  }

  // Service object definition
  // `it` test case registrar and `assert*`s
  // are available in describe's context.
  return {
    describe: describe,
  }

  // MARK: Assertions

  function assertEquals(actual, expected, message) {
    message = message || ('"' + actual + '" should equal "' + expected + '"')
    if (actual != expected) {
      throw new Error(message)
    }
  }

  // Asserts that the contents of two arrays are equal.
  function assertArraysEqual(actual, expected, message) {
    var areEqualLengths = actual.length === expected.length
    var areEqualItems = expected.every(function(item, index) {
      return item == actual[index]
    })
    if (!(areEqualLengths && areEqualItems)) {
      message = message || (actual.toString() + ' should equal ' + expected.toString())
      throw new Error(message)
    }
  }

  function assertNotEquals(actual, expected, message) {
    message = message || (actual.toString() + ' should not equal ' + expected.toString())
    if (actual == expected) {
      throw new Error(message)
    }
  }

  // Asserts that the callback will throw. Throws an exception if
  // no exception was caught.
  function assertThrows(callback, arguments, message) {
    message = message ||
      (callback.name && ('Expected ' + callback.name + ' to throw')) ||
      ('Expected ' + callback.toString().split('(')[0] + ' to throw')
    arguments = arguments || []

    if (typeof arguments === 'string') {
      message = arguments
      arguments = []
    }
    try {
      callback.apply(null, arguments)
    } catch (_) {
      return
    }
    throw new Error(message)
  }

})()

window.describe = window.__testService__.describe
