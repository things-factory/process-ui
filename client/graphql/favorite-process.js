import gql from 'graphql-tag'
import { client } from '@things-factory/shell'
import { gqlBuilder } from '@things-factory/utils'

export async function fetchFavoriteProcessList(listParam = {}) {
  const response = await client.query({
    query: gql`
      {
        favoriteProcesses(${gqlBuilder.buildArgs(listParam)}) {
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
