import type { Token } from 'src/types'

const appMetadata = (token: Token): any => {
  const claim = token.namespace
    ? `${token.namespace}/app_metadata`
    : 'app_metadata'
  return token.decoded?.[claim] || {}
}

const roles = (token: Token): any => {
  const metadata = appMetadata(token)
  return (
    token.decoded?.roles ||
    metadata?.roles ||
    metadata.authorization?.roles ||
    []
  )
}

export const parseJWT = (token: Token): any => {
  return {
    appMetadata: appMetadata(token),
    roles: roles(token),
  }
}
