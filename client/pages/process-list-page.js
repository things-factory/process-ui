import { openOverlay } from '@things-factory/layout-base'
import { InfiniteScrollable, navigate, PageView, store } from '@things-factory/shell'
import { pulltorefresh, swipe } from '@things-factory/utils'
import { ScrollbarStyles } from '@things-factory/styles'
import { css, html } from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin.js'
import '../process-list/process-tile-list'
import '../process-list/process-group-bar'
import {
  createProcess,
  createProcessGroup,
  deleteProcess,
  deleteProcessGroup,
  fetchProcessList,
  fetchFavoriteProcessList,
  fetchProcessGroupList,
  updateProcess,
  updateProcessGroup
} from '../graphql'

import '../viewparts/process-info'
import '../viewparts/process-group-info'

class ProcessListPage extends connect(store)(InfiniteScrollable(PageView)) {
  static get styles() {
    return [
      ScrollbarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          position: relative;

          overflow: hidden;
        }

        process-tile-list {
          flex: 1;
          overflow-y: auto;
        }

        #create {
          position: absolute;
          bottom: 15px;
          right: 16px;
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
      `
    ]
  }

  static get properties() {
    return {
      processGroupId: String,
      processGroups: Array,
      processes: Array,
      favorites: Array,
      _page: Number,
      _total: Number,
      _showSpinner: Boolean
    }
  }

  get context() {
    var group = this.processGroups?.find(group => group.id === this.processGroupId)

    return {
      title: group ? `Process List : ${group.name}` : 'Process List',
      process_topmenu: true
    }
  }

  constructor() {
    super()

    this._page = 1
    this._total = 0

    this._infiniteScrollOptions.limit = 30
  }

  render() {
    return html`
      <process-group-bar
        .processGroups=${this.processGroups}
        .processGroupId=${this.processGroupId}
        targetPage="process-list"
        @info-process-group=${e => this.onInfoProcessGroup(e.detail)}
      ></process-group-bar>

      <process-tile-list
        id="list"
        .processes=${this.processes}
        .favorites=${this.favorites}
        .processGroups=${this.processGroups}
        .processGroup=${this.processGroupId}
        .creatable=${true}
        @info-process=${e => this.onInfoProcess(e.detail)}
        @delete-process=${e => this.onDeleteProcess(e.detail)}
        @scroll=${e => {
          this.onScroll(e)
        }}
        @create-process=${e => this.onCreateProcess(e.detail)}
      ></process-tile-list>

      <oops-spinner ?show=${this._showSpinner}></oops-spinner>
    `
  }

  get scrollTargetEl() {
    return this.shadowRoot.querySelector('process-tile-list')
  }

  async refresh() {
    this.processGroups = (await fetchProcessGroupList()).processGroups.items

    if (this.processGroups) {
      await this.refreshProcesses()
    }
  }

  async getProcesses({ page = 1, limit = this._infiniteScrollOptions.limit } = {}) {
    if (this.processGroupId === 'favor') {
      return await this.getFavoriteProcesses({
        page,
        limit
      })
    }

    var listParam = {
      filters: this.processGroupId
        ? [
            {
              name: 'group_id',
              operator: 'eq',
              value: this.processGroupId
            }
          ]
        : [],
      sortings: [
        {
          name: 'name',
          desc: true
        }
      ],
      pagination: {
        page,
        limit
      }
    }

    return (await fetchProcessList(listParam)).processes
  }

  async getFavoriteProcesses({ page = 1, limit = this._infiniteScrollOptions.limit } = {}) {
    var listParam = {
      pagination: {
        page,
        limit
      }
    }

    return (await fetchFavoriteProcessList(listParam)).favoriteProcesses
  }

  async refreshProcesses() {
    if (!this.processGroups) {
      await this.refresh()
      return
    }

    this._showSpinner = true

    var { items: processes, total } = await this.getProcesses()
    this.processes = processes
    this._page = 1
    this._total = total

    this.updateContext()

    var list = this.shadowRoot.querySelector('process-tile-list')

    list.style.transition = ''
    list.style.transform = `translate3d(0, 0, 0)`

    this._showSpinner = false
  }

  async appendProcesses() {
    if (!this.processGroups) {
      await this.refresh()
      return
    }

    var { items: processes, total } = await this.getProcesses({ page: this._page + 1 })
    this.processes = [...this.processes, ...processes]
    this._page = this._page + 1
    this._total = total
  }

  async scrollAction() {
    return this.appendProcesses()
  }

  // updated(change) {
  //   if (change.has('processGroupId')) {
  //     this.refreshProcesses()
  //   }
  // }

  async pageInitialized() {
    this.refresh()
  }

  async pageUpdated(changes, lifecycle) {
    if (this.active) {
      this.page = lifecycle.page
      this.processGroupId = lifecycle.resourceId

      await this.updateComplete

      this.refreshProcesses()
    }
  }

  stateChanged(state) {
    this.favorites = state.favorite.favorites
  }

  firstUpdated() {
    var list = this.shadowRoot.querySelector('process-tile-list')

    pulltorefresh({
      container: this.shadowRoot,
      scrollable: list,
      refresh: () => {
        return this.refresh()
      }
    })

    swipe({
      container: this.shadowRoot,
      animates: {
        dragging: async (d, opts) => {
          var groups = [{ id: '' }, { id: 'favor' }, ...this.processGroups]
          var currentIndex = groups.findIndex(group => group.id == this.processGroupId)

          if ((d > 0 && currentIndex <= 0) || (d < 0 && currentIndex >= groups.length - 1)) {
            /* TODO blocked gesture */
            return false
          }

          list.style.transform = `translate3d(${d}px, 0, 0)`
        },
        aborting: async opts => {
          list.style.transition = 'transform 0.3s'
          list.style.transform = `translate3d(0, 0, 0)`

          setTimeout(() => {
            list.style.transition = ''
          })
        },
        swiping: async (d, opts) => {
          var groups = [{ id: '' }, { id: 'favor' }, ...this.processGroups]
          var currentIndex = groups.findIndex(group => group.id == this.processGroupId)

          if ((d > 0 && currentIndex <= 0) || (d < 0 && currentIndex >= groups.length - 1)) {
            list.style.transition = ''
            list.style.transform = `translate3d(0, 0, 0)`
          } else {
            list.style.transition = 'transform 0.3s'
            list.style.transform = `translate3d(${d < 0 ? '-100%' : '100%'}, 0, 0)`

            navigate(`${this.page}/${groups[currentIndex + (d < 0 ? 1 : -1)].id}`)
          }
        }
      }
    })
  }

  async onInfoProcess(processId) {
    openOverlay('viewpart-info', {
      template: html`
        <process-info
          .processId=${processId}
          .processGroupId=${this.processGroupId}
          @update-process=${e => this.onUpdateProcess(e.detail)}
          @delete-process=${e => this.onDeleteProcess(e.detail)}
        ></process-info>
      `
    })
  }

  async onInfoProcessGroup(processGroupId) {
    openOverlay('viewpart-info', {
      template: html`
        <process-group-info
          .processGroupId=${processGroupId}
          @update-process-group=${e => this.onUpdateProcessGroup(e.detail)}
          @delete-process-group=${e => this.onDeleteProcessGroup(e.detail)}
          @create-process-group=${e => this.onCreateProcessGroup(e.detail)}
        ></process-group-info>
      `
    })
  }

  async onCreateProcessGroup(processGroup) {
    try {
      await createProcessGroup(processGroup)
      this._notify('info', 'new process group created')
    } catch (ex) {
      this._notify('error', ex, ex)
    }

    this.refresh()
  }

  async onUpdateProcessGroup(processGroup) {
    try {
      await updateProcessGroup(processGroup)
      this._notify('info', 'saved')
    } catch (ex) {
      this._notify('error', ex, ex)
    }

    this.refresh()
  }

  async onDeleteProcessGroup(processGroupId) {
    try {
      await deleteProcessGroup(processGroupId)
      this._notify('info', 'deleted')
    } catch (ex) {
      this._notify('error', ex, ex)
    }

    this.refresh()
  }

  async onCreateProcess(process) {
    try {
      if (!process.model) {
        process.model = {}
      }

      await createProcess(process)

      this._notify('info', 'new process created')
    } catch (ex) {
      this._notify('error', ex, ex)
    }

    this.refreshProcesses()
  }

  async onUpdateProcess(process) {
    try {
      await updateProcess(process)
      this._notify('info', 'saved')
    } catch (ex) {
      this._notify('error', ex, ex)
    }

    this.refreshProcesses()
  }

  async onDeleteProcess(processId) {
    try {
      await deleteProcess(processId)
      this._notify('info', 'deleted')
    } catch (ex) {
      this._notify('error', ex, ex)
    }

    this.refreshProcesses()
  }

  _notify(level, message, ex) {
    document.dispatchEvent(
      new CustomEvent('notify', {
        detail: {
          level,
          message,
          ex
        }
      })
    )
  }
}

window.customElements.define('process-list-page', ProcessListPage)
