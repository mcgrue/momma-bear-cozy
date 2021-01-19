function addStyle(styleString) {
    const style = document.createElement('style');
    style.textContent = styleString;
    document.head.append(style);
}

global.runBeforeGameInit = () => {
    debugger;

    addStyle(`
    .poop {
      background-color: red;
      border-style: double;
      border-coloir: white;
      
      color: white;
      font-size: 2em;
      position: absolute;
      width: 300px;
      height: 300px;
      top: 10px;
      left: 10px;
      padding: 1em;
      font-family: sans-serif;
      z-index: 2;
    }
  `);

    var elem = document.createElement('div');
    elem.className = 'poop';
    elem.innerHTML = 'I AM A <s>POOP</s> UI OVERLAY!!!1';
    document.body.appendChild(elem);
}

global.runAfterGameInit = () => {
    debugger;
}