import { LitElement, html, css } from 'lit-element'
import { i18next, localize } from '@things-factory/i18n-base'

import NEW_DIAGRAM from '../resource/new-diagram.bpmn'
const NOIMAGE_DATA_URI =
  'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22utf-8%22%3F%3E%0A%3C!--%20created%20with%20bpmn-js%20%2F%20http%3A%2F%2Fbpmn.io%20--%3E%0A%3C!DOCTYPE%20svg%20PUBLIC%20%22-%2F%2FW3C%2F%2FDTD%20SVG%201.1%2F%2FEN%22%20%22http%3A%2F%2Fwww.w3.org%2FGraphics%2FSVG%2F1.1%2FDTD%2Fsvg11.dtd%22%3E%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2248%22%20height%3D%2248%22%20viewBox%3D%22406%20234%2048%2048%22%20version%3D%221.1%22%3E%3Cg%20class%3D%22djs-group%22%3E%3Cg%20class%3D%22djs-element%20djs-shape%22%20data-element-id%3D%22StartEvent_1%22%20style%3D%22display%3A%20block%3B%22%20transform%3D%22matrix(1%200%200%201%20412%20240)%22%3E%3Cg%20class%3D%22djs-visual%22%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%2218%22%20r%3D%2218%22%20style%3D%22stroke%3A%20black%3B%20stroke-width%3A%202px%3B%20fill%3A%20white%3B%20fill-opacity%3A%200.95%3B%22%2F%3E%3C%2Fg%3E%3Crect%20class%3D%22djs-hit%20djs-hit-all%22%20x%3D%220%22%20y%3D%220%22%20width%3D%2236%22%20height%3D%2236%22%20style%3D%22fill%3A%20none%3B%20stroke-opacity%3A%200%3B%20stroke%3A%20white%3B%20stroke-width%3A%2015px%3B%22%2F%3E%3Crect%20x%3D%22-6%22%20y%3D%22-6%22%20width%3D%2248%22%20height%3D%2248%22%20class%3D%22djs-outline%22%20style%3D%22fill%3A%20none%3B%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E'

export class ProcessCreationCard extends localize(i18next)(LitElement) {
  static get properties() {
    return {
      /* default process group id */
      defaultProcessGroup: String,
      processGroups: Array
    }
  }

  static get styles() {
    return [
      css`
        :host {
          position: relative;

          padding: 0;
          margin: 0;
          height: 100%;

          -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
          -webkit-transition: all 0.5s ease-in-out;
          transition: all 0.5s ease-in-out;
        }

        :host(.flipped) {
          -webkit-transform: var(--card-list-flip-transform);
          transform: var(--card-list-flip-transform);
        }

        [front],
        [back] {
          position: absolute;

          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;

          border: var(--card-list-create-border);
          border-radius: var(--card-list-create-border-radius);

          background-color: #fff;

          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }

        [front] {
          text-align: center;
          font-size: 0.8em;
          color: var(--card-list-create-color);
          text-transform: capitalize;
        }

        [front] mwc-icon {
          margin-top: 15%;
          display: block;
          font-size: 3.5em;
          color: var(--card-list-create-icon-color);
        }

        [back] {
          -webkit-transform: var(--card-list-flip-transform);
          transform: var(--card-list-flip-transform);
        }

        [back] form {
          padding: var(--card-list-create-form-padding);
          display: flex;
          flex-flow: row wrap;
        }

        [back] form label {
          flex: 1 1 25%;
          font: var(--card-list-create-label-font);
          color: var(--card-list-create-label-color);
        }

        [back] form input,
        [back] form select {
          flex: 1 1 60%;
          width: 10px;
          background-color: #fff;
          border: var(--card-list-create-input-border);
          border-radius: var(--card-list-create-input-border-radius);
          padding: var(--card-list-create-input-padding);
          font: var(--card-list-create-input-font);
          color: var(--card-list-create-input-color);
        }

        form * {
          margin: var(--card-list-create-margin);
        }

        input[type='submit'] {
          background-color: var(--button-background-color) !important;
          margin: var(--button-margin);
          font: var(--button-font);
          color: var(--button-color) !important;
          border-radius: var(--button-radius);
          border: var(--button-border);
        }
      `
    ]
  }

  render() {
    var processGroups = this.processGroups || []

    return html`
      <div @click=${e => this.onClickFlip(e)} front><mwc-icon>add_circle_outline</mwc-icon>create process</div>

      <div @click=${e => this.onClickFlip(e)} back>
        <form @submit=${e => this.onClickSubmit(e)}>
          <label>${i18next.t('label.name')}</label>
          <input type="text" name="name" />

          <label>${i18next.t('label.description')}</label>
          <input type="text" name="description" />

          <label>${i18next.t('label.process-group')}</label>
          <select .value=${this.defaultProcessGroup} name="processGroupId">
            ${processGroups.map(
              processGroup => html`
                <option value=${processGroup.id} ?selected=${this.defaultProcessGroup == processGroup.id}
                  >${processGroup.name}</option
                >
              `
            )}
          </select>

          <input type="submit" value=${i18next.t('button.create')} />
        </form>
      </div>
    `
  }

  onClickFlip(e) {
    if (e.currentTarget.hasAttribute('front') || e.target.hasAttribute('back')) {
      this.classList.toggle('flipped')
    }

    e.stopPropagation()
  }

  onClickSubmit(e) {
    e.preventDefault()
    e.stopPropagation()

    var form = e.target

    var name = form.elements['name'].value
    var description = form.elements['description'].value
    var processGroupId = form.elements['processGroupId'].value

    this.dispatchEvent(
      new CustomEvent('create-process', {
        detail: {
          name,
          description,
          groupId: processGroupId,
          model: NEW_DIAGRAM,
          thumbnail: NOIMAGE_DATA_URI
        }
      })
    )
  }

  reset() {
    var form = this.shadowRoot.querySelector('form')
    if (form) {
      form.reset()
    }

    this.classList.remove('flipped')
  }
}

customElements.define('process-creation-card', ProcessCreationCard)
