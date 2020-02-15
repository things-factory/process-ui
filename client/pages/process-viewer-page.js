import { html, css } from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { PageView, store } from '@things-factory/shell'
import { fetchProcess } from '../graphql'

import BpmnJS from 'bpmn-js'

const NOOP = () => {}

class ProcessViewerPage extends connect(store)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;

          overflow: hidden;
          position: relative;
        }

        div {
          flex: 1;

          color: White;

          font-family: Arial;
          font-size: 12px;
          text-align: center;
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
      _processId: String,
      _showSpinner: Boolean
    }
  }

  get oopsNote() {
    return {
      icon: 'insert_chart_outlined',
      title: 'EMPTY PROCESS',
      description: 'There are no process to be shown'
    }
  }

  get context() {
    return {
      title: this._process ? this._process.name : this._showSpinner ? 'Fetching process...' : 'Process Not Found'
    }
  }

  render() {
    var oops = !this._showSpinner && !this._process && this.oopsNote

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
          <oops-spinner ?show=${this._showSpinner}></oops-spinner>
        `
  }

  async refresh() {
    if (!this._processId) {
      this.viewer?.destroy()
      this.viewer = null

      return
    }

    try {
      this._showSpinner = true

      var response = await fetchProcess(this._processId)
      var process = response.process

      if (!process) {
        this._process = null
        throw 'process not found'
      }

      this._process = {
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
    if (this.viewer) {
      this.viewer.detach()
      delete this.viewer
    }

    if (this._process) {
      this.viewer = new BpmnJS({
        container: this.shadowRoot.querySelector('div')
      })

      this.viewer.importXML(this._process.model, err => {
        if (err) {
          return console.error('could not import BPMN 2.0 diagram', err)
        }
      })
    }
  }

  updated(changes) {
    changes.has('_processId') && this.refresh()
  }

  pageUpdated(changes, { resourceId }) {
    if (this.active) {
      this._processId = resourceId
    } else {
      this._processId = null
    }
  }
}

customElements.define('process-viewer-page', ProcessViewerPage)
