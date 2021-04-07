type Token = {
  decoded: { [index: string]: Record<string, unknown> }
  namespace?: string
}

export default Token
