// testpanel.js
// (c) 2017 Matthew Tso

// Fake module for testing service injection.
function fakeModule(testing) {
  var describe = testing.describe
  
  describe('ok', function() {
    it('passes', function() {
      assertEquals(1, 1)
    })
    
    it('is async', function() {
      setTimeout(function() {
        assertEquals(2, 2)
      }, 200)
    })
  })
  
  describe('module', function() {
    it('should be 4', function() {
      assertEquals(2+2, 4)
    })
    
    it('should fail', function() {
      assertEquals(1+1, 3, 'Super long message ablav a fdsafdsaf ds fdsa fds afd safds afds afdsa')
    })
    
    it('should throw', function(done) {
      setTimeout(function() {
        assertEquals('foo', 'bar')
        done()
      }, 200)
    })
  })
  
  describe('module2', function() {
    it('should be 5', function() {
      assertEquals(1, 5)
    })
  })
}

var testService = (function() {
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

    if (!mount.appendChild) { mount = document.body }

    mount.insertBefore(panel, mount.firstChild)
    mount.insertBefore(style, mount.firstChild)

    return {
      panel: panel,
      container: container,
    }
  }
  
  function addPanelIfNotExists() {
    if (isAdded) {
      return
    }
    isAdded = true
    
    panel = addPanel(document.querySelector('#mount'))

    var div = document.createElement('div')
    var runButton = document.createElement('button')
    runButton.innerText = 'Run'
    runButton.style.fontSize = '1em'
    runButton.addEventListener('click', run)

    panel.panel.insertBefore(runButton, panel.container)
    panel.container.appendChild(div)
    
    panel.panel.style.boxShadow = '0 0 30px 0 lightgray'
  }
  
  var testSuites = []
  
  function describe(title, registerCases) {
    addPanelIfNotExists()
    
    var suite = {}
    
    suite.title = title
    suite.asyncCount = 0
    suite.cases = []
    suite.defaultTimeout = 2000 // 2 seconds
    
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
            } catch(e) {
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
          
    testSuites.push(suite)
    
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
    
    /// Add assertions to describe's scope context 
    
    this.assertEquals = function(actual, expected, message) {
      message = message || (actual.toString() + ' != ' + expected.toString())
      if (actual != expected) {
        console.log(this.name)
        throw new Error(message)
      }
    }
    
    registerCases.bind(this)()
  }
  
  function addToContainer(content) {
    while(panel.container.childNodes.length > 0) {
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
  
  // `run()` is the test runner start trigger.
  function run() {
    var results = {}
    var counts = 0
    
    // Add results to panel
    function renderResults() {
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
        .sort(function(a, b) { return +a - +b })
        .map(function(k) { return results[k] })
        .forEach(renderSuite)
      
      addToContainer(container)
    }
    
    function checkDone() {
      if (counts >= testSuites.length) {
        renderResults()
      }
    }
    
    // Start each test suite sequentially
    testSuites.forEach(function(suite, i) {
      suite.run()
        .then(function(res) {
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
})()

// Test using fake module
fakeModule(testService)
