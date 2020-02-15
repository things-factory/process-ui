import gql from 'graphql-tag'
import { client } from '@things-factory/shell'
import { gqlBuilder } from '@things-factory/utils'

export async function fetchProcessList(listParam = {}) {
  const response = await client.query({
    query: gql`
      {
        processes(${gqlBuilder.buildArgs(listParam)}) {
          items {
            id
            name
            description
            thumbnail
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

export async function fetchProcess(id) {
  const response = await client.query({
    query: gql`
      query FetchProcessById($id: String!) {
        process(id: $id) {
          id
          name
          description
          group {
            id
            name
          }
          thumbnail
          model
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

export async function createProcess(process) {
  /*
    input NewProcess {
      name        : String!
      description : String
      model       : String!
      thumbnail   : String!
      groupId     : String!
    }
  */

  const response = await client.mutate({
    mutation: gql`
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
    `,
    variables: { process }
  })

  return response.data
}

export async function updateProcess(process) {
  /*
    input ProcessPatch {
      name        : String
      description : String
      model       : String
      thumbnail   : String
      groupId     : String
    }
  */
  var { id, name, description, model, groupId, thumbnail } = process

  const response = await client.mutate({
    mutation: gql`
      mutation UpdateProcess($id: String!, $patch: ProcessPatch!) {
        updateProcess(id: $id, patch: $patch) {
          id
          name
          description
          model
          group {
            id
            name
          }
          createdAt
          updatedAt
        }
      }
    `,
    variables: {
      id,
      patch: { name, description, model, groupId, thumbnail }
    }
  })

  return response.data
}

export async function deleteProcess(id) {
  const response = await client.mutate({
    mutation: gql`
      mutation($id: String!) {
        deleteProcess(id: $id) {
          id
        }
      }
    `,
    variables: { id }
  })

  return response.data
}
