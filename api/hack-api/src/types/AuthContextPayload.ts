type AuthContextPayload = [
  string | Record<string, unknown> | null,
  { type: SupportedAuthTypes } & AuthorizationHeader,
  { event: APIGatewayProxyEvent; context: GlobalContext & LambdaContext }
]

export default AuthContextPayload
