import route from './client/route'
import bootstrap from './client/bootstrap'

export default {
  route,
  routes: [
    {
      tagname: 'process-viewer-page',
      page: 'process-viewer'
    },
    {
      tagname: 'process-modeller-page',
      page: 'process-modeller'
    }
  ],
  bootstrap
}
