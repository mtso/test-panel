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
  container.innerText = 'Sample Text'
  
  style.innerText = `
    .panel {
      background-color: white;
      height: 100vh;
      width: 300px;
      position: fixed;
      z-index: 10000;
      top: 0;
      right: 0;
    }
    .toggle-button {
      position: absolute;
      margin-left: -28px;
      font-size: 1em;
    }
    .panel-container {
      padding: 10px;
      background-color: beige;
      height: 100vh;
      overflow-y: scroll;
    }
  `
  panel.className = 'panel'
  panel.appendChild(toggle)
  panel.appendChild(container)

  if (!mount.appendChild) { mount = document.body }
  
  mount.insertBefore(panel, mount.firstChild)
  mount.insertBefore(style, mount.firstChild)
  
  return panel
}
