import gql from 'graphql-tag'
import { client } from '@things-factory/shell'

export async function fetchProcessGroup(id) {
  const response = await client.query({
    query: gql`
      query FetchProcessGroupById($id: String!) {
        processGroup(id: $id) {
          id
          name
          description
          createdAt
          creator {
            id
            name
          }
          updatedAt
          updater {
            id
            name
          }
        }
      }
    `,
    variables: { id }
  })

  return response.data
}

export async function updateProcessGroup(processGroup) {
  var { id, name, description } = processGroup

  const response = await client.mutate({
    mutation: gql`
      mutation UpdateProcessGroup($id: String!, $patch: ProcessGroupPatch!) {
        updateProcessGroup(id: $id, patch: $patch) {
          id
          name
          description
          createdAt
          updatedAt
        }
      }
    `,
    variables: {
      id,
      patch: { name, description }
    }
  })

  return response.data
}

export async function deleteProcessGroup(id) {
  const response = await client.mutate({
    mutation: gql`
      mutation($id: String!) {
        deleteProcessGroup(id: $id) {
          id
        }
      }
    `,
    variables: {
      id
    }
  })

  return response.data
}

export async function fetchProcessGroupList() {
  const response = await client.query({
    query: gql`
      {
        processGroups {
          items {
            id
            name
            description
            createdAt
            updatedAt
          }
          total
        }
      }
    `
  })

  return response.data
}

export async function createProcessGroup(processGroup) {
  const response = await client.mutate({
    mutation: gql`
      mutation CreateProcessGroup($processGroup: NewProcessGroup!) {
        createProcessGroup(processGroup: $processGroup) {
          id
          name
          description
          createdAt
          updatedAt
        }
      }
    `,
    variables: { processGroup }
  })

  return response.data
}

export async function joinProcessGroup(processId, processGroupId) {
  const response = await client.mutate({
    mutation: gql`
      mutation JoinProcessGroup($id: String!, $processIds: [String]!) {
        joinProcessGroup(id: $id, processIds: $processIds) {
          id
          name
          description
          processes {
            id
            name
            description
            createdAt
            updatedAt
          }
          createdAt
          updatedAt
        }
      }
    `,
    variables: {
      id: processGroupId,
      processIds: [processId]
    }
  })

  return response.data
}
