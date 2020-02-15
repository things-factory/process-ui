var head = document.head || document.getElementsByTagName('head')[0],
  style = document.createElement('style'),
  css = `
    @font-face {
      font-family: 'bpmn';
      src: url('/assets/bpmn-font/font/bpmn.eot?14396105');
      src: url('/assets/bpmn-font/font/bpmn.eot?14396105#iefix') format('embedded-opentype'),
        url('/assets/bpmn-font/font/bpmn.woff2?14396105') format('woff2'),
        url('/assets/bpmn-font/font/bpmn.woff?14396105') format('woff'),
        url('/assets/bpmn-font/font/bpmn.ttf?14396105') format('truetype'),
        url('/assets/bpmn-font/font/bpmn.svg?14396105#bpmn') format('svg');
      font-weight: normal;
      font-style: normal;
    }
    
    @media screen and (-webkit-min-device-pixel-ratio: 0) {
      @font-face {
        font-family: 'bpmn';
        src: url('/assets/bpmn-font/font/bpmn.svg?14396105#bpmn') format('svg');
      }
    }
  `

head.appendChild(style)

style.type = 'text/css'
if (style.styleSheet) {
  // This is required for IE8 and below.
  style.styleSheet.cssText = css
} else {
  style.appendChild(document.createTextNode(css))
}
