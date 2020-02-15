import { html, css, unsafeCSS } from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { PageView, store } from '@things-factory/shell'
import { isMacOS } from './is-macos'
import '@material/mwc-fab'

import '@polymer/paper-dialog/paper-dialog'
import { saveAs } from 'file-saver'

import { fetchProcess, createProcess, updateProcess } from '../graphql'

import { promisify } from 'util'
import svgToDataURL from 'svg-to-dataurl'

import BpmnModeler from 'bpmn-js/lib/Modeler'

import DiagramJSStyle from '!!text-loader!bpmn-js/dist/assets/diagram-js.css'
import BPMNStyle from '!!text-loader!bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css'

import NEW_DIAGRAM from '../resource/new-diagram.bpmn'
import './bpmn-font-loader'

const NOOP = () => {}

class ProcessModellerPage extends connect(store)(PageView) {
  static get styles() {
    return [
      css`
        ${unsafeCSS(DiagramJSStyle)}
        ${unsafeCSS(BPMNStyle)}
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
          position: relative;
          overflow: hidden;
        }

        div {
          flex: 1;
        }

        mwc-fab {
          position: absolute;
          left: 15px;
          bottom: 15px;
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
          <div></div>

          <mwc-fab icon="save" @click=${e => this.saveProcess(e)} title="save"> </mwc-fab>
          <oops-spinner ?show=${this._showSpinner}></oops-spinner>
        `
  }

  async refresh() {
    if (!this.processId) {
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
      delete this.modeller
    }

    this.modeller = new BpmnModeler({
      container: this.shadowRoot.querySelector('div')
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

  onDownloadModel() {
    if (!this.scene) return

    var model = JSON.stringify(this.model, null, 2)
    var filename = (this.process?.name || 'NONAME') + '-' + Date.now() + '.bpmn'
    saveAs(new Blob([model], { type: 'application/octet-stream' }), filename)
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
