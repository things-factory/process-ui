import { i18next, localize } from '@things-factory/i18n-base'
import '@things-factory/setting-base'
import { css, html, LitElement } from 'lit-element'

import gql from 'graphql-tag'
import { client, InfiniteScrollable } from '@things-factory/shell'
import { gqlBuilder } from '@things-factory/utils'
import { ScrollbarStyles } from '@things-factory/styles'
import './process-creation-card'

const FETCH_PROCESS_LIST_GQL = listParam => {
  return gql`
  {
    processes(${gqlBuilder.buildArgs(listParam)}) {
      items {
        id
        name
        description
        thumbnail
      }
      total
    }
  }
`
}

const FETCH_PROCESS_GROUP_LIST_GQL = gql`
  {
    processGroups {
      items {
        id
        name
        description
      }
      total
    }
  }
`

const CREATE_BOARD_GQL = gql`
  mutation CreateProcess($process: NewProcess!) {
    createProcess(process: $process) {
      id
      name
      description
      model
      createdAt
      updatedAt
    }
  }
`

export class ProcessSelector extends InfiniteScrollable(localize(i18next)(LitElement)) {
  static get styles() {
    return [
      ScrollbarStyles,
      css`
        :host {
          display: grid;
          grid-template-rows: auto auto 1fr;
          overflow: hidden;
          background-color: var(--popup-content-background-color);
        }

        #main {
          overflow: auto;
          padding: var(--popup-content-padding);
          display: grid;
          grid-template-columns: var(--card-list-template);
          grid-auto-rows: var(--card-list-rows-height);
          grid-gap: 20px;
        }

        #main .card {
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
          border-radius: var(--card-list-border-radius);
          background-color: var(--card-list-background-color);
        }

        #main .card.create {
          overflow: visible;
        }

        #main .card:hover {
          cursor: pointer;
        }

        #main .card > .name {
          background-color: rgba(1, 126, 127, 0.8);
          margin-top: -35px;
          width: 100%;
          color: #fff;
          font-weight: bolder;
          font-size: 13px;
          text-indent: 7px;
        }

        #main .card > .description {
          background-color: rgba(0, 0, 0, 0.7);
          width: 100%;
          min-height: 15px;
          font-size: 0.6rem;
          color: #fff;
          text-indent: 7px;
        }
        #main .card img {
          max-height: 100%;
          min-height: 100%;
        }

        #filter {
          padding: var(--popup-content-padding);
          background-color: #fff;
          box-shadow: var(--box-shadow);
        }

        #filter * {
          font-size: 15px;
        }

        select {
          text-transform: capitalize;
          float: right;
        }
      `
    ]
  }

  static get properties() {
    return {
      processGroups: Array,
      processes: Array,
      processGroup: String,
      _page: Number,
      _total: Number,
      creatable: Boolean
    }
  }

  constructor() {
    super()

    this.processGroups = []
    this.processes = []

    this._page = 1
    this._total = 0

    this._infiniteScrollOptions.limit = 20
  }

  render() {
    return html`
      <div id="filter">
        <select
          @change=${e => {
            this.processGroup = e.currentTarget.value
            this.requestUpdate()
          }}
        >
          <option value="">${i18next.t('label.all')}</option>
          ${this.processGroups.map(
            processGroup => html`
              <option value=${processGroup.id}>${processGroup.description}</option>
            `
          )}
        </select>
      </div>

      <div
        id="main"
        @scroll=${e => {
          this.onScroll(e)
        }}
      >
        ${this.creatable
          ? html`
              <process-creation-card
                class="card create"
                .processGroups=${this.processGroups}
                .defaultGroup=${this.processGroup}
                @create-process=${e => this.onCreateProcess(e)}
              ></process-creation-card>
            `
          : html``}
        ${this.processes.map(
          process => html`
            <div class="card" @click=${e => this.onClickSelect(process)}>
              <img src=${process.thumbnail} />
              <div class="name">${process.name}</div>
              <div class="description">${process.description}</div>
            </div>
          `
        )}
      </div>
    `
  }

  get scrollTargetEl() {
    return this.renderRoot.querySelector('#main')
  }

  async scrollAction() {
    return this.appendProcesses()
  }

  firstUpdated() {
    this.refreshGroups()
  }

  updated(changed) {
    if (changed.has('processGroup')) {
      this.refreshProcesses()
    }
  }

  onClickSelect(process) {
    this.dispatchEvent(
      new CustomEvent('process-selected', {
        composed: true,
        bubbles: true,
        detail: {
          process
        }
      })
    )
  }

  async onCreateProcess(e) {
    var { name, description, processGroupId } = e.detail

    await this.createProcess(name, description, processGroupId)
    this.refreshProcesses()
  }

  async refreshGroups() {
    var processGroupListResponse = await client.query({
      query: FETCH_PROCESS_GROUP_LIST_GQL
    })

    if (!processGroupListResponse || !processGroupListResponse.data) return

    var processGroups = processGroupListResponse.data.processGroups.items
    this.processGroups = [...processGroups]

    this.processGroup =
      processGroups.filter(processGroup => processGroup.id == this.processGroup).length > 0 ? this.processGroup : ''
  }

  async refreshProcesses() {
    var processes = await this.getProcesses()
    this.processes = [...processes]

    var creationCard = this.shadowRoot.querySelector('process-creation-card')
    if (creationCard) {
      creationCard.reset()
    }
  }

  async appendProcesses() {
    var processes = await this.getProcesses({ page: this._page + 1 })
    this.processes = [...this.processes, ...processes]
  }

  async getProcesses({ page = 1, limit = this._infiniteScrollOptions.limit } = {}) {
    var filters = []
    var sortings = []
    var pagination = {
      limit,
      page
    }

    if (this.processGroup)
      filters.push({
        name: 'processGroup_id',
        operator: 'eq',
        value: this.processGroup
      })

    var params = {
      filters,
      sortings,
      pagination
    }
    var processListResponse = await client.query({
      query: FETCH_BOARD_LIST_GQL(params)
    })

    if (!processListResponse || !processListResponse.data) return []
    this._total = processListResponse.data.processes.total
    this._page = page

    return processListResponse.data.processes.items
  }

  async createProcess(name, description, processGroupId) {
    var model = JSON.stringify({
      width: 800,
      height: 600
    })

    const response = await client.mutate({
      mutation: CREATE_BOARD_GQL,
      variables: {
        process: {
          name,
          description,
          processGroupId,
          model
        }
      }
    })

    return response.data
  }
}

customElements.define('process-selector', ProcessSelector)
