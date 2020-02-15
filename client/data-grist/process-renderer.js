import { LitElement, html, css } from 'lit-element'

import gql from 'graphql-tag'
import { client, navigate } from '@things-factory/shell'

import '@material/mwc-icon'

const FETCH_PROCESS_GQL = id => {
  return gql`
  {
    process(id:"${id}") {
      id
      name
      description
      thumbnail
    }
  }
`
}

class ProcessRendererElement extends LitElement {
  static get styles() {
    return css`
      :host {
        display: block;
        position: relative;

        max-width: var(--process-renderer-max-width);
        border: var(--process-renderer-border);
      }
      span {
        position: absolute;
        bottom: 0;
        width: 100%;
        text-indent: 5px;
        color: #fff;

        font: var(--process-renderer-name-font);
        background-color: var(--process-renderer-name-background-color);
      }
      img {
        width: 100%;
        max-height: 80px;
      }
      mwc-icon {
        position: absolute;
        top: 0;
        text-align: center;
        color: #fff;

        width: var(--process-renderer-icon-size);
        height: var(--process-renderer-icon-size);
        font: var(--process-renderer-font);
      }
      mwc-icon[edit] {
        right: 0;

        border-bottom-left-radius: var(--process-renderer-icon-border-radius);
        background-color: var(--process-renderer-icon-edit-background-color);
      }
      mwc-icon[view] {
        left: 0;

        border-bottom-right-radius: var(--process-renderer-icon-border-radius);
        background-color: var(--process-renderer-icon-view-background-color);
      }
    `
  }

  static get properties() {
    return {
      value: Object,
      processViewerPage: String,
      _value: Object
    }
  }

  async updated(changes) {
    if (changes.has('value')) {
      if (typeof this.value == 'string' && this.value) {
        /* fetchProcess..., */
        try {
          var response = await client.query({
            query: FETCH_PROCESS_GQL(this.value)
          })

          this._value = (response && response.data && response.data.process) || {}
        } catch (e) {
          console.error(e)
        }
      } else {
        this._value = this.value || {}
      }
    }
  }

  render() {
    var { id, name = '', thumbnail = 'image/gif' } = this._value || {}

    return id
      ? html`
          <span>${name}</span>
          <img src=${thumbnail} alt="no thumbnail!" />
          <mwc-icon view @click=${e => this.onClickViewer(e, id)}>search</mwc-icon>
          <mwc-icon edit @click=${e => this.onClickModeler(e, id)}>edit</mwc-icon>
        `
      : html`
          choose process..
        `
  }

  onClickViewer(e, id) {
    e.preventDefault()
    e.stopPropagation()

    var processViewerPage = this.processViewerPage || 'process-viewer'

    navigate(`${processViewerPage}/${id}`)
  }

  onClickModeler(e, id) {
    e.preventDefault()
    e.stopPropagation()

    navigate(`process-modeller/${id}`)
  }
}

customElements.define('process-renderer', ProcessRendererElement)

export const ProcessRenderer = (value, column, record) => {
  var { processViewerPage = '' } = column.record.options || {}

  return html`
    <process-renderer .value=${value} .processViewerPage=${processViewerPage}></process-renderer>
  `
}
