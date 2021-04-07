import type { Config, CreateHandlerOptions } from 'apollo-server-lambda'

interface GraphQLHandlerOptions extends Config {
  /**
   * Modify the resolver and global context.
   */
  context?: Context | ContextFunction

  /**
   * An async function that maps the auth token retrieved from the request headers to an object.
   * Is it executed when the `auth-provider` contains one of the supported providers.
   */
  getCurrentUser?: GetCurrentUser

  /**
   * A callback when an unhandled exception occurs. Use this to disconnect your prisma instance.
   */
  onException?: () => void

  cors?: CreateHandlerOptions['cors']

  onHealthCheck?: CreateHandlerOptions['onHealthCheck']
}

export default GraphQLHandlerOptions
