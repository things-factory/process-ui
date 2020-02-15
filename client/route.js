export default function route(page) {
  switch (page) {
    case 'process-viewer':
      import('./pages/process-viewer-page')
      return page

    case 'process-modeller':
      import('./pages/process-modeller-page')
      return page
  }
}
