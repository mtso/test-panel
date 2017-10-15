
function fakeModule(testing) {
  var describe = testing.describe
  
  describe('module', function() {
    it('should be 4', function() {
      assertEquals(2+2, 4)
    })
    
    it('should fail', function() {
      assertEquals(1+1, 3)
    })
    
    it('should fail', function(done) {
      console.log('called')
      setTimeout(function() {
        console.log('did')

        assertEquals('foo', 'bar')
        done()
      }, 200)
    })
  })
}

var testService = (function() {
  var isAdded = false
  var panel
  
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

    // div.innerText = 'hi'

    panel.panel.insertBefore(runButton, panel.container)
    panel.container.appendChild(div)
    
    panel.panel.style.boxShadow = '0 0 30px 0 lightgray'
    // panel.panel.style.backgroundColor = 'pink'
  }
  
  var testSuites = []
  
  function describe(title, registerCases) {
    addPanelIfNotExists()
    
    var suite = {}
    
    suite.asyncCount = 0
    
    suite.cases = []
    
    suite.defaultTimeout = 2000 // 2 seconds
    
    suite.run = function() {
      return new Promise(function(resolve, reject) {
        var results = []
        var doneCount = 0
        var isFinished = false
        
        function finish() {
          resolve(results)
        }

        function makeDone() {
          return function() {
            doneCount += 1
            console.log('DONE', doneCount)

            checkDone()
          }
        }

        function checkDone() {
          console.log(doneCount, suite.asyncCount)

          if (doneCount >= suite.asyncCount) {
            // finish
            isFinished = true
            finish()
          }
        }

        setTimeout(function() {
          if (!isFinished) {
            // finish(with error)
            isFinished = true
            results.push({
              isPass: false,
              error: new Error('Timeout exceeded: ' + suite.defaultTimeout),
              message: 'Timeout exceeded',
            })
            finish()
          }
        }, suite.defaultTimeout)

        suite.cases.forEach(function(test) {
          var error = null
          var isPass = false
          var donecb = makeDone()
// console.log(test)
          try {
            if (test.isAsync) {
              console.log()
              test.callback(donecb)
            } else {
              test.callback()
            }
            isPass = true
          } catch(e) {
            error = e
            if (test.isAsync) {
              donecb()
            }
            console.log(e.toString())
          }

          results.push({
            isPass: isPass,
            error: error,
            message: test.message
          })
        })
        
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
    
    this.assertEquals = function(actual, expected) {
      if (actual != expected) {
        console.log(this.name)
        throw new Error(actual.toString() + ' != ' + expected.toString())
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
    header.appendChild(title)
    details.appendChild(header)
    
    var trace = document.createElement('pre')
    trace.innerText = test.error && test.error.stack
    trace.style.overflowX = 'scroll'
    trace.style.backgroundColor = 'rgba(0,0,0,0.2)'
    details.appendChild(trace)
    
    return details
  }
  
  function run() {
    var results = []
    
    testSuites
      .map(function(s) { return s.run() })
      .reduce(function(curr, next) {
        curr.then(next)
        return Promise.resolve()
      })
      .then(function(res) {
        var container = document.createElement('div')
        res.forEach(function(r) {
          var rendered = renderTest(r)
          container.appendChild(rendered)
        })
        addToContainer(container)
      })
  }
  
  return {
    describe: describe,
  }
})()

fakeModule(testService)

