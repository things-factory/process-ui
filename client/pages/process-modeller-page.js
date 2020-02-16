import { html, css, unsafeCSS } from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { PageView, store } from '@things-factory/shell'
import { ScrollbarStyles } from '@things-factory/styles'
import { isMacOS } from './is-macos'
import '@material/mwc-fab'

import '@polymer/paper-dialog/paper-dialog'
import { saveAs } from 'file-saver'

import { fetchProcess, createProcess, updateProcess } from '../graphql'

import { promisify } from 'util'
import svgToDataURL from 'svg-to-dataurl'

import BpmnModeler from 'bpmn-js/lib/Modeler'
import * as PropertiesPanelModule from 'bpmn-js-properties-panel'
import * as PropertiesProviderModule from 'bpmn-js-properties-panel/lib/provider/camunda'
import CamundaModdleDescriptor from 'camunda-bpmn-moddle/resources/camunda'

/* 
  FIXME
  https://github.com/bpmn-io/min-dom/issues/5
  위와 관련된 이슈로 인해서, 
  bpmn-js와 min-dom 리파지토리를 fork 해서 사용하고 있음.
  아래 스타일 임포트도 관련된 임시 작업된 형태임.
  위 이슈가 해결되면, 코멘트된 부분으로 복구할 것.
*/
// import DiagramJSStyle from '!!text-loader!bpmn-js/dist/assets/diagram-js.css'
// import BPMNStyle from '!!text-loader!bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css'
// import PropertyPanelStyle from '!!text-loader!bpmn-js-properties-panel/styles/properties.less'
import DiagramJSStyle from '!!text-loader!../../assets/diagram-js.css'
import BPMNStyle from '!!text-loader!../../assets/bpmn-font/css/bpmn-codes.css'
import PropertyPanelStyle from '!!text-loader!../../assets/bpmn-js-properties-panel.css'

import NEW_DIAGRAM from '../resource/new-diagram.bpmn'
import './bpmn-font-loader'

const NOOP = () => {}

class ProcessModellerPage extends connect(store)(PageView) {
  static get styles() {
    return [
      ScrollbarStyles,
      css`
        ${unsafeCSS(DiagramJSStyle)}
        ${unsafeCSS(BPMNStyle)}
        ${unsafeCSS(PropertyPanelStyle)}
        [class^='bpmn-icon-']:before,
        [class*=' bpmn-icon-']:before {
          font-family: 'bpmn';
          font-style: normal;
          font-weight: normal;
          speak: none;

          display: inline-block;
          text-decoration: inherit;
          width: 1em;
          /* margin-right: .2em; */
          text-align: center;
          /* opacity: .8; */

          /* For safety - reset parent styles, that can break glyph codes*/
          font-variant: normal;
          text-transform: none;

          /* fix buttons height, for twitter bootstrap */
          line-height: 1em;

          /* Animation center compensation - margins should be symmetric */
          /* remove if not needed */
          /* margin-left: .2em; */

          /* you can be more comfortable with increased icons size */
          /* font-size: 120%; */

          /* Font smoothing. That was taken from TWBS */
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;

          /* Uncomment for 3D effect */
          /* text-shadow: 1px 1px 1px rgba(127, 127, 127, 0.3); */
        }
      `,
      css`
        :host {
          display: flex;
          flex-direction: row;

          position: relative;
          overflow: hidden;
        }

        #container {
          flex: 1;
        }

        #property-panel {
          top: 0;
          bottom: 0;
          right: 0;
          width: 260px;
          z-index: 10;
          border-left: 1px solid #ccc;
          overflow: auto;
        }

        .djs-properties-panel {
          padding-bottom: 70px;
          min-height: 100%;
        }

        .buttons {
          position: absolute;
          bottom: 20px;
          left: 20px;

          padding: 0;
          margin: 0;
          list-style: none;
        }

        .buttons > li {
          display: inline-block;
          margin-right: 10px;
        }

        .buttons > li > a {
          background: #ddd;
          border: solid 1px #666;
          display: inline-block;
          padding: 5px;
        }

        .buttons a {
          opacity: 0.3;
        }

        .buttons a.active {
          opacity: 1;
        }

        oops-spinner {
          display: none;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        oops-spinner[show] {
          display: block;
        }

        oops-note {
          display: block;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }
      `
    ]
  }

  static get properties() {
    return {
      processId: String,
      _showSpinner: Boolean
    }
  }

  get context() {
    return {
      title: this.process ? this.process.name : this._showSpinner ? 'Fetching process...' : 'Process Not Found'
    }
  }

  get oopsNote() {
    return {
      icon: 'color_lens',
      title: 'EMPTY PROCESS',
      description: 'There are no process to be designed'
    }
  }

  render() {
    var oops = !this._showSpinner && !this.modeller && this.oopsNote

    return oops
      ? html`
          <oops-note
            icon=${oops.icon}
            title=${oops.title}
            description=${oops.description}
            @click=${oops.click || NOOP}
          ></oops-note>
        `
      : html`
          <div id="container"></div>
          <div id="property-panel"></div>

          <ul class="buttons">
            <li>
              <a title="save BPMN diagram" @click=${e => this.saveProcess(e)}>
                save
              </a>
            </li>
            <li>
              <a id="js-download-diagram" title="download BPMN diagram" @click=${e => this.onDownloadModel()}>
                export
              </a>
            </li>
            <li>
              <a id="js-download-svg" title="download as SVG image" @click=${e => this.onDownloadSVG()}>
                SVG image
              </a>
            </li>
            <li>
              <a title="download as SVG image" @click=${e => this.fitSize()}>
                fit
              </a>
            </li>
          </ul>

          <oops-spinner ?show=${this._showSpinner}></oops-spinner>
        `
  }

  async refresh() {
    if (!this.processId) {
      this.modeller?.detach()
      this.modeller?.destroy()
      this.modeller = null

      return
    }

    try {
      this._showSpinner = true

      var response = await fetchProcess(this.processId)
      var process = response.process

      if (!process) {
        this.process = null
        throw 'process not found'
      }

      this.process = {
        ...process
      }

      this.rebuild()
    } catch (ex) {
      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'error',
            message: ex,
            ex
          }
        })
      )
    } finally {
      this._showSpinner = false
      this.updateContext()
    }
  }

  async rebuild() {
    if (this.modeller) {
      this.modeller.detach()
      this.modeller.destroy()
    }

    this.modeller = new BpmnModeler({
      container: this.renderRoot.querySelector('#container'),
      propertiesPanel: {
        parent: this.renderRoot.querySelector('#property-panel')
      },
      additionalModules: [PropertiesPanelModule, PropertiesProviderModule],
      moddleExtensions: {
        camunda: CamundaModdleDescriptor
      }
    })

    if (this.process) {
      this.modeller.importXML(this.process.model, err => {
        if (err) {
          return console.error('could not import BPMN 2.0 diagram', err)
        }
      })
    } else {
      this.modeller.importXML(NEW_DIAGRAM, err => {
        if (err) {
          return console.error('could not import BPMN 2.0 diagram', err)
        }
      })
    }

    // this.modeller.on('commandStack.changed', function() {
    //   console.log('commandStack.changed', arguments)
    // })
    // this.modeller.on('element.mousedown', function() {
    //   console.log('element.mousedown', arguments)
    // })
    // this.modeller.on('end', function() {
    //   console.log('WOW')
    // })
  }

  updated(changes) {
    changes.has('processId') && this.refresh()
  }

  pageUpdated(changes, { resourceId }) {
    if (this.active) {
      this.processId = resourceId
      this.bindShortcutEvent()
    } else {
      this.processId = null
      this.unbindShortcutEvent()
    }
  }

  async onDownloadModel() {
    if (!this.modeller) return

    try {
      var model = await promisify(this.modeller.saveXML).apply(this.modeller, [{ format: true }])

      var filename = (this.process?.name || 'NONAME') + '-' + Date.now() + '.bpmn'
      saveAs(new Blob([model], { type: 'application/octet-stream' }), filename)

      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'info',
            message: 'saved'
          }
        })
      )
    } catch (ex) {
      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'error',
            message: ex,
            ex: ex
          }
        })
      )
    }
  }

  async onDownloadSVG() {
    if (!this.modeller) return

    try {
      var model = await promisify(this.modeller.saveSVG).apply(this.modeller, [])

      var filename = (this.process?.name || 'NONAME') + '-' + Date.now() + '.svg'
      saveAs(new Blob([model], { type: 'application/octet-stream' }), filename)

      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'info',
            message: 'saved'
          }
        })
      )
    } catch (ex) {
      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'error',
            message: ex,
            ex: ex
          }
        })
      )
    }
  }

  async createProcess() {
    try {
      this.process = (
        await createProcess({
          ...this.process,
          model: this.scene.model
        })
      ).createProcess

      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'info',
            message: 'new process created'
          }
        })
      )
    } catch (ex) {
      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'error',
            message: ex,
            ex: ex
          }
        })
      )
    }

    this.updateContext()
  }

  async saveProcess() {
    try {
      this._showSpinner = true

      var model = await promisify(this.modeller.saveXML).apply(this.modeller, [{ format: true }])
      var thumbnail = svgToDataURL(await promisify(this.modeller.saveSVG).apply(this.modeller, []))

      await updateProcess({
        ...this.process,
        model,
        thumbnail
      })

      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'info',
            message: 'saved'
          }
        })
      )
    } catch (ex) {
      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'error',
            message: ex,
            ex: ex
          }
        })
      )
    } finally {
      this._showSpinner = false
    }

    this.updateContext()
  }

  fitSize() {
    this.modeller?.get('canvas').zoom('fit-viewport')
  }

  bindShortcutEvent() {
    var isMac = isMacOS()

    // TODO: Global Hotkey에 대한 정의를 edit-toolbar에서 가져올 수 있도록 수정해야 함.
    const GLOBAL_HOTKEYS = ['Digit1', 'Digit2', 'F11', 'KeyD', 'KeyP', 'KeyS']

    this._shortcutHandler = e => {
      var tagName = e.composedPath()[0].tagName
      var isInput = tagName.isContentEditable || tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA'
      var isGlobalHotkey = GLOBAL_HOTKEYS.includes(e.code)

      if (!isGlobalHotkey && isInput) {
        return
      }
    }

    document.addEventListener('keydown', this._shortcutHandler)
  }

  unbindShortcutEvent() {
    if (this._shortcutHandler) {
      document.removeEventListener('keydown', this._shortcutHandler)
      delete this._shortcutHandler
    }
  }
}

customElements.define('process-modeller-page', ProcessModellerPage)
